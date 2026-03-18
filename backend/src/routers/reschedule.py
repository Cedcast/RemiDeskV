"""Public reschedule portal — no authentication required, token-based access."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Appointment, AppointmentStatus
from ..schemas import ReschedulePublicResponse, RescheduleRequest, AppointmentResponse
from ..notifications import email_service, sms_service, whatsapp_service, build_reschedule_url

import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reschedule", tags=["Reschedule Portal"])


def _get_appointment_by_token(token: str, db: Session) -> Appointment:
    """Look up a confirmed appointment by its reschedule token."""
    appointment = (
        db.query(Appointment)
        .filter(Appointment.reschedule_token == token)
        .first()
    )
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reschedule link is invalid or has expired.",
        )
    if appointment.status not in (AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This appointment cannot be rescheduled (status: {appointment.status}).",
        )
    return appointment


@router.get("/{token}", response_model=ReschedulePublicResponse)
def get_reschedule_info(token: str, db: Session = Depends(get_db)):
    """
    Public endpoint — return appointment details for the reschedule portal.
    The reschedule token is embedded in reminder notification links.
    """
    appointment = _get_appointment_by_token(token, db)

    service_name = appointment.service_name or (
        appointment.service.name if appointment.service else None
    )
    client_name = appointment.client.name if appointment.client else None

    return ReschedulePublicResponse(
        id=appointment.id,
        business_name=appointment.business.name,
        service_name=service_name,
        client_name=client_name,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        status=appointment.status,
    )


@router.post("/{token}", response_model=AppointmentResponse)
async def submit_reschedule(
    token: str,
    reschedule_data: RescheduleRequest,
    db: Session = Depends(get_db),
):
    """
    Public endpoint — accept a client's reschedule request.
    Updates the appointment times and marks status as *rescheduled*.
    Sends confirmation notifications on all enabled channels.
    """
    appointment = _get_appointment_by_token(token, db)

    # Apply new times and update status
    appointment.start_time = reschedule_data.new_start_time
    appointment.end_time = reschedule_data.new_end_time
    appointment.status = AppointmentStatus.RESCHEDULED
    appointment.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(appointment)

    # Send rescheduled confirmation notifications
    await _send_reschedule_notifications(appointment, db)

    return appointment


async def _send_reschedule_notifications(appointment: Appointment, db: Session) -> None:
    """Send rescheduled-appointment notifications to the client."""
    try:
        channels = json.loads(appointment.notification_channels or "{}")
    except (json.JSONDecodeError, TypeError):
        channels = {}

    client = appointment.client
    if not client:
        return

    business = appointment.business
    service_name = appointment.service_name or (
        appointment.service.name if appointment.service else "Appointment"
    )
    new_time = appointment.start_time.strftime("%A %d %B %Y at %H:%M")
    reschedule_url = (
        build_reschedule_url(appointment.reschedule_token)
        if appointment.reschedule_token
        else None
    )

    if channels.get("email") and client.email:
        try:
            await email_service.send_appointment_confirmation(
                client.email,
                client.name,
                business.name,
                service_name,
                new_time,
                reschedule_url,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send reschedule email: %s", exc)

    if channels.get("sms") and client.phone:
        try:
            await sms_service.send_appointment_confirmation(
                client.phone,
                business.name,
                service_name,
                new_time,
                reschedule_url,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send reschedule SMS: %s", exc)

    if channels.get("whatsapp") and client.phone:
        try:
            await whatsapp_service.send_appointment_confirmation(
                client.phone,
                client.name,
                business.name,
                service_name,
                new_time,
                reschedule_url,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send reschedule WhatsApp: %s", exc)
