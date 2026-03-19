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
from ..payment_providers import stripe_provider, paypal_provider, paystack_provider
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class StartTrialRequest(BaseModel):
    currency: str = "USD"


class UpgradeRequest(BaseModel):
    tier: str  # "premium" or "pro"
    currency: str = "USD"
    provider: str = "stripe"  # "stripe", "paypal", or "paystack"
    # Stripe: payment method / setup intent ID
    payment_method_id: Optional[str] = None
    # PayPal: order ID after user approval
    paypal_order_id: Optional[str] = None
    # Paystack: transaction reference after user payment
    paystack_reference: Optional[str] = None
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None


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
    sub = create_trial_subscription(db, current_user, currency=body.currency)
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
    """Upgrade to a paid plan via Stripe or PayPal."""
    tier = body.tier.lower()
    if tier not in ("premium", "pro"):
        raise HTTPException(status_code=400, detail="Invalid tier. Choose 'premium' or 'pro'.")

    currency = body.currency.upper()
    if currency not in CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {currency}")

    provider = body.provider.lower()

    # ---- Stripe ----
    if provider == "stripe":
        if not body.payment_method_id:
            raise HTTPException(status_code=400, detail="payment_method_id is required for Stripe.")

        price_id = stripe_provider.get_price_id(tier)
        if not price_id:
            raise HTTPException(
                status_code=503,
                detail=f"Stripe price ID for {tier} is not configured.",
            )

        sub = get_subscription(db, current_user.id)
        try:
            # Create or retrieve Stripe customer
            customer_id = stripe_provider.get_or_create_customer(
                email=current_user.email,
                name=current_user.full_name,
                customer_id=sub.stripe_customer_id if sub else None,
            )

            # Attach payment method to customer
            import stripe as _stripe
            _stripe.PaymentMethod.attach(body.payment_method_id, customer=customer_id)
            _stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": body.payment_method_id},
            )

            stripe_sub = stripe_provider.create_subscription(customer_id, price_id)

            period_start = datetime.fromtimestamp(stripe_sub["current_period_start"])
            period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
            tier_enum = SubscriptionTier.PREMIUM if tier == "premium" else SubscriptionTier.PRO

            activated = activate_paid_subscription(
                db=db,
                user=current_user,
                tier=tier_enum,
                currency=currency,
                period_start=period_start,
                period_end=period_end,
                stripe_customer_id=customer_id,
                stripe_subscription_id=stripe_sub["id"],
            )

            # Record payment if invoice exists
            invoice = stripe_sub.get("latest_invoice")
            if invoice and isinstance(invoice, dict):
                amount_paid = invoice.get("amount_paid", 0)
                if amount_paid > 0:
                    record_payment(
                        db=db,
                        user_id=current_user.id,
                        subscription_id=activated.id,
                        provider=PaymentProvider.STRIPE,
                        amount=amount_paid,
                        currency=currency,
                        provider_payment_id=invoice.get("payment_intent", ""),
                        provider_invoice_id=invoice.get("id"),
                        description=f"RemiDesk {tier.capitalize()} - Monthly",
                    )

        except Exception as exc:
            logger.error("Stripe upgrade error for user %s: %s", current_user.id, exc)
            raise HTTPException(status_code=502, detail=f"Stripe error: {str(exc)}")

        return {
            "message": f"Successfully upgraded to {tier.capitalize()}",
            "subscription": get_subscription_info(db, current_user),
        }

    # ---- PayPal ----
    if provider == "paypal":
        if not body.paypal_order_id:
            # Create a PayPal order and return the approval URL
            return_url = body.return_url or f"{settings.frontend_url}/dashboard/billing?paypal=success"
            cancel_url = body.cancel_url or f"{settings.frontend_url}/dashboard/billing?paypal=cancel"
            try:
                order = await paypal_provider.create_order(
                    tier=tier,
                    currency=currency,
                    return_url=return_url,
                    cancel_url=cancel_url,
                )
            except Exception as exc:
                logger.error("PayPal create order error: %s", exc)
                raise HTTPException(status_code=502, detail=f"PayPal error: {str(exc)}")

            approval_url = next(
                (link["href"] for link in order.get("links", []) if link.get("rel") == "approve"),
                None,
            )
            return {"order_id": order["id"], "approval_url": approval_url}

        # Capture the approved order
        try:
            capture = await paypal_provider.capture_order(body.paypal_order_id)
        except Exception as exc:
            logger.error("PayPal capture error: %s", exc)
            raise HTTPException(status_code=502, detail=f"PayPal capture error: {str(exc)}")

        if capture.get("status") != "COMPLETED":
            raise HTTPException(status_code=402, detail="PayPal payment not completed.")

        now = datetime.utcnow()
        tier_enum = SubscriptionTier.PREMIUM if tier == "premium" else SubscriptionTier.PRO
        activated = activate_paid_subscription(
            db=db,
            user=current_user,
            tier=tier_enum,
            currency=currency,
            period_start=now,
            period_end=now + timedelta(days=30),
            paypal_subscription_id=capture["id"],
        )

        unit = capture.get("purchase_units", [{}])[0]
        captured_amount = unit.get("payments", {}).get("captures", [{}])[0]
        amount_cents = int(float(captured_amount.get("amount", {}).get("value", 0)) * 100)

        record_payment(
            db=db,
            user_id=current_user.id,
            subscription_id=activated.id,
            provider=PaymentProvider.PAYPAL,
            amount=amount_cents,
            currency=currency,
            provider_payment_id=capture["id"],
            description=f"RemiDesk {tier.capitalize()} - Monthly",
        )

        return {
            "message": f"Successfully upgraded to {tier.capitalize()}",
            "subscription": get_subscription_info(db, current_user),
        }

    # ---- Paystack ----
    if provider == "paystack":
        if not body.paystack_reference:
            # Initialize a Paystack transaction and return the authorization URL
            callback_url = body.return_url or f"{settings.frontend_url}/dashboard/billing?paystack=success"
            price_info = PRICING.get(tier, {}).get(currency)
            if not price_info:
                raise HTTPException(status_code=400, detail=f"No Paystack pricing for {tier}/{currency}")
            try:
                result = await paystack_provider.initialize_transaction(
                    email=current_user.email,
                    amount_minor_units=price_info["amount"],
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

    raise HTTPException(status_code=400, detail="Invalid provider. Choose 'stripe', 'paypal', or 'paystack'.")


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
    currency = data.get("currency", "NGN")
    amount = data.get("amount", 0)  # amount in minor units (kobo for NGN, pesewas for GHS, cents for ZAR/KES)
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

    # Cancel on Stripe if applicable
    if sub.stripe_subscription_id:
        try:
            stripe_provider.cancel_subscription(sub.stripe_subscription_id)
        except Exception as exc:
            logger.warning("Could not cancel Stripe subscription: %s", exc)

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


# ---------------------------------------------------------------------------
# Stripe Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """Handle Stripe webhook events."""
    payload = await request.body()

    try:
        event = stripe_provider.construct_webhook_event(payload, stripe_signature or "")
    except Exception as exc:
        logger.error("Invalid Stripe webhook signature: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info("Stripe webhook received: %s", event_type)

    if event_type == "invoice.payment_succeeded":
        _handle_stripe_invoice_paid(db, data)
    elif event_type == "invoice.payment_failed":
        _handle_stripe_invoice_failed(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_stripe_subscription_deleted(db, data)
    elif event_type == "customer.subscription.updated":
        _handle_stripe_subscription_updated(db, data)

    return {"status": "ok"}


def _handle_stripe_invoice_paid(db: Session, invoice: dict):
    """Mark subscription active and record payment on successful invoice."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return
    from ..models import Subscription as SubModel
    sub = db.query(SubModel).filter_by(stripe_subscription_id=stripe_sub_id).first()
    if sub is None:
        return

    sub.status = SubscriptionStatus.ACTIVE
    sub.updated_at = datetime.utcnow()
    db.commit()

    record_payment(
        db=db,
        user_id=sub.user_id,
        subscription_id=sub.id,
        provider=PaymentProvider.STRIPE,
        amount=invoice.get("amount_paid", 0),
        currency=invoice.get("currency", "usd").upper(),
        provider_payment_id=invoice.get("payment_intent", ""),
        provider_invoice_id=invoice.get("id"),
        description="Subscription renewal",
    )


def _handle_stripe_invoice_failed(db: Session, invoice: dict):
    """Mark subscription past_due on failed payment."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return
    from ..models import Subscription as SubModel
    sub = db.query(SubModel).filter_by(stripe_subscription_id=stripe_sub_id).first()
    if sub is None:
        return
    sub.status = SubscriptionStatus.PAST_DUE
    sub.updated_at = datetime.utcnow()
    db.commit()

    record_payment(
        db=db,
        user_id=sub.user_id,
        subscription_id=sub.id,
        provider=PaymentProvider.STRIPE,
        amount=invoice.get("amount_due", 0),
        currency=invoice.get("currency", "usd").upper(),
        provider_payment_id=invoice.get("payment_intent", ""),
        provider_invoice_id=invoice.get("id"),
        description="Subscription renewal (failed)",
        status=PaymentStatus.FAILED,
        failure_reason="Payment failed",
    )


def _handle_stripe_subscription_deleted(db: Session, stripe_sub: dict):
    """Mark subscription cancelled when deleted on Stripe."""
    from ..models import Subscription as SubModel
    sub = db.query(SubModel).filter_by(stripe_subscription_id=stripe_sub["id"]).first()
    if sub is None:
        return
    sub.status = SubscriptionStatus.CANCELLED
    sub.cancelled_at = datetime.utcnow()
    sub.updated_at = datetime.utcnow()
    db.commit()


def _handle_stripe_subscription_updated(db: Session, stripe_sub: dict):
    """Sync subscription period dates when Stripe subscription updates."""
    from ..models import Subscription as SubModel
    sub = db.query(SubModel).filter_by(stripe_subscription_id=stripe_sub["id"]).first()
    if sub is None:
        return
    sub.current_period_start = datetime.fromtimestamp(stripe_sub.get("current_period_start", 0))
    sub.current_period_end = datetime.fromtimestamp(stripe_sub.get("current_period_end", 0))
    sub.updated_at = datetime.utcnow()
    db.commit()


# ---------------------------------------------------------------------------
# PayPal Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle PayPal webhook events (IPN / Webhooks API)."""
    payload = await request.json()
    event_type = payload.get("event_type", "")
    logger.info("PayPal webhook received: %s", event_type)
    # Basic acknowledgement — extend with PAYMENT.SALE.COMPLETED etc. as needed
    return {"status": "ok"}
