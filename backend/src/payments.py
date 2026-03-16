"""Payment service using Stripe."""
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)


class PaymentService:
    """Payment service using Stripe."""
    
    def __init__(self):
        self.secret_key = settings.stripe_secret_key
        self.is_configured = bool(self.secret_key)
        
        if self.is_configured:
            import stripe
            stripe.api_key = self.secret_key
    
    async def create_payment_intent(
        self,
        amount: int,  # Amount in cents
        currency: str = "usd",
        customer_email: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[dict]:
        """Create a Stripe payment intent."""
        if not self.is_configured:
            logger.warning("Stripe not configured. Payment intent not created.")
            return None
        
        try:
            import stripe
            
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                receipt_email=customer_email,
                metadata=metadata or {}
            )
            
            logger.info(f"Payment intent created: {intent.id}")
            return {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status
            }
        except Exception as e:
            logger.error(f"Failed to create payment intent: {str(e)}")
            return None
    
    async def confirm_payment(self, payment_intent_id: str) -> Optional[dict]:
        """Confirm a payment intent."""
        if not self.is_configured:
            return None
        
        try:
            import stripe
            
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "id": intent.id,
                "status": intent.status,
                "amount": intent.amount
            }
        except Exception as e:
            logger.error(f"Failed to confirm payment: {str(e)}")
            return None
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount: Optional[int] = None  # Partial refund amount in cents
    ) -> Optional[dict]:
        """Create a refund for a payment."""
        if not self.is_configured:
            return None
        
        try:
            import stripe
            
            refund_params = {"payment_intent": payment_intent_id}
            if amount:
                refund_params["amount"] = amount
            
            refund = stripe.Refund.create(**refund_params)
            
            logger.info(f"Refund created: {refund.id}")
            return {
                "id": refund.id,
                "status": refund.status,
                "amount": refund.amount
            }
        except Exception as e:
            logger.error(f"Failed to create refund: {str(e)}")
            return None


# Service instance
payment_service = PaymentService()
