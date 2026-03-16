"""Pydantic schemas for API request/response validation."""
from datetime import datetime, time
from typing import Optional, List
from pydantic import BaseModel, EmailStr, validator
from .models import UserRole, AppointmentStatus


# ============ Token Schemas ============

class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    email: Optional[str] = None
    user_id: Optional[int] = None


# ============ User Schemas ============

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str
    role: UserRole = UserRole.CUSTOMER

    @validator('password')
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        orm_mode = True


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


# ============ Business Schemas ============

class BusinessBase(BaseModel):
    """Base business schema."""
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "USA"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: str = "America/New_York"


class BusinessCreate(BusinessBase):
    """Schema for creating a new business."""
    pass


class BusinessUpdate(BaseModel):
    """Schema for updating a business."""
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


class BusinessResponse(BusinessBase):
    """Schema for business response."""
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class BusinessListResponse(BaseModel):
    """Schema for listing businesses with pagination."""
    businesses: List[BusinessResponse]
    total: int
    page: int
    size: int


# ============ Service Schemas ============

class ServiceBase(BaseModel):
    """Base service schema."""
    name: str
    description: Optional[str] = None
    duration_minutes: int = 60
    price: float = 0.0


class ServiceCreate(ServiceBase):
    """Schema for creating a new service."""
    business_id: int


class ServiceUpdate(BaseModel):
    """Schema for updating a service."""
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None


class ServiceResponse(ServiceBase):
    """Schema for service response."""
    id: int
    business_id: int
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ============ Schedule Schemas ============

class ScheduleBase(BaseModel):
    """Base schedule schema."""
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    is_available: bool = True

    @validator('day_of_week')
    def validate_day_of_week(cls, v):
        if v < 0 or v > 6:
            raise ValueError('day_of_week must be between 0 (Monday) and 6 (Sunday)')
        return v


class ScheduleCreate(ScheduleBase):
    """Schema for creating a new schedule."""
    business_id: int


class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule."""
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_available: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    """Schema for schedule response."""
    id: int
    business_id: int
    created_at: datetime

    class Config:
        orm_mode = True


# ============ Appointment Schemas ============

class AppointmentBase(BaseModel):
    """Base appointment schema."""
    service_id: int
    start_time: datetime
    customer_notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""
    business_id: int


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    start_time: Optional[datetime] = None
    notes: Optional[str] = None
    customer_notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status."""
    status: AppointmentStatus
    cancellation_reason: Optional[str] = None


class AppointmentResponse(BaseModel):
    """Schema for appointment response."""
    id: int
    business_id: int
    customer_id: int
    service_id: int
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    notes: Optional[str]
    customer_notes: Optional[str]
    cancellation_reason: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class AppointmentDetailResponse(AppointmentResponse):
    """Schema for detailed appointment response with related data."""
    business: BusinessResponse
    service: ServiceResponse
    customer: UserResponse

    class Config:
        orm_mode = True


class AppointmentListResponse(BaseModel):
    """Schema for listing appointments with pagination."""
    appointments: List[AppointmentResponse]
    total: int
    page: int
    size: int


# ============ Time Slot Schemas ============

class TimeSlot(BaseModel):
    """Schema for an available time slot."""
    start_time: datetime
    end_time: datetime


class AvailableSlotsResponse(BaseModel):
    """Schema for available time slots response."""
    date: str
    slots: List[TimeSlot]


# ============ Dashboard Schemas ============

class DashboardStats(BaseModel):
    """Schema for dashboard statistics."""
    total_appointments: int
    upcoming_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    total_revenue: float
    total_customers: int
