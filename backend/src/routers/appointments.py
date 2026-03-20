"""Appointment routes — business owner only."""
import json
import secrets
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Service, Appointment, Client, UserRole, AppointmentStatus, NotificationLog
from ..schemas import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AppointmentStatusUpdate, AppointmentListResponse, AppointmentDetailResponse,
    AppointmentNotificationSummary, NotificationStepSummary,
)
from ..auth import get_current_user
from ..notifications import email_service, sms_service, whatsapp_service, build_reschedule_url

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _require_business_owner(current_user: User) -> User:
    """Raise 403 if caller is not a business owner or admin."""
    if current_user.role not in (UserRole.BUSINESS_OWNER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only business owners can access this resource",
        )
    return current_user


def _get_owned_business(db: Session, business_id: int, owner_id: int) -> Business:
    """Return the business if it exists and belongs to owner, else raise 403/404."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if business.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return business


def _build_notification_summary(appointment: Appointment) -> Optional[AppointmentNotificationSummary]:
    """Aggregate NotificationLog entries into a compact per-step summary.

    Only "sent" notifications are counted. For each notification_type we
    track whether anything was sent, the latest sent_at timestamp, and the
    distinct channels used.
    """
    if not appointment.notification_logs:
        return None

    steps = {
        "confirmation": NotificationStepSummary(),
        "reminder_24h": NotificationStepSummary(),
        "reminder_2h": NotificationStepSummary(),
        "followup": NotificationStepSummary(),
    }

    for log in appointment.notification_logs:
        if log.status != "sent":
            continue
        step = steps.get(log.notification_type)
        if not step:
            continue

        step.sent = True
        if log.sent_at:
            if not step.sent_at or log.sent_at > step.sent_at:
                step.sent_at = log.sent_at
        if log.channel and log.channel not in step.channels:
            step.channels.append(log.channel)

    return AppointmentNotificationSummary(
        confirmation=steps["confirmation"],
        reminder_24h=steps["reminder_24h"],
        reminder_2h=steps["reminder_2h"],
        followup=steps["followup"],
    )


def _ai_messages_enabled_for_user(current_user: User) -> bool:
    """Return True if the current user's subscription has AI notifications enabled."""
    subscription = getattr(current_user, "subscription", None)
    if not subscription:
        return False
    return bool(getattr(subscription, "ai_notifications_enabled", False))


async def _send_notifications(appointment: Appointment, notification_type: str, db: Session):
    """Send notifications on all enabled channels for an appointment."""
    if not appointment.notification_channels:
        return

    try:
        channels = json.loads(appointment.notification_channels)
    except (json.JSONDecodeError, TypeError):
        return

    client = appointment.client
    if not client:
        return

    business = appointment.business
    service_name = appointment.service_name or (
        appointment.service.name if appointment.service else "Appointment"
    )
    appointment_time = appointment.start_time.strftime("%A %d %B %Y at %H:%M")
    reschedule_url = build_reschedule_url(appointment.reschedule_token) if appointment.reschedule_token else None

    async def _log(channel: str, recipient: str, success: bool, message: str):
        log = NotificationLog(
            appointment_id=appointment.id,
            channel=channel,
            notification_type=notification_type,
            recipient=recipient,
            message=message,
            status="sent" if success else "failed",
            sent_at=datetime.now(timezone.utc) if success else None,
        )
        db.add(log)
        db.commit()

    # Email
    if channels.get("email") and client.email:
        if notification_type == "confirmation":
            ok = await email_service.send_appointment_confirmation(
                client.email, client.name, business.name, service_name,
                appointment_time, reschedule_url,
            )
        elif notification_type in ("reminder_24h", "reminder_2h"):
            hours = 24 if notification_type == "reminder_24h" else 2
            ok = await email_service.send_appointment_reminder(
                client.email, client.name, business.name, service_name,
                appointment_time, hours, reschedule_url,
            )
        else:  # followup
            ok = await email_service.send_appointment_followup(
                client.email, client.name, business.name, service_name, appointment_time,
            )
        await _log("email", client.email, ok, f"{notification_type} email")

    # SMS
    if channels.get("sms") and client.phone:
        if notification_type == "confirmation":
            ok = await sms_service.send_appointment_confirmation(
                client.phone, business.name, service_name, appointment_time, reschedule_url,
            )
        elif notification_type in ("reminder_24h", "reminder_2h"):
            hours = 24 if notification_type == "reminder_24h" else 2
            ok = await sms_service.send_appointment_reminder(
                client.phone, business.name, service_name, appointment_time, hours, reschedule_url,
            )
        else:
            ok = await sms_service.send_appointment_followup(client.phone, business.name, service_name)
        await _log("sms", client.phone, ok, f"{notification_type} sms")

    # WhatsApp
    if channels.get("whatsapp") and client.phone:
        if notification_type == "confirmation":
            ok = await whatsapp_service.send_appointment_confirmation(
                client.phone, client.name, business.name, service_name,
                appointment_time, reschedule_url,
            )
        elif notification_type in ("reminder_24h", "reminder_2h"):
            hours = 24 if notification_type == "reminder_24h" else 2
            ok = await whatsapp_service.send_appointment_reminder(
                client.phone, client.name, business.name, service_name,
                appointment_time, hours, reschedule_url,
            )
        else:
            ok = await whatsapp_service.send_appointment_followup(
                client.phone, client.name, business.name, service_name,
            )
        await _log("whatsapp", client.phone, ok, f"{notification_type} whatsapp")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new appointment (business owner only)."""
    _require_business_owner(current_user)
    business = _get_owned_business(db, appointment_data.business_id, current_user.id)

    # Resolve or create client
    client: Optional[Client] = None
    if appointment_data.client_id:
        client = db.query(Client).filter(
            Client.id == appointment_data.client_id,
            Client.business_id == business.id,
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    elif appointment_data.client_name:
        # Try to find existing client by email
        if appointment_data.client_email:
            client = db.query(Client).filter(
                Client.business_id == business.id,
                Client.email == appointment_data.client_email,
            ).first()
        if not client:
            client = Client(
                business_id=business.id,
                name=appointment_data.client_name,
                email=appointment_data.client_email,
                phone=appointment_data.client_phone,
            )
            db.add(client)
            db.flush()

    # Resolve service name
    service_name = appointment_data.service_name
    service_id = appointment_data.service_id
    if service_id:
        svc = db.query(Service).filter(
            Service.id == service_id,
            Service.business_id == business.id,
        ).first()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        if not service_name:
            service_name = svc.name

    channels_json = appointment_data.notification_channels.json()

    new_appointment = Appointment(
        business_id=business.id,
        client_id=client.id if client else None,
        service_id=service_id,
        service_name=service_name,
        start_time=appointment_data.start_time,
        end_time=appointment_data.end_time,
        notes=appointment_data.notes,
        status=AppointmentStatus.CONFIRMED,
        notification_channels=channels_json,
        reschedule_token=secrets.token_urlsafe(32),
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # Send confirmation notifications
    await _send_notifications(new_appointment, "confirmation", db)

    return new_appointment


@router.get("/", response_model=AppointmentListResponse)
async def list_appointments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    # Quick date filter: today | next_7_days | this_month
    range_key: Optional[str] = Query(
        None,
        regex="^(today|next_7_days|this_month)$",
        description="Quick date range filter for appointments",
    ),
    business_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List appointments for the current business owner."""
    _require_business_owner(current_user)

    owned_business_ids = [
        b.id for b in db.query(Business).filter(Business.owner_id == current_user.id).all()
    ]

    if business_id:
        if business_id not in owned_business_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
        query = db.query(Appointment).filter(Appointment.business_id == business_id)
    else:
        query = db.query(Appointment).filter(Appointment.business_id.in_(owned_business_ids))

    if status_filter:
        query = query.filter(Appointment.status == status_filter)

    # Apply date range filters on start_time
    if range_key:
        now = datetime.now(timezone.utc)
        if range_key == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
        elif range_key == "next_7_days":
            start = now
            end = now + timedelta(days=7)
        else:  # this_month
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)

        query = query.filter(Appointment.start_time >= start, Appointment.start_time < end)

    total = query.count()
    offset = (page - 1) * size
    appointments = query.order_by(Appointment.start_time.desc()).offset(offset).limit(size).all()

    # Enrich each appointment with notification summary and AI flag
    ai_enabled = _ai_messages_enabled_for_user(current_user)
    for apt in appointments:
        apt.notification_summary = _build_notification_summary(apt)
        apt.ai_messages_enabled = ai_enabled

    return AppointmentListResponse(appointments=appointments, total=total, page=page, size=size)


@router.get("/upcoming", response_model=List[AppointmentResponse])
async def get_upcoming_appointments(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get upcoming appointments for the business owner."""
    _require_business_owner(current_user)
    now = datetime.now(timezone.utc)

    owned_business_ids = [
        b.id for b in db.query(Business).filter(Business.owner_id == current_user.id).all()
    ]

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.business_id.in_(owned_business_ids),
            Appointment.start_time > now,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
        )
        .order_by(Appointment.start_time)
        .limit(limit)
        .all()
    )

    ai_enabled = _ai_messages_enabled_for_user(current_user)
    for apt in appointments:
        apt.notification_summary = _build_notification_summary(apt)
        apt.ai_messages_enabled = ai_enabled

    return appointments


@router.get("/{appointment_id}", response_model=AppointmentDetailResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get appointment details."""
    _require_business_owner(current_user)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    if not business or (business.owner_id != current_user.id and current_user.role != UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not authorized")

    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an appointment."""
    _require_business_owner(current_user)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = appointment_update.dict(exclude_unset=True)
    if "notification_channels" in update_data and update_data["notification_channels"]:
        channels = update_data.pop("notification_channels")
        appointment.notification_channels = json.dumps(channels)

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
    db: Session = Depends(get_db),
):
    """Update appointment status."""
    _require_business_owner(current_user)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    appointment.status = status_update.status
    if status_update.cancellation_reason:
        appointment.cancellation_reason = status_update.cancellation_reason

    db.commit()
    db.refresh(appointment)

    # Send follow-up on completion
    if status_update.status == AppointmentStatus.COMPLETED:
        await _send_notifications(appointment, "followup", db)

    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an appointment."""
    _require_business_owner(current_user)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    business = db.query(Business).filter(Business.id == appointment.business_id).first()
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    appointment.status = AppointmentStatus.CANCELLED
    db.commit()
