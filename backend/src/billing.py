"""Billing and subscription management service for RemiDesk."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from .models import (
    Subscription, Payment, User,
    SubscriptionTier, SubscriptionStatus, PaymentProvider, PaymentStatus,
)
from .config import settings

# ---------------------------------------------------------------------------
# Multi-currency pricing (amounts in minor units, e.g. 1200 = $12.00)
# ---------------------------------------------------------------------------

PRICING: Dict[str, Dict[str, Dict[str, Any]]] = {
    "premium": {
        "USD": {"amount": 1500, "symbol": "$", "label": "$15.00"},
    },
    "pro": {
        "USD": {"amount": 3899, "symbol": "$", "label": "$38.99"},
    },
}

# Supported currencies and their display info
CURRENCIES = {"USD": {"symbol": "$", "name": "US Dollar", "flag": "🇺🇸"}}

# Tier limits / feature flags
TIER_LIMITS = {
    SubscriptionTier.FREE_TRIAL: {
        "appointments_per_month": None,  # unlimited (Pro features during trial)
        "sms": True,
        "whatsapp": True,
        "advanced_analytics": True,
        "api_access": True,
        "data_retention_days": 365,
        "analytics_days": 365,
        "support": "priority",
    },
    SubscriptionTier.PREMIUM: {
        "appointments_per_month": 50,
        "sms": True,
        "whatsapp": False,
        "advanced_analytics": False,
        "api_access": False,
        "data_retention_days": 90,   # live data
        "analytics_days": 180,       # read-only analytics view
        "support": "email",
    },
    SubscriptionTier.PRO: {
        "appointments_per_month": None,  # unlimited
        "sms": True,
        "whatsapp": True,
        "advanced_analytics": True,
        "api_access": True,
        "data_retention_days": 365,
        "analytics_days": 365,
        "support": "priority",
    },
    SubscriptionTier.TRIAL_EXPIRED: {
        "appointments_per_month": 0,
        "sms": False,
        "whatsapp": False,
        "advanced_analytics": False,
        "api_access": False,
        "data_retention_days": 0,
        "analytics_days": 0,
        "support": "none",
    },
}


# ---------------------------------------------------------------------------
# Subscription helpers
# ---------------------------------------------------------------------------

def get_pricing_info(currency: str = "USD") -> Dict[str, Any]:
    """Return full pricing info for the given currency."""
    currency = currency.upper()
    if currency not in CURRENCIES:
        currency = "USD"
    return {
        "currency": currency,
        "currency_info": CURRENCIES[currency],
        "plans": {
            "premium": {
                "name": "RemiDesk Premium",
                "price": PRICING["premium"][currency],
                "features": [
                    "Up to 50 appointments/month",
                    "Email & SMS notifications",
                    "Basic dashboard",
                    "180-day analytics view (read-only after 90 days)",
                    "Email support",
                ],
                "tier": "premium",
            },
            "pro": {
                "name": "RemiDesk Pro",
                "price": PRICING["pro"][currency],
                "features": [
                    "Unlimited appointments",
                    "Email, SMS & WhatsApp notifications",
                    "Advanced analytics & reporting",
                    "1-year data retention",
                    "API access",
                    "Priority support",
                ],
                "tier": "pro",
            },
        },
        "trial": {
            "days": settings.free_trial_days,
            "description": f"{settings.free_trial_days}-day free trial with full Pro features",
            "requires_payment_method": False,
        },
    }


def create_trial_subscription(db: Session, user: User, currency: str = "USD") -> Subscription:
    """Create a new free trial subscription for a user."""
    currency = "USD"

    now = datetime.utcnow()
    trial_end = now + timedelta(days=settings.free_trial_days)

    subscription = Subscription(
        user_id=user.id,
        tier=SubscriptionTier.FREE_TRIAL,
        status=SubscriptionStatus.TRIALING,
        currency=currency,
        trial_started_at=now,
        trial_ends_at=trial_end,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


def get_subscription(db: Session, user_id: int) -> Optional[Subscription]:
    """Get a user's current subscription."""
    return db.query(Subscription).filter(Subscription.user_id == user_id).first()


def get_or_create_subscription(db: Session, user: User) -> Subscription:
    """Get the user's subscription, or create a trial if none exists."""
    sub = get_subscription(db, user.id)
    if sub is None:
        sub = create_trial_subscription(db, user)
    return sub


def get_trial_days_remaining(subscription: Subscription) -> Optional[int]:
    """Return days remaining in trial, or None if not in trial."""
    if subscription.status != SubscriptionStatus.TRIALING:
        return None
    if subscription.trial_ends_at is None:
        return None
    remaining = (subscription.trial_ends_at - datetime.utcnow()).days
    return max(0, remaining)


def is_trial_expiring_soon(subscription: Subscription, warn_days: int = 1) -> bool:
    """Return True if trial ends within warn_days days."""
    days_left = get_trial_days_remaining(subscription)
    if days_left is None:
        return False
    return days_left <= warn_days


def enforce_trial_expiry(db: Session, subscription: Subscription) -> Subscription:
    """Check if trial has expired and downgrade if needed."""
    if subscription.status != SubscriptionStatus.TRIALING:
        return subscription
    if subscription.trial_ends_at and datetime.utcnow() > subscription.trial_ends_at:
        subscription.tier = SubscriptionTier.TRIAL_EXPIRED
        subscription.status = SubscriptionStatus.EXPIRED
        subscription.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(subscription)
    return subscription


def get_subscription_info(db: Session, user: User) -> Dict[str, Any]:
    """Return a complete subscription status dict for the user."""
    sub = get_or_create_subscription(db, user)
    sub = enforce_trial_expiry(db, sub)

    trial_days_left = get_trial_days_remaining(sub)
    limits = TIER_LIMITS.get(sub.tier, TIER_LIMITS[SubscriptionTier.TRIAL_EXPIRED])

    return {
        "id": sub.id,
        "tier": sub.tier.value,
        "status": sub.status.value,
        "currency": sub.currency,
        "trial_started_at": sub.trial_started_at.isoformat() if sub.trial_started_at else None,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "trial_days_remaining": trial_days_left,
        "is_trial_expiring_soon": is_trial_expiring_soon(sub),
        "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        "paystack_reference": sub.paystack_reference,
        "limits": limits,
    }


def record_payment(
    db: Session,
    user_id: int,
    subscription_id: int,
    provider: PaymentProvider,
    amount: int,
    currency: str,
    provider_payment_id: str,
    description: str = "",
    status: PaymentStatus = PaymentStatus.COMPLETED,
    provider_invoice_id: Optional[str] = None,
    failure_reason: Optional[str] = None,
) -> Payment:
    """Record a payment transaction."""
    payment = Payment(
        subscription_id=subscription_id,
        user_id=user_id,
        provider=provider,
        status=status,
        amount=amount,
        currency=currency,
        provider_payment_id=provider_payment_id,
        provider_invoice_id=provider_invoice_id,
        description=description,
        failure_reason=failure_reason,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def activate_paid_subscription(
    db: Session,
    user: User,
    tier: SubscriptionTier,
    currency: str,
    period_start: datetime,
    period_end: datetime,
    paystack_reference: Optional[str] = None,
) -> Subscription:
    """Activate or upgrade a user's subscription to a paid plan."""
    sub = get_subscription(db, user.id)
    if sub is None:
        sub = Subscription(user_id=user.id)
        db.add(sub)

    sub.tier = tier
    sub.status = SubscriptionStatus.ACTIVE
    sub.currency = currency
    sub.current_period_start = period_start
    sub.current_period_end = period_end
    if paystack_reference:
        sub.paystack_reference = paystack_reference
    sub.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(sub)
    return sub


def cancel_subscription(db: Session, user: User) -> Subscription:
    """Cancel the user's subscription at end of period."""
    sub = get_subscription(db, user.id)
    if sub is None:
        raise ValueError("No subscription found for user")

    sub.cancelled_at = datetime.utcnow()
    sub.status = SubscriptionStatus.CANCELLED
    sub.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)
    return sub


def get_payment_history(db: Session, user_id: int) -> list:
    """Return payment history for a user."""
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "provider": p.provider.value,
            "status": p.status.value,
            "amount": p.amount,
            "currency": p.currency,
            "description": p.description,
            "provider_payment_id": p.provider_payment_id,
            "provider_invoice_id": p.provider_invoice_id,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]
