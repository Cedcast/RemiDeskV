"""Seed script to create the superadmin and demo business owner during deployment.

Usage:  python -m scripts.seed_superadmin

Env vars (superadmin):
    SUPERADMIN_EMAIL     (default: admin@remidesk.com)
    SUPERADMIN_PASSWORD  (required — script skips if not set)
    SUPERADMIN_NAME      (default: Platform Admin)

Env vars (demo business — all optional):
    DEMO_OWNER_EMAIL     (default: owner@remidesk.com)
    DEMO_OWNER_PASSWORD  (default: Owner@1234)
    DEMO_OWNER_NAME      (default: Demo Owner)
    DEMO_BUSINESS_NAME   (default: RemiDesk Demo Salon)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import SessionLocal, init_db
from src.models import User, UserRole, Business
from src.auth import get_password_hash


def seed_superadmin(db):
    """Create the superadmin user if it doesn't already exist."""
    email = os.environ.get("SUPERADMIN_EMAIL", "admin@remidesk.com")
    password = os.environ.get("SUPERADMIN_PASSWORD")
    name = os.environ.get("SUPERADMIN_NAME", "Platform Admin")

    if not password:
        print("WARNING: SUPERADMIN_PASSWORD not set. Skipping superadmin seed.")
        return

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"Superadmin '{email}' already exists (id={existing.id}). Ensuring role=ADMIN.")
        if existing.role != UserRole.ADMIN:
            existing.role = UserRole.ADMIN
            db.commit()
        return

    admin = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=name,
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    print(f"Superadmin created: {email} (id={admin.id})")


def seed_demo_business(db):
    """Create a demo business owner + business for testing."""
    email = os.environ.get("DEMO_OWNER_EMAIL", "owner@remidesk.com")
    password = os.environ.get("DEMO_OWNER_PASSWORD", "Owner@1234")
    name = os.environ.get("DEMO_OWNER_NAME", "Demo Owner")
    biz_name = os.environ.get("DEMO_BUSINESS_NAME", "RemiDesk Demo Salon")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"Demo owner '{email}' already exists (id={existing.id}). Skipping.")
        return

    owner = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=name,
        role=UserRole.BUSINESS_OWNER,
        is_active=True,
        is_verified=True,
    )
    db.add(owner)
    db.flush()  # get owner.id

    business = Business(
        owner_id=owner.id,
        name=biz_name,
        description="Demo business for testing RemiDesk features",
        phone="+1234567890",
        email=email,
        timezone="UTC",
        business_type="salon",
        is_active=True,
    )
    db.add(business)
    db.commit()
    print(f"Demo business owner created: {email} (id={owner.id})")
    print(f"Demo business created: {biz_name} (id={business.id})")


def seed():
    init_db()
    db = SessionLocal()
    try:
        seed_superadmin(db)
        seed_demo_business(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
