"""Client contact routes — business owner only."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Client, UserRole
from ..schemas import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from ..auth import get_current_user

router = APIRouter(prefix="/clients", tags=["Clients"])


def _require_business_owner(current_user: User) -> User:
    if current_user.role not in (UserRole.BUSINESS_OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Business owners only")
    return current_user


def _get_client_or_404(db: Session, client_id: int, owner_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    business = db.query(Business).filter(Business.id == client.business_id).first()
    if not business or business.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return client


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    business_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all clients for businesses owned by the current user."""
    _require_business_owner(current_user)

    owned_business_ids = [
        b.id for b in db.query(Business).filter(Business.owner_id == current_user.id).all()
    ]

    if business_id:
        if business_id not in owned_business_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
        query = db.query(Client).filter(Client.business_id == business_id)
    else:
        query = db.query(Client).filter(Client.business_id.in_(owned_business_ids))

    if search:
        query = query.filter(
            Client.name.ilike(f"%{search}%")
            | Client.email.ilike(f"%{search}%")
            | Client.phone.ilike(f"%{search}%")
        )

    total = query.count()
    offset = (page - 1) * size
    clients = query.order_by(Client.name).offset(offset).limit(size).all()

    return ClientListResponse(clients=clients, total=total, page=page, size=size)


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new client contact."""
    _require_business_owner(current_user)

    business = db.query(Business).filter(
        Business.id == client_data.business_id,
        Business.owner_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    new_client = Client(**client_data.dict())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a client by ID."""
    _require_business_owner(current_user)
    return _get_client_or_404(db, client_id, current_user.id)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_update: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a client record."""
    _require_business_owner(current_user)
    client = _get_client_or_404(db, client_id, current_user.id)

    for field, value in client_update.dict(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a client record."""
    _require_business_owner(current_user)
    client = _get_client_or_404(db, client_id, current_user.id)
    db.delete(client)
    db.commit()
