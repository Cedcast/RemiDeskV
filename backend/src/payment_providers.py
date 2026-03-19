"""Paystack payment provider for RemDesk."""
import httpx
from typing import Optional, Dict, Any

from .config import settings
from .billing import PRICING

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
