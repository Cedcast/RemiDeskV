"""OpenAI API wrapper for AI-powered notification message generation."""
import logging
from typing import Optional, Tuple

from .config import settings

logger = logging.getLogger(__name__)

# Cost per 1000 tokens for gpt-4o-mini (USD)
_COST_PER_1K_PROMPT = 0.00015
_COST_PER_1K_COMPLETION = 0.0006

TONE_INSTRUCTIONS = {
    "professional": "Use a professional, formal tone. Be concise and respectful.",
    "friendly": "Use a warm, friendly tone. Be approachable and personable.",
    "casual": "Use a casual, relaxed tone. Keep it short and conversational.",
    "motivational": "Use an upbeat, motivational tone. Be encouraging and positive.",
}

LANGUAGE_INSTRUCTIONS = {
    "en": "Write in English.",
    "es": "Write in Spanish (Español).",
    "fr": "Write in French (Français).",
    "de": "Write in German (Deutsch).",
}

SYSTEM_PROMPT = (
    "You are a concise appointment notification writer for a B2B scheduling platform. "
    "Write short, clear messages (2-3 sentences max) for appointment notifications. "
    "Never add placeholders like [NAME] — use the actual values provided. "
    "Do not include subject lines or greetings like 'Subject:'. Return only the message body."
)


def estimate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate cost in USD for a GPT API call."""
    return (
        prompt_tokens / 1000 * _COST_PER_1K_PROMPT
        + completion_tokens / 1000 * _COST_PER_1K_COMPLETION
    )


class OpenAIService:
    """Async-safe OpenAI GPT wrapper for notification message generation."""

    def __init__(self) -> None:
        self.api_key: Optional[str] = settings.openai_api_key
        self.is_configured: bool = bool(self.api_key)
        self._client = None

    def _get_client(self):
        """Lazily create the OpenAI client."""
        if self._client is None and self.is_configured:
            try:
                from openai import OpenAI  # type: ignore
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                logger.warning("openai package is not installed; AI messages unavailable.")
        return self._client

    def chat(
        self,
        prompt: str,
        tone: str = "professional",
        language: str = "en",
        max_tokens: int = 150,
    ) -> Tuple[Optional[str], int, int]:
        """
        Send a chat completion request.

        Returns (message_text, prompt_tokens, completion_tokens).
        Returns (None, 0, 0) on failure.
        """
        client = self._get_client()
        if not client:
            return None, 0, 0

        tone_hint = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])
        lang_hint = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
        system = f"{SYSTEM_PROMPT} {tone_hint} {lang_hint}"

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            text = response.choices[0].message.content.strip()
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            return text, prompt_tokens, completion_tokens
        except Exception as exc:  # noqa: BLE001
            logger.error("OpenAI request failed: %s", exc)
            return None, 0, 0

    def chat_variants(
        self,
        prompt: str,
        tone: str = "professional",
        language: str = "en",
        n: int = 2,
        max_tokens: int = 150,
    ) -> Tuple[list, int, int]:
        """
        Generate n message variants in a single API call.

        Returns (list_of_texts, prompt_tokens, completion_tokens).
        """
        client = self._get_client()
        if not client:
            return [], 0, 0

        tone_hint = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])
        lang_hint = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
        system = f"{SYSTEM_PROMPT} {tone_hint} {lang_hint}"

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.85,
                n=n,
            )
            texts = [choice.message.content.strip() for choice in response.choices]
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            return texts, prompt_tokens, completion_tokens
        except Exception as exc:  # noqa: BLE001
            logger.error("OpenAI variants request failed: %s", exc)
            return [], 0, 0


# Singleton
openai_service = OpenAIService()
