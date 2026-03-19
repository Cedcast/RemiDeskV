"""Payment provider integrations for RemiDesk (Stripe & PayPal)."""
import stripe
import httpx
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

from .config import settings
from .billing import PRICING

# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


class StripeProvider:
    """Stripe payment integration."""

    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.stripe_secret_key)

    @staticmethod
    def get_or_create_customer(email: str, name: str, customer_id: Optional[str] = None) -> str:
        """Return existing Stripe customer ID or create a new one."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        if customer_id:
            return customer_id
        customer = stripe.Customer.create(email=email, name=name)
        return customer.id

    @staticmethod
    def create_subscription(
        customer_id: str,
        price_id: str,
        trial_days: int = 0,
    ) -> Dict[str, Any]:
        """Create a Stripe subscription, optionally with a trial period."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        params: Dict[str, Any] = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",
            "payment_settings": {"save_default_payment_method": "on_subscription"},
            "expand": ["latest_invoice.payment_intent"],
        }
        if trial_days > 0:
            params["trial_period_days"] = trial_days
        return stripe.Subscription.create(**params)

    @staticmethod
    def cancel_subscription(subscription_id: str) -> Dict[str, Any]:
        """Cancel a Stripe subscription at end of period."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        return stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)

    @staticmethod
    def cancel_subscription_immediately(subscription_id: str) -> Dict[str, Any]:
        """Cancel a Stripe subscription immediately."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        return stripe.Subscription.cancel(subscription_id)

    @staticmethod
    def get_subscription(subscription_id: str) -> Dict[str, Any]:
        """Retrieve a Stripe subscription."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        return stripe.Subscription.retrieve(subscription_id)

    @staticmethod
    def create_setup_intent(customer_id: str) -> Dict[str, Any]:
        """Create a SetupIntent so users can save a payment method."""
        if not StripeProvider._is_configured():
            raise RuntimeError("Stripe is not configured")
        return stripe.SetupIntent.create(customer=customer_id)

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Verify and construct a Stripe webhook event."""
        if not settings.stripe_webhook_secret:
            raise RuntimeError("Stripe webhook secret is not configured")
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )

    @staticmethod
    def get_publishable_key() -> Optional[str]:
        return settings.stripe_publishable_key

    @staticmethod
    def get_price_id(tier: str) -> Optional[str]:
        """Return the Stripe Price ID for a given tier name."""
        if tier == "premium":
            return settings.stripe_premium_price_id
        if tier == "pro":
            return settings.stripe_pro_price_id
        return None


# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------

PAYPAL_BASE_URLS = {
    "sandbox": "https://api-m.sandbox.paypal.com",
    "live": "https://api-m.paypal.com",
}


class PayPalProvider:
    """PayPal payment integration using REST API."""

    def __init__(self):
        self.client_id = settings.paypal_client_id
        self.client_secret = settings.paypal_client_secret
        self.mode = settings.paypal_mode
        self.base_url = PAYPAL_BASE_URLS.get(self.mode, PAYPAL_BASE_URLS["sandbox"])
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def _get_access_token(self) -> str:
        """Fetch or return cached PayPal OAuth2 access token."""
        if (
            self._access_token
            and self._token_expires_at
            and datetime.utcnow() < self._token_expires_at
        ):
            return self._access_token

        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 32400)
        self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)
        return self._access_token

    async def create_order(
        self,
        tier: str,
        currency: str,
        return_url: str,
        cancel_url: str,
    ) -> Dict[str, Any]:
        """Create a PayPal order for a subscription payment."""
        if not self._is_configured():
            raise RuntimeError("PayPal is not configured")

        currency = currency.upper()
        price_info = PRICING.get(tier, {}).get(currency)
        if not price_info:
            raise ValueError(f"Unsupported tier or currency: {tier}/{currency}")

        # Amount in decimal string (e.g. "12.00")
        amount_str = f"{price_info['amount'] / 100:.2f}"

        token = await self._get_access_token()

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {"currency_code": currency, "value": amount_str},
                    "description": f"RemiDesk {tier.capitalize()} Plan - Monthly",
                }
            ],
            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "brand_name": "RemiDesk",
                "landing_page": "BILLING",
                "user_action": "PAY_NOW",
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Capture a PayPal order after user approval."""
        if not self._is_configured():
            raise RuntimeError("PayPal is not configured")

        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get a PayPal order."""
        if not self._is_configured():
            raise RuntimeError("PayPal is not configured")

        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/checkout/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    def get_client_id(self) -> Optional[str]:
        return self.client_id


# Module-level singletons
stripe_provider = StripeProvider()
paypal_provider = PayPalProvider()


# ---------------------------------------------------------------------------
# Paystack
# ---------------------------------------------------------------------------

PAYSTACK_BASE_URL = "https://api.paystack.co"


class PaystackProvider:
    """Paystack payment integration using REST API."""

    def _is_configured(self) -> bool:
        return bool(settings.paystack_secret_key)

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.paystack_secret_key}",
            "Content-Type": "application/json",
        }

    async def initialize_transaction(
        self,
        email: str,
        amount_minor_units: int,
        currency: str,
        tier: str,
        callback_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Initialize a Paystack transaction. Returns authorization_url and reference."""
        if not self._is_configured():
            raise RuntimeError("Paystack is not configured")

        payload: Dict[str, Any] = {
            "email": email,
            "amount": amount_minor_units,
            "currency": currency.upper(),
            "callback_url": callback_url,
            "metadata": metadata or {"tier": tier},
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                headers=self._auth_headers(),
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify a Paystack transaction by reference."""
        if not self._is_configured():
            raise RuntimeError("Paystack is not configured")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=self._auth_headers(),
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    def get_public_key(self) -> Optional[str]:
        """Return the Paystack public key for frontend inline popup."""
        return settings.paystack_public_key


paystack_provider = PaystackProvider()
