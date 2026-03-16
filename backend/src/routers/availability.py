"""Schedule/Availability routes."""
from typing import List
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Service, Schedule, Appointment, UserRole, AppointmentStatus
from ..schemas import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    TimeSlot, AvailableSlotsResponse
)
from ..auth import get_current_user

router = APIRouter(prefix="/availability", tags=["Availability"])


@router.post("/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new schedule entry for a business."""
    business = db.query(Business).filter(Business.id == schedule_data.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this business's schedule"
        )
    
    # Check if schedule already exists for this day
    existing = db.query(Schedule).filter(
        Schedule.business_id == schedule_data.business_id,
        Schedule.day_of_week == schedule_data.day_of_week
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schedule already exists for day {schedule_data.day_of_week}. Use PUT to update."
        )
    
    new_schedule = Schedule(**schedule_data.dict())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    return new_schedule


@router.get("/schedules/{business_id}", response_model=List[ScheduleResponse])
async def get_business_schedules(business_id: int, db: Session = Depends(get_db)):
    """Get all schedules for a business."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    schedules = db.query(Schedule).filter(
        Schedule.business_id == business_id
    ).order_by(Schedule.day_of_week).all()
    
    return schedules


@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a schedule entry."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    business = db.query(Business).filter(Business.id == schedule.business_id).first()
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this schedule"
        )
    
    update_data = schedule_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    
    db.commit()
    db.refresh(schedule)
    
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a schedule entry."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    business = db.query(Business).filter(Business.id == schedule.business_id).first()
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this schedule"
        )
    
    db.delete(schedule)
    db.commit()


@router.get("/slots/{business_id}", response_model=AvailableSlotsResponse)
async def get_available_slots(
    business_id: int,
    service_id: int,
    date_str: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get available time slots for a business on a specific date."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.business_id == business_id
    ).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Parse the date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Get the day of week (0=Monday, 6=Sunday)
    day_of_week = target_date.weekday()
    
    # Get the schedule for this day
    schedule = db.query(Schedule).filter(
        Schedule.business_id == business_id,
        Schedule.day_of_week == day_of_week,
        Schedule.is_available == True
    ).first()
    
    if not schedule:
        return AvailableSlotsResponse(date=date_str, slots=[])
    
    # Generate time slots based on service duration
    slots = []
    duration = timedelta(minutes=service.duration_minutes)
    
    start_datetime = datetime.combine(target_date, schedule.start_time)
    end_datetime = datetime.combine(target_date, schedule.end_time)
    
    current_slot_start = start_datetime
    
    # Get existing appointments for this date
    existing_appointments = db.query(Appointment).filter(
        Appointment.business_id == business_id,
        Appointment.start_time >= start_datetime,
        Appointment.end_time <= end_datetime,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).all()
    
    # Create a list of booked time ranges
    booked_ranges = [(appt.start_time, appt.end_time) for appt in existing_appointments]
    
    while current_slot_start + duration <= end_datetime:
        slot_end = current_slot_start + duration
        
        # Check if this slot overlaps with any existing appointment
        is_available = True
        for booked_start, booked_end in booked_ranges:
            if not (slot_end <= booked_start or current_slot_start >= booked_end):
                is_available = False
                break
        
        if is_available:
            slots.append(TimeSlot(start_time=current_slot_start, end_time=slot_end))
        
        # Move to next slot (30-minute intervals)
        current_slot_start += timedelta(minutes=30)
    
    return AvailableSlotsResponse(date=date_str, slots=slots)
