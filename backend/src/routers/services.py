"""Service routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Service, UserRole
from ..schemas import ServiceCreate, ServiceUpdate, ServiceResponse
from ..auth import get_current_user

router = APIRouter(prefix="/services", tags=["Services"])


def _get_starter_service_templates(business_type: str):
  """Return a list of starter service templates for a given business type.

  Each template is a dict with name, description, duration_minutes, price.
  """
  key = (business_type or "").lower()

  if key == "salon":
      return [
          {
              "name": "Women's haircut",
              "description": "Cut, wash and basic finish.",
              "duration_minutes": 45,
              "price": 45.0,
          },
          {
              "name": "Men's haircut",
              "description": "Classic cut and finish.",
              "duration_minutes": 30,
              "price": 30.0,
          },
          {
              "name": "Blow dry / styling",
              "description": "Wash and style.",
              "duration_minutes": 30,
              "price": 25.0,
          },
      ]
  if key == "barber":
      return [
          {
              "name": "Haircut",
              "description": "Standard men's haircut.",
              "duration_minutes": 30,
              "price": 25.0,
          },
          {
              "name": "Beard trim",
              "description": "Shape and trim beard.",
              "duration_minutes": 20,
              "price": 18.0,
          },
          {
              "name": "Haircut & beard",
              "description": "Combined haircut and beard trim.",
              "duration_minutes": 45,
              "price": 35.0,
          },
      ]
  if key == "vet_clinic":
      return [
          {
              "name": "Consultation",
              "description": "Initial consultation for pets.",
              "duration_minutes": 30,
              "price": 40.0,
          },
          {
              "name": "Vaccination",
              "description": "Standard vaccination appointment.",
              "duration_minutes": 20,
              "price": 35.0,
          },
      ]
  if key == "therapist":
      return [
          {
              "name": "Initial consultation",
              "description": "First time session.",
              "duration_minutes": 60,
              "price": 80.0,
          },
          {
              "name": "Follow-up session",
              "description": "Regular therapy session.",
              "duration_minutes": 50,
              "price": 70.0,
          },
      ]
  if key == "gym":
      return [
          {
              "name": "Personal training session",
              "description": "1:1 personal training.",
              "duration_minutes": 60,
              "price": 50.0,
          },
          {
              "name": "Intro assessment",
              "description": "Fitness assessment and plan.",
              "duration_minutes": 45,
              "price": 40.0,
          },
      ]
  if key == "spa":
      return [
          {
              "name": "Relaxation massage",
              "description": "Full body relaxation massage.",
              "duration_minutes": 60,
              "price": 80.0,
          },
          {
              "name": "Facial treatment",
              "description": "Classic facial.",
              "duration_minutes": 45,
              "price": 70.0,
          },
      ]

  # Generic defaults for other service businesses
  return [
      {
          "name": "Initial consultation",
          "description": "Discovery call or first visit.",
          "duration_minutes": 30,
          "price": 0.0,
      },
      {
          "name": "Standard appointment",
          "description": "Typical session for your service.",
          "duration_minutes": 60,
          "price": 0.0,
      },
  ]


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new service for a business."""
    # Verify business exists and user owns it
    business = db.query(Business).filter(Business.id == service_data.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add services to this business"
        )
    
    new_service = Service(**service_data.dict())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    
    return new_service


@router.get("/business/{business_id}", response_model=List[ServiceResponse])
async def get_business_services(business_id: int, db: Session = Depends(get_db)):
    """Get all services for a business."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    services = db.query(Service).filter(
        Service.business_id == business_id,
        Service.is_active == True
    ).all()
    
    return services


@router.post("/business/{business_id}/starter", response_model=List[ServiceResponse])
async def create_starter_services(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a set of starter services based on the business type.

    Only allowed if the business belongs to the current user (or admin) and
    currently has no active services.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add services to this business",
        )

    if not business.business_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business type must be set before creating starter services",
        )

    existing_count = (
        db.query(Service)
        .filter(Service.business_id == business_id, Service.is_active == True)
        .count()
    )
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business already has active services",
        )

    templates = _get_starter_service_templates(business.business_type)
    services: List[Service] = []

    for tpl in templates:
        svc = Service(
            business_id=business_id,
            name=tpl["name"],
            description=tpl.get("description"),
            duration_minutes=tpl.get("duration_minutes", 60),
            price=tpl.get("price", 0.0),
            is_active=True,
        )
        db.add(svc)
        services.append(svc)

    db.commit()
    for svc in services:
        db.refresh(svc)

    return services


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: Session = Depends(get_db)):
    """Get a service by ID."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    return service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_update: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    business = db.query(Business).filter(Business.id == service.business_id).first()
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this service"
        )
    
    update_data = service_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    db.commit()
    db.refresh(service)
    
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    business = db.query(Business).filter(Business.id == service.business_id).first()
    if business.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this service"
        )
    
    service.is_active = False
    db.commit()
