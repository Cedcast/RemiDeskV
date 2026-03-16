"""Multi-channel notification services: Email (SendGrid), SMS & WhatsApp (Twilio)."""
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)


def build_reschedule_url(reschedule_token: str) -> str:
    """Build the reschedule URL that is included in client notifications."""
    base = settings.app_base_url.rstrip("/")
    return f"{base}/reschedule/{reschedule_token}"


class EmailService:
    """Email notification service using SendGrid."""

    def __init__(self):
        self.api_key = settings.sendgrid_api_key
        self.from_email = settings.from_email
        self.is_configured = bool(self.api_key)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        html_content: Optional[str] = None,
    ) -> bool:
        """Send an email using SendGrid."""
        if not self.is_configured:
            logger.warning("SendGrid not configured. Email not sent to %s.", to_email)
            return False

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content

            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                plain_text_content=Content("text/plain", content),
            )
            if html_content:
                message.add_content(Content("text/html", html_content))

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            logger.info("Email sent to %s. Status: %s", to_email, response.status_code)
            return response.status_code in [200, 201, 202]
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_email, exc)
            return False

    async def send_appointment_confirmation(
        self,
        to_email: str,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment confirmation email."""
        subject = f"Appointment Confirmed – {business_name}"
        reschedule_line = (
            f"\nNeed to reschedule? Click here: {reschedule_url}\n"
            if reschedule_url
            else ""
        )
        content = (
            f"Hello {client_name},\n\n"
            f"Your appointment has been confirmed!\n\n"
            f"Details:\n"
            f"  Business : {business_name}\n"
            f"  Service  : {service_name}\n"
            f"  Time     : {appointment_time}\n"
            f"{reschedule_line}\n"
            f"Thank you!\n{business_name}"
        )
        html_reschedule = (
            f'<p><a href="{reschedule_url}">Need to reschedule? Click here</a></p>'
            if reschedule_url
            else ""
        )
        html_content = (
            f"<html><body>"
            f"<h2>Appointment Confirmed!</h2>"
            f"<p>Hello {client_name},</p>"
            f"<h3>Details:</h3>"
            f"<ul>"
            f"<li><strong>Business:</strong> {business_name}</li>"
            f"<li><strong>Service:</strong> {service_name}</li>"
            f"<li><strong>Time:</strong> {appointment_time}</li>"
            f"</ul>"
            f"{html_reschedule}"
            f"<p>Thank you!</p>"
            f"</body></html>"
        )
        return await self.send_email(to_email, subject, content, html_content)

    async def send_appointment_reminder(
        self,
        to_email: str,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int = 24,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment reminder email (24h or 1h before)."""
        subject = f"Reminder: Your appointment in {hours_before}h – {business_name}"
        reschedule_line = (
            f"\nNeed to reschedule? {reschedule_url}\n" if reschedule_url else ""
        )
        content = (
            f"Hello {client_name},\n\n"
            f"This is a reminder: you have an appointment in {hours_before} hour(s).\n\n"
            f"Details:\n"
            f"  Business : {business_name}\n"
            f"  Service  : {service_name}\n"
            f"  Time     : {appointment_time}\n"
            f"{reschedule_line}\n"
            f"See you soon!\n{business_name}"
        )
        return await self.send_email(to_email, subject, content)

    async def send_appointment_followup(
        self,
        to_email: str,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
    ) -> bool:
        """Send post-appointment follow-up email."""
        subject = f"Thank you for your visit – {business_name}"
        content = (
            f"Hello {client_name},\n\n"
            f"Thank you for your appointment at {business_name}!\n\n"
            f"Service  : {service_name}\n"
            f"Date/Time: {appointment_time}\n\n"
            f"We hope to see you again soon.\n{business_name}"
        )
        return await self.send_email(to_email, subject, content)


class SMSService:
    """SMS notification service using Twilio."""

    def __init__(self):
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.phone_number = settings.twilio_phone_number
        self.is_configured = bool(
            self.account_sid and self.auth_token and self.phone_number
        )

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send an SMS using Twilio."""
        if not self.is_configured:
            logger.warning("Twilio SMS not configured. SMS not sent to %s.", to_phone)
            return False

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            msg = client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone,
            )
            logger.info("SMS sent to %s. SID: %s", to_phone, msg.sid)
            return True
        except Exception as exc:
            logger.error("Failed to send SMS to %s: %s", to_phone, exc)
            return False

    async def send_appointment_confirmation(
        self,
        to_phone: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment confirmation SMS."""
        body = (
            f"Confirmed: {service_name} at {business_name} on {appointment_time}."
        )
        if reschedule_url:
            body += f" Reschedule: {reschedule_url}"
        return await self.send_sms(to_phone, body)

    async def send_appointment_reminder(
        self,
        to_phone: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int = 24,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment reminder SMS."""
        body = (
            f"Reminder ({hours_before}h): {service_name} at {business_name} on {appointment_time}."
        )
        if reschedule_url:
            body += f" Reschedule: {reschedule_url}"
        return await self.send_sms(to_phone, body)

    async def send_appointment_followup(
        self,
        to_phone: str,
        business_name: str,
        service_name: str,
    ) -> bool:
        """Send post-appointment follow-up SMS."""
        body = f"Thank you for visiting {business_name} for {service_name}! We hope to see you again."
        return await self.send_sms(to_phone, body)


class WhatsAppService:
    """WhatsApp notification service using Twilio WhatsApp API."""

    def __init__(self):
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.whatsapp_number = settings.twilio_whatsapp_number  # e.g. "whatsapp:+14155238886"
        self.is_configured = bool(
            self.account_sid and self.auth_token and self.whatsapp_number
        )

    def _normalize_whatsapp(self, phone: str) -> str:
        """Ensure phone number has the whatsapp: prefix."""
        if not phone.startswith("whatsapp:"):
            return f"whatsapp:{phone}"
        return phone

    async def send_whatsapp(self, to_phone: str, message: str) -> bool:
        """Send a WhatsApp message using Twilio."""
        if not self.is_configured:
            logger.warning(
                "Twilio WhatsApp not configured. Message not sent to %s.", to_phone
            )
            return False

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            msg = client.messages.create(
                body=message,
                from_=self.whatsapp_number,
                to=self._normalize_whatsapp(to_phone),
            )
            logger.info("WhatsApp message sent to %s. SID: %s", to_phone, msg.sid)
            return True
        except Exception as exc:
            logger.error("Failed to send WhatsApp to %s: %s", to_phone, exc)
            return False

    async def send_appointment_confirmation(
        self,
        to_phone: str,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment confirmation via WhatsApp."""
        body = (
            f"Hello {client_name}! Your appointment is confirmed.\n"
            f"Business: {business_name}\n"
            f"Service: {service_name}\n"
            f"Time: {appointment_time}"
        )
        if reschedule_url:
            body += f"\nReschedule: {reschedule_url}"
        return await self.send_whatsapp(to_phone, body)

    async def send_appointment_reminder(
        self,
        to_phone: str,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int = 24,
        reschedule_url: Optional[str] = None,
    ) -> bool:
        """Send appointment reminder via WhatsApp."""
        body = (
            f"Reminder for {client_name}: {service_name} at {business_name} in {hours_before}h.\n"
            f"Time: {appointment_time}"
        )
        if reschedule_url:
            body += f"\nReschedule: {reschedule_url}"
        return await self.send_whatsapp(to_phone, body)

    async def send_appointment_followup(
        self,
        to_phone: str,
        client_name: str,
        business_name: str,
        service_name: str,
    ) -> bool:
        """Send post-appointment follow-up via WhatsApp."""
        body = (
            f"Hi {client_name}, thank you for your {service_name} appointment at {business_name}!\n"
            f"We hope to see you again soon."
        )
        return await self.send_whatsapp(to_phone, body)


# Service singletons
email_service = EmailService()
sms_service = SMSService()
whatsapp_service = WhatsAppService()
