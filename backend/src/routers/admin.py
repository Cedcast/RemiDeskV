"""Admin routes — superadmin dashboard endpoints."""
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import require_superadmin
from ..billing import PRICING
from ..database import get_db
from ..models import (
    AuditLog, Appointment, Business, Client, NotificationLog,
    Payment, PaymentStatus, Service, Subscription, SubscriptionStatus,
    SubscriptionTier, User, UserRole,
)
from ..schemas import (
    AdminBusinessDetail,
    AdminBusinessListResponse,
    AdminBusinessSummary,
    AdminGrowthStats,
    AdminNotificationItem,
    AdminNotificationListResponse,
    AdminNotificationStats,
    AdminPaymentItem,
    AdminPaymentListResponse,
    AdminPlatformStats,
    AdminRevenueStats,
    AdminSubscriptionItem,
    AdminSubscriptionListResponse,
    AdminSubscriptionSummary,
    AdminUserDetail,
    AdminUserListResponse,
    AdminUserSummary,
    AuditLogListResponse,
    AuditLogResponse,
    BanUserRequest,
    BusinessUpdate,
    MonthlyCount,
    SuspendRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _audit(
    db: Session,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: int,
    details: Optional[str] = None,
    ip: Optional[str] = None,
) -> None:
    """Create an audit log entry for an admin action."""
    log = AuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip,
    )
    db.add(log)
    db.commit()


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting forwarded headers."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _monthly_counts(query_results) -> list[MonthlyCount]:
    """Aggregate SQLAlchemy results into monthly counts."""
    counts: dict = defaultdict(int)
    for row in query_results:
        key = row.created_at.strftime("%Y-%m")
        counts[key] += 1
    return [MonthlyCount(month=k, count=v) for k, v in sorted(counts.items())]


# ---------------------------------------------------------------------------
# Platform Stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=AdminPlatformStats)
async def get_platform_stats(
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Return platform-wide KPI statistics."""
    total_users = db.query(User).count()
    total_businesses = db.query(Business).count()
    total_appointments = db.query(Appointment).count()

    # Revenue: sum of completed payments in USD cents (all currencies summed as-is)
    total_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.status == PaymentStatus.COMPLETED)
        .scalar()
        or 0
    )

    active_subs = (
        db.query(Subscription)
        .filter(Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]))
        .count()
    )

    trial_users = (
        db.query(Subscription)
        .filter(Subscription.tier == SubscriptionTier.FREE_TRIAL)
        .count()
    )

    notifications_sent = (
        db.query(NotificationLog).filter(NotificationLog.status == "sent").count()
    )
    notifications_failed = (
        db.query(NotificationLog).filter(NotificationLog.status == "failed").count()
    )

    return AdminPlatformStats(
        total_users=total_users,
        total_businesses=total_businesses,
        total_appointments=total_appointments,
        total_revenue_usd_cents=total_revenue,
        active_subscriptions=active_subs,
        trial_users=trial_users,
        notifications_sent=notifications_sent,
        notifications_failed=notifications_failed,
    )


@router.get("/stats/growth", response_model=AdminGrowthStats)
async def get_growth_stats(
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Return 12-month growth trend for users, businesses, and appointments."""
    twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)

    users = (
        db.query(User)
        .filter(User.created_at >= twelve_months_ago)
        .all()
    )
    businesses = (
        db.query(Business)
        .filter(Business.created_at >= twelve_months_ago)
        .all()
    )
    appointments = (
        db.query(Appointment)
        .filter(Appointment.created_at >= twelve_months_ago)
        .all()
    )

    return AdminGrowthStats(
        monthly_signups=_monthly_counts(users),
        monthly_businesses=_monthly_counts(businesses),
        monthly_appointments=_monthly_counts(appointments),
    )


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------

def _user_to_summary(user: User) -> AdminUserSummary:
    sub = user.subscription
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        subscription_tier=sub.tier.value if sub else None,
        subscription_status=sub.status.value if sub else None,
        created_at=user.created_at,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all users with optional search and filters."""
    q = db.query(User)

    if search:
        like = f"%{search}%"
        q = q.filter(
            (User.email.ilike(like)) | (User.full_name.ilike(like))
        )
    if role:
        try:
            q = q.filter(User.role == UserRole(role))
        except ValueError:
            pass
    if is_active is not None:
        q = q.filter(User.is_active == is_active)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return AdminUserListResponse(
        items=[_user_to_summary(u) for u in users],
        total=total,
        page=page,
        size=size,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: int,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Get full user detail including businesses, subscription, and recent payments."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sub = user.subscription
    businesses = [
        {
            "id": b.id,
            "name": b.name,
            "city": b.city,
            "country": b.country,
            "is_active": b.is_active,
            "created_at": b.created_at.isoformat(),
        }
        for b in user.businesses
    ]
    recent_payments = [
        {
            "id": p.id,
            "amount": p.amount,
            "currency": p.currency,
            "provider": p.provider.value,
            "status": p.status.value,
            "description": p.description,
            "created_at": p.created_at.isoformat(),
        }
        for p in sorted(user.payments, key=lambda p: p.created_at, reverse=True)[:10]
    ]

    return AdminUserDetail(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        suspended_at=user.suspended_at,
        suspension_reason=user.suspension_reason,
        created_at=user.created_at,
        subscription_tier=sub.tier.value if sub else None,
        subscription_status=sub.status.value if sub else None,
        businesses=businesses,
        recent_payments=recent_payments,
    )


@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    body: BanUserRequest,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Ban (deactivate) a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    user.is_active = False
    user.suspended_at = datetime.now(timezone.utc)
    user.suspension_reason = body.reason
    db.commit()

    _audit(
        db, admin.id, "user_banned", "user", user_id,
        details=json.dumps({"reason": body.reason, "email": user.email}),
        ip=_get_client_ip(request),
    )
    return {"detail": f"User {user.email} has been banned"}


@router.patch("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Unban (reactivate) a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    user.suspended_at = None
    user.suspension_reason = None
    db.commit()

    _audit(
        db, admin.id, "user_unbanned", "user", user_id,
        details=json.dumps({"email": user.email}),
        ip=_get_client_ip(request),
    )
    return {"detail": f"User {user.email} has been unbanned"}


# ---------------------------------------------------------------------------
# Business Management
# ---------------------------------------------------------------------------

def _business_to_summary(b: Business, db: Session) -> AdminBusinessSummary:
    appointment_count = (
        db.query(Appointment).filter(Appointment.business_id == b.id).count()
    )
    owner = b.owner
    return AdminBusinessSummary(
        id=b.id,
        name=b.name,
        owner_id=b.owner_id,
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        city=b.city,
        country=b.country,
        is_active=b.is_active,
        suspended_at=b.suspended_at,
        appointment_count=appointment_count,
        created_at=b.created_at,
    )


@router.get("/businesses", response_model=AdminBusinessListResponse)
async def list_businesses(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    country: Optional[str] = None,
    is_active: Optional[bool] = None,
    suspended: Optional[bool] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all businesses with optional filters."""
    q = db.query(Business)

    if search:
        q = q.filter(Business.name.ilike(f"%{search}%"))
    if country:
        q = q.filter(Business.country.ilike(f"%{country}%"))
    if is_active is not None:
        q = q.filter(Business.is_active == is_active)
    if suspended is True:
        q = q.filter(Business.suspended_at.isnot(None))
    elif suspended is False:
        q = q.filter(Business.suspended_at.is_(None))

    total = q.count()
    businesses = (
        q.order_by(Business.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return AdminBusinessListResponse(
        items=[_business_to_summary(b, db) for b in businesses],
        total=total,
        page=page,
        size=size,
    )


@router.get("/businesses/{business_id}", response_model=AdminBusinessDetail)
async def get_business_detail(
    business_id: int,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Get full business detail."""
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    owner = b.owner
    appointment_count = db.query(Appointment).filter(Appointment.business_id == b.id).count()
    client_count = db.query(Client).filter(Client.business_id == b.id).count()
    service_count = db.query(Service).filter(Service.business_id == b.id).count()

    return AdminBusinessDetail(
        id=b.id,
        name=b.name,
        description=b.description,
        address=b.address,
        city=b.city,
        state=b.state,
        zip_code=b.zip_code,
        country=b.country,
        phone=b.phone,
        email=b.email,
        website=b.website,
        timezone=b.timezone,
        is_active=b.is_active,
        suspended_at=b.suspended_at,
        suspension_reason=b.suspension_reason,
        owner_id=b.owner_id,
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        appointment_count=appointment_count,
        client_count=client_count,
        service_count=service_count,
        created_at=b.created_at,
    )


@router.put("/businesses/{business_id}", response_model=AdminBusinessDetail)
async def update_business(
    business_id: int,
    body: BusinessUpdate,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Edit business fields."""
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = body.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(b, field, value)
    db.commit()
    db.refresh(b)

    _audit(
        db, admin.id, "business_updated", "business", business_id,
        details=json.dumps({"fields": list(update_data.keys())}),
        ip=_get_client_ip(request),
    )

    owner = b.owner
    appointment_count = db.query(Appointment).filter(Appointment.business_id == b.id).count()
    client_count = db.query(Client).filter(Client.business_id == b.id).count()
    service_count = db.query(Service).filter(Service.business_id == b.id).count()

    return AdminBusinessDetail(
        id=b.id,
        name=b.name,
        description=b.description,
        address=b.address,
        city=b.city,
        state=b.state,
        zip_code=b.zip_code,
        country=b.country,
        phone=b.phone,
        email=b.email,
        website=b.website,
        timezone=b.timezone,
        is_active=b.is_active,
        suspended_at=b.suspended_at,
        suspension_reason=b.suspension_reason,
        owner_id=b.owner_id,
        owner_name=owner.full_name if owner else None,
        owner_email=owner.email if owner else None,
        appointment_count=appointment_count,
        client_count=client_count,
        service_count=service_count,
        created_at=b.created_at,
    )


@router.delete("/businesses/{business_id}")
async def delete_business(
    business_id: int,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Soft-delete a business (set is_active=False)."""
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    b.is_active = False
    b.suspended_at = datetime.now(timezone.utc)
    db.commit()

    _audit(
        db, admin.id, "business_deleted", "business", business_id,
        details=json.dumps({"name": b.name}),
        ip=_get_client_ip(request),
    )
    return {"detail": f"Business '{b.name}' has been soft-deleted"}


@router.patch("/businesses/{business_id}/suspend")
async def suspend_business(
    business_id: int,
    body: SuspendRequest,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Suspend a business."""
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    b.suspended_at = datetime.now(timezone.utc)
    b.suspension_reason = body.reason
    b.is_active = False
    db.commit()

    _audit(
        db, admin.id, "business_suspended", "business", business_id,
        details=json.dumps({"reason": body.reason, "name": b.name}),
        ip=_get_client_ip(request),
    )
    return {"detail": f"Business '{b.name}' has been suspended"}


@router.patch("/businesses/{business_id}/reinstate")
async def reinstate_business(
    business_id: int,
    request: Request,
    admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Reinstate a suspended business."""
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    b.suspended_at = None
    b.suspension_reason = None
    b.is_active = True
    db.commit()

    _audit(
        db, admin.id, "business_reinstated", "business", business_id,
        details=json.dumps({"name": b.name}),
        ip=_get_client_ip(request),
    )
    return {"detail": f"Business '{b.name}' has been reinstated"}


# ---------------------------------------------------------------------------
# Subscription & Payment Tracking
# ---------------------------------------------------------------------------

@router.get("/subscriptions/summary", response_model=AdminSubscriptionSummary)
async def get_subscription_summary(
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Return subscription counts by tier/status and MRR calculation."""
    free_trial_count = (
        db.query(Subscription)
        .filter(Subscription.tier == SubscriptionTier.FREE_TRIAL)
        .count()
    )
    premium_count = (
        db.query(Subscription)
        .filter(Subscription.tier == SubscriptionTier.PREMIUM)
        .count()
    )
    pro_count = (
        db.query(Subscription)
        .filter(Subscription.tier == SubscriptionTier.PRO)
        .count()
    )
    expired_count = (
        db.query(Subscription)
        .filter(Subscription.tier == SubscriptionTier.TRIAL_EXPIRED)
        .count()
    )

    # MRR: sum pricing for all active paid subscriptions grouped by currency
    active_paid = (
        db.query(Subscription)
        .filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.tier.in_([SubscriptionTier.PREMIUM, SubscriptionTier.PRO]),
        )
        .all()
    )
    mrr: dict = defaultdict(int)
    for sub in active_paid:
        tier_key = sub.tier.value  # "premium" or "pro"
        currency = sub.currency
        price_info = PRICING.get(tier_key, {}).get(currency)
        if price_info:
            mrr[currency] += price_info["amount"]

    return AdminSubscriptionSummary(
        free_trial_count=free_trial_count,
        premium_count=premium_count,
        pro_count=pro_count,
        expired_count=expired_count,
        total_mrr=dict(mrr),
    )


@router.get("/subscriptions", response_model=AdminSubscriptionListResponse)
async def list_subscriptions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    tier: Optional[str] = None,
    status: Optional[str] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all subscriptions with user info."""
    q = db.query(Subscription)

    if tier:
        try:
            q = q.filter(Subscription.tier == SubscriptionTier(tier))
        except ValueError:
            pass
    if status:
        try:
            q = q.filter(Subscription.status == SubscriptionStatus(status))
        except ValueError:
            pass

    total = q.count()
    subs = q.order_by(Subscription.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for s in subs:
        user = s.user
        items.append(
            AdminSubscriptionItem(
                id=s.id,
                user_id=s.user_id,
                user_name=user.full_name if user else None,
                user_email=user.email if user else None,
                tier=s.tier.value,
                status=s.status.value,
                currency=s.currency,
                trial_ends_at=s.trial_ends_at,
                current_period_end=s.current_period_end,
                created_at=s.created_at,
            )
        )

    return AdminSubscriptionListResponse(items=items, total=total, page=page, size=size)


@router.get("/payments", response_model=AdminPaymentListResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    provider: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all payments across the platform."""
    q = db.query(Payment)

    if provider:
        q = q.filter(Payment.provider.ilike(provider))
    if status:
        try:
            from ..models import PaymentStatus as PS
            q = q.filter(Payment.status == PS(status))
        except ValueError:
            pass
    if date_from:
        try:
            q = q.filter(Payment.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(Payment.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = q.count()
    payments = q.order_by(Payment.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for p in payments:
        user = p.user
        items.append(
            AdminPaymentItem(
                id=p.id,
                user_id=p.user_id,
                user_name=user.full_name if user else None,
                user_email=user.email if user else None,
                provider=p.provider.value,
                status=p.status.value,
                amount=p.amount,
                currency=p.currency,
                description=p.description,
                created_at=p.created_at,
            )
        )

    return AdminPaymentListResponse(items=items, total=total, page=page, size=size)


@router.get("/payments/revenue", response_model=AdminRevenueStats)
async def get_revenue_stats(
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Monthly revenue aggregation by currency and provider."""
    twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)
    completed_payments = (
        db.query(Payment)
        .filter(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= twelve_months_ago,
        )
        .all()
    )

    monthly: dict = defaultdict(int)
    by_currency: dict = defaultdict(int)
    by_provider: dict = defaultdict(int)

    for p in completed_payments:
        month_key = p.created_at.strftime("%Y-%m")
        monthly[month_key] += p.amount
        by_currency[p.currency] += p.amount
        by_provider[p.provider.value] += p.amount

    monthly_revenue = [
        MonthlyCount(month=k, count=v) for k, v in sorted(monthly.items())
    ]

    return AdminRevenueStats(
        monthly_revenue=monthly_revenue,
        total_by_currency=dict(by_currency),
        total_by_provider=dict(by_provider),
    )


# ---------------------------------------------------------------------------
# Notification Monitoring
# ---------------------------------------------------------------------------

@router.get("/notifications/stats", response_model=AdminNotificationStats)
async def get_notification_stats(
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Aggregate notification delivery statistics."""
    total_sent = db.query(NotificationLog).filter(NotificationLog.status == "sent").count()
    total_failed = db.query(NotificationLog).filter(NotificationLog.status == "failed").count()
    total = total_sent + total_failed

    by_channel: dict = defaultdict(int)
    all_logs = db.query(NotificationLog).all()
    for log in all_logs:
        by_channel[log.channel] += 1

    delivery_rate = (total_sent / total * 100) if total > 0 else 0.0

    return AdminNotificationStats(
        total_sent=total_sent,
        total_failed=total_failed,
        by_channel=dict(by_channel),
        delivery_rate_percent=round(delivery_rate, 1),
    )


@router.get("/notifications/failures", response_model=AdminNotificationListResponse)
async def get_notification_failures(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List recent notification failures for debugging."""
    q = db.query(NotificationLog).filter(NotificationLog.status == "failed")
    total = q.count()
    logs = q.order_by(NotificationLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = [
        AdminNotificationItem(
            id=log.id,
            appointment_id=log.appointment_id,
            channel=log.channel,
            notification_type=log.notification_type,
            recipient=log.recipient,
            status=log.status,
            sent_at=log.sent_at,
            error_message=log.error_message,
            created_at=log.created_at,
        )
        for log in logs
    ]
    return AdminNotificationListResponse(items=items, total=total, page=page, size=size)


@router.get("/notifications", response_model=AdminNotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    channel: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List notification logs with optional filters."""
    q = db.query(NotificationLog)

    if channel:
        q = q.filter(NotificationLog.channel == channel)
    if status:
        q = q.filter(NotificationLog.status == status)
    if date_from:
        try:
            q = q.filter(NotificationLog.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(NotificationLog.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = q.count()
    logs = (
        q.order_by(NotificationLog.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = [
        AdminNotificationItem(
            id=log.id,
            appointment_id=log.appointment_id,
            channel=log.channel,
            notification_type=log.notification_type,
            recipient=log.recipient,
            status=log.status,
            sent_at=log.sent_at,
            error_message=log.error_message,
            created_at=log.created_at,
        )
        for log in logs
    ]
    return AdminNotificationListResponse(items=items, total=total, page=page, size=size)


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

@router.get("/audit-log", response_model=AuditLogListResponse)
async def get_audit_log(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    admin_id: Optional[int] = None,
    target_type: Optional[str] = None,
    _admin: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Return paginated audit trail of all admin actions."""
    q = db.query(AuditLog)

    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if admin_id:
        q = q.filter(AuditLog.admin_id == admin_id)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for log in logs:
        admin_user = log.admin
        items.append(
            AuditLogResponse(
                id=log.id,
                admin_id=log.admin_id,
                admin_name=admin_user.full_name if admin_user else None,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                ip_address=log.ip_address,
                created_at=log.created_at,
            )
        )

    return AuditLogListResponse(items=items, total=total, page=page, size=size)
