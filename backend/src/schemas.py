"""Pydantic schemas for API request/response validation."""
from datetime import datetime, time
from typing import Optional, List, Dict, Any
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
    """Schema for creating a new user (always business_owner)."""
    password: str
    role: UserRole = UserRole.BUSINESS_OWNER

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


# ============ Client Schemas ============

class ClientBase(BaseModel):
    """Base client schema."""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    business_id: int


class ClientUpdate(BaseModel):
    """Schema for updating a client."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    """Schema for client response."""
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ClientListResponse(BaseModel):
    """Schema for listing clients with pagination."""
    clients: List[ClientResponse]
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


# ============ Notification Channel Schemas ============

class NotificationChannels(BaseModel):
    """Notification channel preferences."""
    email: bool = True
    sms: bool = False
    whatsapp: bool = False


# ============ Appointment Schemas ============

class AppointmentBase(BaseModel):
    """Base appointment schema."""
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment (business owner only)."""
    business_id: int
    # Client can be referenced by ID or provided inline (creates/updates client record)
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    # Service can be referenced by ID or provided as free text
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    notification_channels: NotificationChannels = NotificationChannels()

    @validator('end_time')
    def end_after_start(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    service_name: Optional[str] = None
    notes: Optional[str] = None
    notification_channels: Optional[NotificationChannels] = None


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status."""
    status: AppointmentStatus
    cancellation_reason: Optional[str] = None


class AppointmentResponse(BaseModel):
    """Schema for appointment response."""
    id: int
    business_id: int
    client_id: Optional[int]
    service_id: Optional[int]
    service_name: Optional[str]
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    notes: Optional[str]
    cancellation_reason: Optional[str]
    notification_channels: Optional[str]
    reschedule_token: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class AppointmentDetailResponse(AppointmentResponse):
    """Schema for detailed appointment response with related data."""
    business: BusinessResponse
    client: Optional[ClientResponse]
    service: Optional[ServiceResponse]

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


# ============ Dashboard / Analytics Schemas ============

class StatusBreakdown(BaseModel):
    """Appointment count by status."""
    pending: int = 0
    confirmed: int = 0
    completed: int = 0
    cancelled: int = 0
    no_show: int = 0
    rescheduled: int = 0


class MonthlyCount(BaseModel):
    """Appointment count for a specific month."""
    month: str  # e.g. "2026-03"
    count: int


class DashboardStats(BaseModel):
    """Schema for dashboard statistics."""
    total_appointments: int
    this_month_appointments: int
    this_year_appointments: int
    upcoming_appointments: int
    past_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    rescheduled_appointments: int
    status_breakdown: StatusBreakdown
    total_clients: int
    average_duration_minutes: float
    monthly_trend: List[MonthlyCount]


# ============ Reschedule Portal Schemas ============

class ReschedulePublicResponse(BaseModel):
    """Public appointment info returned by the reschedule-token endpoint."""

    id: int
    business_name: str
    service_name: Optional[str]
    client_name: Optional[str]
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    # Token is NOT returned to the client for security reasons

    class Config:
        orm_mode = True


class RescheduleRequest(BaseModel):
    """Request body for a client reschedule submission."""

    new_start_time: datetime
    new_end_time: datetime

    @validator("new_end_time")
    def end_after_start(cls, v, values):
        if "new_start_time" in values and v <= values["new_start_time"]:
            raise ValueError("new_end_time must be after new_start_time")
        return v


# ============ Admin Schemas ============

class AdminPlatformStats(BaseModel):
    """Platform-wide KPI statistics for superadmin dashboard."""
    total_users: int
    total_businesses: int
    total_appointments: int
    total_revenue_usd_cents: int
    active_subscriptions: int
    trial_users: int
    notifications_sent: int
    notifications_failed: int


class AdminGrowthStats(BaseModel):
    """Monthly growth trend for superadmin dashboard."""
    monthly_signups: List[MonthlyCount]
    monthly_businesses: List[MonthlyCount]
    monthly_appointments: List[MonthlyCount]


class AdminUserSummary(BaseModel):
    """User summary used in admin user list."""
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AdminUserListResponse(BaseModel):
    """Paginated user list response for admin."""
    items: List[AdminUserSummary]
    total: int
    page: int
    size: int


class AdminUserDetail(BaseModel):
    """Full user detail for admin view."""
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    suspended_at: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    created_at: datetime
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    businesses: List[Any] = []
    recent_payments: List[Any] = []

    class Config:
        orm_mode = True


class AdminBusinessSummary(BaseModel):
    """Business summary used in admin business list."""
    id: int
    name: str
    owner_id: int
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_active: bool
    suspended_at: Optional[datetime] = None
    appointment_count: int = 0
    created_at: datetime

    class Config:
        orm_mode = True


class AdminBusinessListResponse(BaseModel):
    """Paginated business list response for admin."""
    items: List[AdminBusinessSummary]
    total: int
    page: int
    size: int


class AdminBusinessDetail(BaseModel):
    """Full business detail for admin view."""
    id: int
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    is_active: bool
    suspended_at: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    owner_id: int
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    appointment_count: int = 0
    client_count: int = 0
    service_count: int = 0
    created_at: datetime

    class Config:
        orm_mode = True


class AdminSubscriptionSummary(BaseModel):
    """Platform-wide subscription summary."""
    free_trial_count: int
    premium_count: int
    pro_count: int
    expired_count: int
    total_mrr: Dict[str, int]  # currency -> amount in minor units


class AdminSubscriptionItem(BaseModel):
    """Subscription entry in admin list."""
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    tier: str
    status: str
    currency: str
    trial_ends_at: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AdminSubscriptionListResponse(BaseModel):
    """Paginated subscription list for admin."""
    items: List[AdminSubscriptionItem]
    total: int
    page: int
    size: int


class AdminPaymentItem(BaseModel):
    """Payment entry in admin ledger."""
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    provider: str
    status: str
    amount: int
    currency: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AdminPaymentListResponse(BaseModel):
    """Paginated payment list for admin."""
    items: List[AdminPaymentItem]
    total: int
    page: int
    size: int


class AdminRevenueStats(BaseModel):
    """Revenue statistics for admin."""
    monthly_revenue: List[MonthlyCount]
    total_by_currency: Dict[str, int]
    total_by_provider: Dict[str, int]


class AdminNotificationStats(BaseModel):
    """Platform-wide notification statistics."""
    total_sent: int
    total_failed: int
    by_channel: Dict[str, int]
    delivery_rate_percent: float


class AdminNotificationItem(BaseModel):
    """Notification log entry for admin."""
    id: int
    appointment_id: int
    channel: str
    notification_type: str
    recipient: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AdminNotificationListResponse(BaseModel):
    """Paginated notification log for admin."""
    items: List[AdminNotificationItem]
    total: int
    page: int
    size: int


class AuditLogResponse(BaseModel):
    """Audit log entry with admin info."""
    id: int
    admin_id: int
    admin_name: Optional[str] = None
    action: str
    target_type: str
    target_id: int
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AuditLogListResponse(BaseModel):
    """Paginated audit log response."""
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int


class SuspendRequest(BaseModel):
    """Request body for suspend actions."""
    reason: Optional[str] = None


class BanUserRequest(BaseModel):
    """Request body for ban user action."""
    reason: Optional[str] = None
