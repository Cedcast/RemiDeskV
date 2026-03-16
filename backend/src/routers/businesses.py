"""Business routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, UserRole
from ..schemas import (
    BusinessCreate, BusinessUpdate, BusinessResponse, BusinessListResponse
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


@router.get("/", response_model=BusinessListResponse)
async def list_businesses(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    city: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all active businesses with optional filtering."""
    query = db.query(Business).filter(Business.is_active == True)
    
    if city:
        query = query.filter(Business.city.ilike(f"%{city}%"))
    if state:
        query = query.filter(Business.state.ilike(f"%{state}%"))
    if search:
        query = query.filter(
            (Business.name.ilike(f"%{search}%")) |
            (Business.description.ilike(f"%{search}%"))
        )
    
    total = query.count()
    offset = (page - 1) * size
    businesses = query.offset(offset).limit(size).all()
    
    return BusinessListResponse(
        businesses=businesses,
        total=total,
        page=page,
        size=size
    )


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


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: int, db: Session = Depends(get_db)):
    """Get a business by ID."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    return business


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
