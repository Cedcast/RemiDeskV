import os
from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application Settings
    app_name: str = "B2B Appointment SaaS"
    admin_email: str = "admin@example.com"
    app_env: str = "development"
    debug: bool = True
    
    # Database - supports both SQLite (dev) and PostgreSQL (prod)
    database_url: str = "sqlite:///./app.db"
    
    # JWT Authentication
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Twilio (SMS & WhatsApp Notifications)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    twilio_whatsapp_number: Optional[str] = None  # e.g. "whatsapp:+14155238886"

    # SendGrid (Email Notifications)
    sendgrid_api_key: Optional[str] = None
    from_email: str = "noreply@example.com"

    # Stripe (Payments)
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_premium_price_id: Optional[str] = None  # Stripe Price ID for Premium plan
    stripe_pro_price_id: Optional[str] = None  # Stripe Price ID for Pro plan

    # PayPal (International Payments)
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    paypal_mode: str = "sandbox"  # sandbox | live

    # OpenAI (AI-powered notification messages)
    openai_api_key: Optional[str] = None

    # Billing Settings
    free_trial_days: int = 3
    app_currency_default: str = "USD"  # Default currency (USD, GBP, CAD, AUD)

    # Frontend URL (for CORS and reschedule links)
    frontend_url: str = "http://localhost:5173"

    # Base URL used in notification links
    app_base_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Fix Render's DATABASE_URL format (postgres:// -> postgresql://)
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)


settings = Settings()