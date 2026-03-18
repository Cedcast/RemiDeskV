"""AI-powered notification content generation using OpenAI."""
import logging
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)


class AINotificationService:
    """Generates personalized notification messages using OpenAI."""

    def __init__(self) -> None:
        self.api_key: Optional[str] = settings.openai_api_key
        self.is_configured: bool = bool(self.api_key)
        self._client = None

    def _get_client(self):
        """Lazily create the OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI  # type: ignore

                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                logger.warning("openai package is not installed; AI messages unavailable.")
        return self._client

    def _chat(self, prompt: str, max_tokens: int = 120) -> Optional[str]:
        """Send a chat completion request and return the text content."""
        client = self._get_client()
        if not client or not self.is_configured:
            return None
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant that writes short, friendly, "
                            "professional appointment reminder messages for a B2B scheduling service. "
                            "Keep messages concise (2-3 sentences max) and warm."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:  # noqa: BLE001
            logger.error("OpenAI request failed: %s", exc)
            return None

    def generate_reminder_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int,
        reschedule_url: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate a personalised appointment reminder message.

        Returns the generated text, or *None* if AI is unavailable so the caller
        can fall back to a standard template.
        """
        reschedule_hint = (
            f" Include a brief note that they can reschedule at: {reschedule_url}"
            if reschedule_url
            else ""
        )
        prompt = (
            f"Write a friendly appointment reminder for {client_name}. "
            f"They have a {service_name} appointment at {business_name} "
            f"in {hours_before} hour(s) ({appointment_time}).{reschedule_hint}"
        )
        return self._chat(prompt)

    def generate_confirmation_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate a personalised appointment confirmation message.

        Returns the generated text, or *None* on failure so the caller can fall back.
        """
        reschedule_hint = (
            f" Include a brief note that they can reschedule at: {reschedule_url}"
            if reschedule_url
            else ""
        )
        prompt = (
            f"Write a friendly appointment confirmation for {client_name}. "
            f"They have just booked a {service_name} at {business_name} "
            f"on {appointment_time}.{reschedule_hint}"
        )
        return self._chat(prompt)

    def generate_followup_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
    ) -> Optional[str]:
        """
        Generate a personalised post-appointment follow-up message.

        Returns the generated text, or *None* on failure so the caller can fall back.
        """
        prompt = (
            f"Write a short, warm thank-you follow-up for {client_name} "
            f"who just had a {service_name} appointment at {business_name}. "
            f"Encourage them to book again."
        )
        return self._chat(prompt)


# Singleton
ai_notification_service = AINotificationService()
