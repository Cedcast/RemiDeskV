"""AI-powered notification content generation using OpenAI."""
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from .ai_service import openai_service, estimate_cost
from .models import AIQuota, AIUsageLog, Subscription, SubscriptionTier

logger = logging.getLogger(__name__)

# In-memory cache: cache_key -> (message, timestamp)
_cache: Dict[str, Tuple[str, datetime]] = {}
_CACHE_TTL_SECONDS = 3600  # 1 hour


def _cache_key(prompt: str, tone: str, language: str) -> str:
    """Generate a deterministic cache key from prompt + tone + language."""
    raw = f"{prompt}|{tone}|{language}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_cached(key: str) -> Optional[str]:
    """Return cached message if still fresh."""
    if key not in _cache:
        return None
    msg, ts = _cache[key]
    age = (datetime.utcnow() - ts).total_seconds()
    if age > _CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return msg


def _set_cached(key: str, message: str) -> None:
    _cache[key] = (message, datetime.utcnow())


def _is_pro(subscription: Optional[Subscription]) -> bool:
    """Return True if user has Pro or free trial (which grants Pro features)."""
    if subscription is None:
        return False
    return subscription.tier in (SubscriptionTier.PRO, SubscriptionTier.FREE_TRIAL)


def _check_quota(db: Session, user_id: int) -> Tuple[bool, Optional[AIQuota]]:
    """
    Check if user has remaining AI quota for the current month.
    Returns (quota_ok, quota_record).
    """
    month = datetime.utcnow().strftime("%Y-%m")
    quota = (
        db.query(AIQuota)
        .filter(AIQuota.user_id == user_id, AIQuota.month == month)
        .first()
    )
    if quota is None:
        quota = AIQuota(
            user_id=user_id,
            month=month,
            api_calls_used=0,
            api_calls_limit=500,
            cost_usd_used=0.0,
            cost_usd_limit=50.0,
        )
        db.add(quota)
        db.commit()
        db.refresh(quota)

    quota_ok = (
        quota.api_calls_used < quota.api_calls_limit
        and quota.cost_usd_used < quota.cost_usd_limit
    )
    return quota_ok, quota


def _log_usage(
    db: Session,
    user_id: int,
    business_id: Optional[int],
    notification_type: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    success: bool,
    quota: Optional[AIQuota],
) -> None:
    """Log AI API call and update quota."""
    cost = estimate_cost(prompt_tokens, completion_tokens)
    log = AIUsageLog(
        user_id=user_id,
        business_id=business_id,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        cost_usd=cost,
        notification_type=notification_type,
        success=success,
    )
    db.add(log)
    if quota and success:
        quota.api_calls_used += 1
        quota.cost_usd_used += cost
    db.commit()


class AINotificationService:
    """
    Generates personalized notification messages using OpenAI GPT.

    Features:
    - Dynamic tone adjustment (professional, friendly, casual, motivational)
    - Multi-language support (en, es, fr, de)
    - A/B test variant generation
    - In-memory caching for identical prompts
    - Per-user quota management via AIQuota table
    - Cost tracking via AIUsageLog table
    - Graceful fallback to standard templates
    - Gated to Pro plan users only
    """

    def _build_reminder_prompt(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int,
        reschedule_url: Optional[str],
        business_type: Optional[str],
    ) -> str:
        biz_context = f" ({business_type} business)" if business_type else ""
        reschedule_hint = (
            f" Include a brief note they can reschedule at: {reschedule_url}"
            if reschedule_url
            else ""
        )
        return (
            f"Write a short appointment reminder for {client_name}. "
            f"They have a {service_name} appointment at {business_name}{biz_context} "
            f"in {hours_before} hour(s) ({appointment_time}).{reschedule_hint}"
        )

    def _build_confirmation_prompt(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str],
        business_type: Optional[str],
    ) -> str:
        biz_context = f" ({business_type} business)" if business_type else ""
        reschedule_hint = (
            f" Mention they can reschedule at: {reschedule_url}"
            if reschedule_url
            else ""
        )
        return (
            f"Write a short appointment confirmation for {client_name}. "
            f"They just booked a {service_name} at {business_name}{biz_context} "
            f"on {appointment_time}.{reschedule_hint}"
        )

    def _build_followup_prompt(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        business_type: Optional[str],
    ) -> str:
        biz_context = f" ({business_type} business)" if business_type else ""
        return (
            f"Write a short thank-you follow-up for {client_name} "
            f"who just had a {service_name} appointment at {business_name}{biz_context}. "
            f"Encourage them to book again."
        )

    def generate_reminder_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        hours_before: int,
        reschedule_url: Optional[str] = None,
        tone: str = "professional",
        language: str = "en",
        business_type: Optional[str] = None,
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
        business_id: Optional[int] = None,
        subscription: Optional[Subscription] = None,
        variant_count: int = 1,
    ) -> Optional[List[str]]:
        """
        Generate personalised appointment reminder messages.

        Returns list of message strings (length = variant_count), or None on failure.
        """
        if db and user_id and not _is_pro(subscription):
            return None

        prompt = self._build_reminder_prompt(
            client_name, business_name, service_name,
            appointment_time, hours_before, reschedule_url, business_type,
        )

        return self._generate(
            prompt=prompt,
            tone=tone,
            language=language,
            notification_type="reminder",
            db=db,
            user_id=user_id,
            business_id=business_id,
            variant_count=variant_count,
        )

    def generate_confirmation_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        appointment_time: str,
        reschedule_url: Optional[str] = None,
        tone: str = "professional",
        language: str = "en",
        business_type: Optional[str] = None,
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
        business_id: Optional[int] = None,
        subscription: Optional[Subscription] = None,
        variant_count: int = 1,
    ) -> Optional[List[str]]:
        """
        Generate personalised appointment confirmation messages.

        Returns list of message strings, or None on failure.
        """
        if db and user_id and not _is_pro(subscription):
            return None

        prompt = self._build_confirmation_prompt(
            client_name, business_name, service_name,
            appointment_time, reschedule_url, business_type,
        )

        return self._generate(
            prompt=prompt,
            tone=tone,
            language=language,
            notification_type="confirmation",
            db=db,
            user_id=user_id,
            business_id=business_id,
            variant_count=variant_count,
        )

    def generate_followup_message(
        self,
        client_name: str,
        business_name: str,
        service_name: str,
        tone: str = "professional",
        language: str = "en",
        business_type: Optional[str] = None,
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
        business_id: Optional[int] = None,
        subscription: Optional[Subscription] = None,
        variant_count: int = 1,
    ) -> Optional[List[str]]:
        """
        Generate personalised post-appointment follow-up messages.

        Returns list of message strings, or None on failure.
        """
        if db and user_id and not _is_pro(subscription):
            return None

        prompt = self._build_followup_prompt(
            client_name, business_name, service_name, business_type,
        )

        return self._generate(
            prompt=prompt,
            tone=tone,
            language=language,
            notification_type="followup",
            db=db,
            user_id=user_id,
            business_id=business_id,
            variant_count=variant_count,
        )

    def _generate(
        self,
        prompt: str,
        tone: str,
        language: str,
        notification_type: str,
        db: Optional[Session],
        user_id: Optional[int],
        business_id: Optional[int],
        variant_count: int,
    ) -> Optional[List[str]]:
        """Internal: check quota, cache, call OpenAI, log usage."""
        if not openai_service.is_configured:
            return None

        # Check quota if db provided
        quota = None
        if db and user_id:
            quota_ok, quota = _check_quota(db, user_id)
            if not quota_ok:
                logger.warning("AI quota exceeded for user %d", user_id)
                return None

        # For single variant, check cache
        if variant_count == 1:
            key = _cache_key(prompt, tone, language)
            cached = _get_cached(key)
            if cached:
                return [cached]

        # Call OpenAI
        if variant_count > 1:
            texts, p_tokens, c_tokens = openai_service.chat_variants(
                prompt, tone=tone, language=language, n=variant_count
            )
            success = bool(texts)
            result = texts if texts else None
        else:
            text, p_tokens, c_tokens = openai_service.chat(
                prompt, tone=tone, language=language
            )
            success = text is not None
            result = [text] if text else None

            # Cache single result
            if result:
                key = _cache_key(prompt, tone, language)
                _set_cached(key, result[0])

        # Log usage
        if db and user_id:
            _log_usage(
                db, user_id, business_id, notification_type,
                "gpt-4o-mini", p_tokens, c_tokens, success, quota,
            )

        return result


# Singleton
ai_notification_service = AINotificationService()

