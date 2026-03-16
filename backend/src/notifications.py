"""Notification services for email and SMS."""
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)


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
        html_content: Optional[str] = None
    ) -> bool:
        """Send an email using SendGrid."""
        if not self.is_configured:
            logger.warning("SendGrid not configured. Email not sent.")
            return False
        
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                plain_text_content=Content("text/plain", content)
            )
            
            if html_content:
                message.add_content(Content("text/html", html_content))
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            logger.info(f"Email sent to {to_email}. Status: {response.status_code}")
            return response.status_code in [200, 201, 202]
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    async def send_appointment_confirmation(
        self,
        to_email: str,
        customer_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str
    ) -> bool:
        """Send appointment confirmation email."""
        subject = f"Appointment Confirmed - {business_name}"
        content = f"""
Hello {customer_name},

Your appointment has been confirmed!

Details:
- Business: {business_name}
- Service: {service_name}
- Time: {appointment_time}

Thank you for booking with us!

Best regards,
{business_name}
        """
        
        html_content = f"""
<html>
<body>
<h2>Appointment Confirmed!</h2>
<p>Hello {customer_name},</p>
<p>Your appointment has been confirmed!</p>
<h3>Details:</h3>
<ul>
<li><strong>Business:</strong> {business_name}</li>
<li><strong>Service:</strong> {service_name}</li>
<li><strong>Time:</strong> {appointment_time}</li>
</ul>
<p>Thank you for booking with us!</p>
<p>Best regards,<br>{business_name}</p>
</body>
</html>
        """
        
        return await self.send_email(to_email, subject, content, html_content)
    
    async def send_appointment_reminder(
        self,
        to_email: str,
        customer_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str
    ) -> bool:
        """Send appointment reminder email."""
        subject = f"Reminder: Upcoming Appointment - {business_name}"
        content = f"""
Hello {customer_name},

This is a reminder about your upcoming appointment.

Details:
- Business: {business_name}
- Service: {service_name}
- Time: {appointment_time}

See you soon!

Best regards,
{business_name}
        """
        
        return await self.send_email(to_email, subject, content)


class SMSService:
    """SMS notification service using Twilio."""
    
    def __init__(self):
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.phone_number = settings.twilio_phone_number
        self.is_configured = bool(self.account_sid and self.auth_token and self.phone_number)
    
    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send an SMS using Twilio."""
        if not self.is_configured:
            logger.warning("Twilio not configured. SMS not sent.")
            return False
        
        try:
            from twilio.rest import Client
            
            client = Client(self.account_sid, self.auth_token)
            
            msg = client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone
            )
            
            logger.info(f"SMS sent to {to_phone}. SID: {msg.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False
    
    async def send_appointment_confirmation(
        self,
        to_phone: str,
        business_name: str,
        appointment_time: str
    ) -> bool:
        """Send appointment confirmation SMS."""
        message = f"Appointment confirmed at {business_name} for {appointment_time}. Thank you!"
        return await self.send_sms(to_phone, message)
    
    async def send_appointment_reminder(
        self,
        to_phone: str,
        business_name: str,
        appointment_time: str
    ) -> bool:
        """Send appointment reminder SMS."""
        message = f"Reminder: You have an appointment at {business_name} on {appointment_time}."
        return await self.send_sms(to_phone, message)


# Service instances
email_service = EmailService()
sms_service = SMSService()
