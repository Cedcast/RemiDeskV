"""Appointment routes."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Service, Appointment, UserRole, AppointmentStatus, Schedule
from ..schemas import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AppointmentStatusUpdate, AppointmentListResponse, AppointmentDetailResponse,
    DashboardStats
)
from ..auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def check_slot_availability(
    db: Session,
    business_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_appointment_id: Optional[int] = None
) -> bool:
    """Check if a time slot is available."""
    query = db.query(Appointment).filter(
        Appointment.business_id == business_id,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
        # Check for overlapping appointments
        Appointment.start_time < end_time,
        Appointment.end_time > start_time
    )
    
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    
    return query.first() is None


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment."""
    # Verify business exists
    business = db.query(Business).filter(Business.id == appointment_data.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    # Verify service exists
    service = db.query(Service).filter(
        Service.id == appointment_data.service_id,
        Service.business_id == appointment_data.business_id,
        Service.is_active == True
    ).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Calculate end time based on service duration
    end_time = appointment_data.start_time + timedelta(minutes=service.duration_minutes)
    
    # Check business hours
    day_of_week = appointment_data.start_time.weekday()
    schedule = db.query(Schedule).filter(
        Schedule.business_id == appointment_data.business_id,
        Schedule.day_of_week == day_of_week,
        Schedule.is_available == True
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business is not available on this day"
        )
    
    # Check if the appointment is within business hours
    appt_start_time = appointment_data.start_time.time()
    appt_end_time = end_time.time()
    
    if appt_start_time < schedule.start_time or appt_end_time > schedule.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment time is outside business hours"
        )
    
    # Check slot availability
    if not check_slot_availability(db, appointment_data.business_id, appointment_data.start_time, end_time):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked"
        )
    
    new_appointment = Appointment(
        business_id=appointment_data.business_id,
        customer_id=current_user.id,
        service_id=appointment_data.service_id,
        start_time=appointment_data.start_time,
        end_time=end_time,
        customer_notes=appointment_data.customer_notes,
        status=AppointmentStatus.PENDING
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment


@router.get("/", response_model=AppointmentListResponse)
async def list_appointments(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    business_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List appointments for the current user."""
    if current_user.role == UserRole.BUSINESS_OWNER:
        # Business owners see appointments for their businesses
        owned_business_ids = [b.id for b in db.query(Business).filter(
            Business.owner_id == current_user.id
        ).all()]
        
        if business_id and business_id in owned_business_ids:
            query = db.query(Appointment).filter(Appointment.business_id == business_id)
        else:
            query = db.query(Appointment).filter(Appointment.business_id.in_(owned_business_ids))
    else:
        # Customers see their own appointments
        query = db.query(Appointment).filter(Appointment.customer_id == current_user.id)
    
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    
    total = query.count()
    offset = (page - 1) * size
    appointments = query.order_by(Appointment.start_time.desc()).offset(offset).limit(size).all()
    
    return AppointmentListResponse(
        appointments=appointments,
        total=total,
        page=page,
        size=size
    )


@router.get("/upcoming", response_model=List[AppointmentResponse])
async def get_upcoming_appointments(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming appointments for the current user."""
    now = datetime.utcnow()
    
    if current_user.role == UserRole.BUSINESS_OWNER:
        owned_business_ids = [b.id for b in db.query(Business).filter(
            Business.owner_id == current_user.id
        ).all()]
        
        appointments = db.query(Appointment).filter(
            Appointment.business_id.in_(owned_business_ids),
            Appointment.start_time > now,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
        ).order_by(Appointment.start_time).limit(limit).all()
    else:
        appointments = db.query(Appointment).filter(
            Appointment.customer_id == current_user.id,
            Appointment.start_time > now,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
        ).order_by(Appointment.start_time).limit(limit).all()
    
    return appointments


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    business_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for business owner."""
    if current_user.role != UserRole.BUSINESS_OWNER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only business owners can access dashboard stats"
        )
    
    # Get business IDs
    if business_id:
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business or (business.owner_id != current_user.id and current_user.role != UserRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this business's stats"
            )
        business_ids = [business_id]
    else:
        business_ids = [b.id for b in db.query(Business).filter(
            Business.owner_id == current_user.id
        ).all()]
    
    now = datetime.utcnow()
    
    # Get statistics
    total_appointments = db.query(Appointment).filter(
        Appointment.business_id.in_(business_ids)
    ).count()
    
    upcoming_appointments = db.query(Appointment).filter(
        Appointment.business_id.in_(business_ids),
        Appointment.start_time > now,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).count()
    
    completed_appointments = db.query(Appointment).filter(
        Appointment.business_id.in_(business_ids),
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    cancelled_appointments = db.query(Appointment).filter(
        Appointment.business_id.in_(business_ids),
        Appointment.status == AppointmentStatus.CANCELLED
    ).count()
    
    # Calculate revenue from completed appointments
    completed_appts = db.query(Appointment).filter(
        Appointment.business_id.in_(business_ids),
        Appointment.status == AppointmentStatus.COMPLETED
    ).all()
    
    total_revenue = sum(
        db.query(Service).filter(Service.id == appt.service_id).first().price
        for appt in completed_appts
        if db.query(Service).filter(Service.id == appt.service_id).first()
    )
    
    # Count unique customers
    total_customers = db.query(Appointment.customer_id).filter(
        Appointment.business_id.in_(business_ids)
    ).distinct().count()
    
    return DashboardStats(
        total_appointments=total_appointments,
        upcoming_appointments=upcoming_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        total_revenue=total_revenue,
        total_customers=total_customers
    )


@router.get("/{appointment_id}", response_model=AppointmentDetailResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get appointment details."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check authorization
    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    is_owner = business and business.owner_id == current_user.id
    is_customer = appointment.customer_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    
    if not (is_owner or is_customer or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this appointment"
        )
    
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an appointment."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check authorization
    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    is_owner = business and business.owner_id == current_user.id
    is_customer = appointment.customer_id == current_user.id
    
    if not (is_owner or is_customer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this appointment"
        )
    
    # If updating start_time, recalculate end_time and check availability
    if appointment_update.start_time:
        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        new_end_time = appointment_update.start_time + timedelta(minutes=service.duration_minutes)
        
        if not check_slot_availability(
            db, 
            appointment.business_id, 
            appointment_update.start_time, 
            new_end_time,
            exclude_appointment_id=appointment_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot is already booked"
            )
        
        appointment.end_time = new_end_time
    
    update_data = appointment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    return appointment


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update appointment status."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check authorization
    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    is_owner = business and business.owner_id == current_user.id
    is_customer = appointment.customer_id == current_user.id
    
    # Customers can only cancel
    if is_customer and not is_owner:
        if status_update.status != AppointmentStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers can only cancel appointments"
            )
    elif not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this appointment"
        )
    
    appointment.status = status_update.status
    if status_update.cancellation_reason:
        appointment.cancellation_reason = status_update.cancellation_reason
    
    db.commit()
    db.refresh(appointment)
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an appointment."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check authorization
    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    is_owner = business and business.owner_id == current_user.id
    is_customer = appointment.customer_id == current_user.id
    
    if not (is_owner or is_customer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this appointment"
        )
    
    appointment.status = AppointmentStatus.CANCELLED
    db.commit()
