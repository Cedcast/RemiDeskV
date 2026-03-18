"""Background scheduler for appointment reminder notifications."""
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Appointment, AppointmentStatus, NotificationLog
from .notifications import email_service, sms_service, whatsapp_service, build_reschedule_url

logger = logging.getLogger(__name__)

# APScheduler instance (AsyncIO-compatible)
scheduler = AsyncIOScheduler()


async def _send_reminder(appointment: Appointment, hours_before: int, db: Session) -> None:
    """Send reminder notifications for a single appointment."""
    import json

    client = appointment.client
    if not client:
        return

    business = appointment.business
    service_name = appointment.service_name or (
        appointment.service.name if appointment.service else "Appointment"
    )
    appointment_time = appointment.start_time.strftime("%A %d %B %Y at %H:%M")
    reschedule_url = (
        build_reschedule_url(appointment.reschedule_token)
        if appointment.reschedule_token
        else None
    )
    notification_type = f"reminder_{hours_before}h"

    try:
        channels = json.loads(appointment.notification_channels or "{}")
    except (json.JSONDecodeError, TypeError):
        channels = {}

    async def _log(channel: str, recipient: str, success: bool) -> None:
        log = NotificationLog(
            appointment_id=appointment.id,
            channel=channel,
            notification_type=notification_type,
            recipient=recipient,
            message=f"{notification_type} {channel}",
            status="sent" if success else "failed",
            sent_at=datetime.now(timezone.utc) if success else None,
        )
        db.add(log)
        db.commit()

    if channels.get("email") and client.email:
        ok = await email_service.send_appointment_reminder(
            client.email,
            client.name,
            business.name,
            service_name,
            appointment_time,
            hours_before,
            reschedule_url,
        )
        await _log("email", client.email, ok)

    if channels.get("sms") and client.phone:
        ok = await sms_service.send_appointment_reminder(
            client.phone,
            business.name,
            service_name,
            appointment_time,
            hours_before,
            reschedule_url,
        )
        await _log("sms", client.phone, ok)

    if channels.get("whatsapp") and client.phone:
        ok = await whatsapp_service.send_appointment_reminder(
            client.phone,
            client.name,
            business.name,
            service_name,
            appointment_time,
            hours_before,
            reschedule_url,
        )
        await _log("whatsapp", client.phone, ok)


def _already_sent(appointment_id: int, notification_type: str, db: Session) -> bool:
    """Return True if we already sent this notification type for this appointment."""
    existing = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.appointment_id == appointment_id,
            NotificationLog.notification_type == notification_type,
            NotificationLog.status == "sent",
        )
        .first()
    )
    return existing is not None


async def send_appointment_reminders() -> None:
    """
    Scheduled job: runs every 15 minutes.
    Finds appointments starting in ~24 h or ~2 h and sends reminder notifications.
    A ±5-minute window is used around each target time to avoid missed / duplicate sends.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        for hours_before in (24, 2):
            target = now + timedelta(hours=hours_before)
            window_start = target - timedelta(minutes=5)
            window_end = target + timedelta(minutes=5)

            appointments = (
                db.query(Appointment)
                .filter(
                    Appointment.start_time >= window_start,
                    Appointment.start_time <= window_end,
                    Appointment.status == AppointmentStatus.CONFIRMED,
                )
                .all()
            )

            notification_type = f"reminder_{hours_before}h"
            for appt in appointments:
                if _already_sent(appt.id, notification_type, db):
                    continue
                try:
                    await _send_reminder(appt, hours_before, db)
                    logger.info(
                        "Sent %s reminder for appointment #%d", notification_type, appt.id
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.error(
                        "Error sending %s reminder for appointment #%d: %s",
                        notification_type,
                        appt.id,
                        exc,
                    )
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler."""
    scheduler.add_job(
        send_appointment_reminders,
        trigger=IntervalTrigger(minutes=15),
        id="appointment_reminders",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Appointment reminder scheduler started (runs every 15 minutes).")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Appointment reminder scheduler stopped.")
