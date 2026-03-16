from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application Settings
    app_name: str = "B2B Appointment SaaS"
    admin_email: str = "admin@example.com"
    app_env: str = "development"
    debug: bool = True
    
    # Database
    database_url: str = "sqlite:///./app.db"
    
    # JWT Authentication
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Twilio (SMS Notifications)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    
    # SendGrid (Email Notifications)
    sendgrid_api_key: Optional[str] = None
    from_email: str = "noreply@example.com"
    
    # Stripe (Payments)
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()