"""User routes."""
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserResponse, UserUpdate, ChangePasswordRequest
from ..auth import (
    get_current_user,
    get_password_hash,
    verify_password,
    get_user_by_email,
    create_verification_token,
)
from ..config import settings
from ..notifications import email_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    update_data = user_update.dict(exclude_unset=True)

    # Handle email change with re-verification
    new_email = update_data.get("email")
    if new_email and new_email != current_user.email:
        # Ensure email is unique
        existing = get_user_by_email(db, new_email)
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        current_user.email = new_email
        current_user.is_verified = False

        # Send fresh verification email asynchronously
        token = create_verification_token(current_user.id)
        verification_url = f"{settings.app_base_url}/verify-email?token={token}"
        asyncio.create_task(
            email_service.send_verification_email(
                current_user.email,
                current_user.full_name,
                verification_url,
            )
        )

        # Don't process email again in generic field loop
        update_data.pop("email", None)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/me/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the authenticated user's password."""
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password changed successfully."}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
