"""Seed script to create the superadmin user during deployment.

Usage:  python -m scripts.seed_superadmin

Env vars:
    SUPERADMIN_EMAIL     (default: admin@remidesk.com)
    SUPERADMIN_PASSWORD  (required — script skips if not set)
    SUPERADMIN_NAME      (default: Platform Admin)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import SessionLocal, init_db
from src.models import User, UserRole
from src.auth import get_password_hash


def seed():
    """Create the superadmin user if it doesn't already exist."""
    init_db()
    db = SessionLocal()
    try:
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
    finally:
        db.close()


if __name__ == "__main__":
    seed()
