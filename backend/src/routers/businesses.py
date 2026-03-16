"""Business routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, UserRole
from ..schemas import (
    BusinessCreate, BusinessUpdate, BusinessResponse
)
from ..auth import get_current_user

router = APIRouter(prefix="/businesses", tags=["Businesses"])


@router.post("/", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new business. User becomes a business owner."""
    # Update user role to business owner if they're a customer
    if current_user.role == UserRole.CUSTOMER:
        current_user.role = UserRole.BUSINESS_OWNER
    
    new_business = Business(
        owner_id=current_user.id,
        **business_data.dict()
    )
    
    db.add(new_business)
    db.commit()
    db.refresh(new_business)
    
    return new_business


@router.get("/my", response_model=List[BusinessResponse])
async def get_my_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all businesses owned by the current user."""
    businesses = db.query(Business).filter(
        Business.owner_id == current_user.id
    ).all()
    return businesses


@router.put("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: int,
    business_update: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a business. Only the owner can update."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this business"
        )
    
    update_data = business_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)
    
    db.commit()
    db.refresh(business)
    
    return business


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a business. Only the owner can delete."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this business"
        )
    
    business.is_active = False
    db.commit()
