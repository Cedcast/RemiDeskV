"""Subscription management router for RemiDesk billing."""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, SubscriptionTier, SubscriptionStatus, PaymentProvider, PaymentStatus
from ..billing import (
    get_pricing_info,
    get_subscription_info,
    create_trial_subscription,
    get_subscription,
    activate_paid_subscription,
    cancel_subscription,
    record_payment,
    get_payment_history,
    CURRENCIES,
    PRICING,
)
from ..payment_providers import paystack_provider
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class StartTrialRequest(BaseModel):
    pass  # Currency is always USD


class UpgradeRequest(BaseModel):
    tier: str  # "premium" or "pro"
    # Paystack: transaction reference after user payment
    paystack_reference: Optional[str] = None
    return_url: Optional[str] = None


class CancelRequest(BaseModel):
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Public endpoint — pricing
# ---------------------------------------------------------------------------

@router.get("/pricing")
async def get_pricing(currency: str = "USD"):
    """Return pricing information for all plans."""
    return get_pricing_info(currency)


@router.get("/pricing/currencies")
async def list_currencies():
    """Return supported currencies."""
    return CURRENCIES


# ---------------------------------------------------------------------------
# Authenticated endpoints
# ---------------------------------------------------------------------------

@router.post("/trial")
async def start_free_trial(
    body: StartTrialRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a 3-day free trial for the current user."""
    existing = get_subscription(db, current_user.id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A subscription already exists for this account.",
        )
    sub = create_trial_subscription(db, current_user)
    return {"message": "Free trial started", "subscription": get_subscription_info(db, current_user)}


@router.get("/current")
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's subscription status."""
    return get_subscription_info(db, current_user)


@router.post("/upgrade")
async def upgrade_subscription(
    body: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upgrade to a paid plan via Paystack."""
    tier = body.tier.lower()
    if tier not in ("premium", "pro"):
        raise HTTPException(status_code=400, detail="Invalid tier. Choose 'premium' or 'pro'.")

    currency = "USD"

    # ---- Paystack ----
    if not body.paystack_reference:
        # Initialize a Paystack transaction and return the authorization URL
        callback_url = body.return_url or f"{settings.frontend_url}/dashboard/billing?paystack=success"
        price_info = PRICING.get(tier, {}).get(currency)
        if not price_info:
            raise HTTPException(status_code=400, detail=f"No Paystack pricing for {tier}/{currency}")
        try:
            result = await paystack_provider.initialize_transaction(
                email=current_user.email,
                amount_kobo=price_info["amount"],
                currency=currency,
                tier=tier,
                callback_url=callback_url,
                metadata={"tier": tier, "user_id": current_user.id},
            )
        except Exception as exc:
            logger.error("Paystack initialize error: %s", exc)
            raise HTTPException(status_code=502, detail=f"Paystack error: {str(exc)}")

        tx_data = result.get("data", {})
        return {
            "authorization_url": tx_data.get("authorization_url"),
            "reference": tx_data.get("reference"),
        }

    # Verify the completed transaction
    try:
        result = await paystack_provider.verify_transaction(body.paystack_reference)
    except Exception as exc:
        logger.error("Paystack verify error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Paystack verify error: {str(exc)}")

    tx_data = result.get("data", {})
    if tx_data.get("status") != "success":
        raise HTTPException(status_code=402, detail="Paystack payment not successful.")

    now = datetime.utcnow()
    tier_enum = SubscriptionTier.PREMIUM if tier == "premium" else SubscriptionTier.PRO
    activated = activate_paid_subscription(
        db=db,
        user=current_user,
        tier=tier_enum,
        currency=currency,
        period_start=now,
        period_end=now + timedelta(days=30),
        paystack_reference=body.paystack_reference,
    )

    amount_paid = tx_data.get("amount", 0)
    record_payment(
        db=db,
        user_id=current_user.id,
        subscription_id=activated.id,
        provider=PaymentProvider.PAYSTACK,
        amount=amount_paid,
        currency=currency,
        provider_payment_id=body.paystack_reference,
        description=f"RemiDesk {tier.capitalize()} - Monthly",
    )

    return {
        "message": f"Successfully upgraded to {tier.capitalize()}",
        "subscription": get_subscription_info(db, current_user),
    }


# ---------------------------------------------------------------------------
# Paystack Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook/paystack")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None, alias="x-paystack-signature"),
    db: Session = Depends(get_db),
):
    """Handle Paystack webhook events, validated via HMAC SHA512."""
    payload = await request.body()

    # Validate signature
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=503, detail="Paystack is not configured")

    expected_sig = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, x_paystack_signature or ""):
        logger.error("Invalid Paystack webhook signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("event", "")
    data = event.get("data", {})
    logger.info("Paystack webhook received: %s", event_type)

    if event_type == "charge.success":
        _handle_paystack_charge_success(db, data)

    return {"status": "ok"}


def _handle_paystack_charge_success(db: Session, data: dict):
    """Handle a successful Paystack charge webhook."""
    from ..models import User as UserModel

    reference = data.get("reference", "")
    metadata = data.get("metadata", {})
    tier_name = metadata.get("tier", "")
    currency = "USD"
    amount = data.get("amount", 0)  # amount in minor units
    customer_email = data.get("customer", {}).get("email", "")

    if not tier_name or not customer_email:
        logger.warning("Paystack charge.success missing tier or email in metadata")
        return

    user = db.query(UserModel).filter_by(email=customer_email).first()
    if user is None:
        logger.warning("Paystack charge.success: no user found for email %s", customer_email)
        return

    tier_enum = SubscriptionTier.PREMIUM if tier_name == "premium" else SubscriptionTier.PRO
    now = datetime.utcnow()
    activated = activate_paid_subscription(
        db=db,
        user=user,
        tier=tier_enum,
        currency=currency,
        period_start=now,
        period_end=now + timedelta(days=30),
        paystack_reference=reference,
    )

    record_payment(
        db=db,
        user_id=user.id,
        subscription_id=activated.id,
        provider=PaymentProvider.PAYSTACK,
        amount=amount,
        currency=currency,
        provider_payment_id=reference,
        description=f"RemiDesk {tier_name.capitalize()} - Monthly",
    )


@router.post("/cancel")
async def cancel_user_subscription(
    body: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel the current user's subscription."""
    sub = get_subscription(db, current_user.id)
    if sub is None:
        raise HTTPException(status_code=404, detail="No subscription found.")

    cancelled = cancel_subscription(db, current_user)
    return {
        "message": "Subscription cancelled. Access continues until end of billing period.",
        "subscription": get_subscription_info(db, current_user),
    }


@router.get("/payments")
async def list_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment history for the current user."""
    return get_payment_history(db, current_user.id)
