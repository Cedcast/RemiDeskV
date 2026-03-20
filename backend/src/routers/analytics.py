"""Analytics routes — business owner dashboard statistics."""
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Appointment, Client, AppointmentStatus, UserRole
from ..schemas import (
    DashboardStats,
    StatusBreakdown,
    MonthlyCount,
    RescheduleInsightsResponse,
    RescheduleServiceBreakdown,
    RescheduleDowBreakdown,
    RescheduleRecentItem,
)
from ..auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _require_business_owner(current_user: User) -> User:
    if current_user.role not in (UserRole.BUSINESS_OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Business owners only")
    return current_user


@router.get("/stats", response_model=DashboardStats)
async def get_analytics_stats(
    business_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return comprehensive analytics statistics for the dashboard."""
    _require_business_owner(current_user)

    # Determine which businesses to include
    if business_id:
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business or (
            business.owner_id != current_user.id
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(status_code=403, detail="Not authorized")
        business_ids = [business_id]
    else:
        business_ids = [
            b.id
            for b in db.query(Business).filter(Business.owner_id == current_user.id).all()
        ]

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    base_q = db.query(Appointment).filter(Appointment.business_id.in_(business_ids))

    total = base_q.count()
    this_month = base_q.filter(Appointment.created_at >= month_start).count()
    this_year = base_q.filter(Appointment.created_at >= year_start).count()

    upcoming = base_q.filter(
        Appointment.start_time > now,
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]),
    ).count()

    past = base_q.filter(Appointment.start_time <= now).count()

    # Status breakdown
    def _count(s):
        return base_q.filter(Appointment.status == s).count()

    breakdown = StatusBreakdown(
        pending=_count(AppointmentStatus.PENDING),
        confirmed=_count(AppointmentStatus.CONFIRMED),
        completed=_count(AppointmentStatus.COMPLETED),
        cancelled=_count(AppointmentStatus.CANCELLED),
        no_show=_count(AppointmentStatus.NO_SHOW),
        rescheduled=_count(AppointmentStatus.RESCHEDULED),
    )

    # Average duration
    all_appts = base_q.all()
    if all_appts:
        total_minutes = sum(
            (a.end_time - a.start_time).total_seconds() / 60 for a in all_appts
        )
        avg_duration = total_minutes / len(all_appts)
    else:
        avg_duration = 0.0

    # Monthly trend (last 12 months)
    twelve_months_ago = now - timedelta(days=365)
    monthly_appts = base_q.filter(Appointment.created_at >= twelve_months_ago).all()
    monthly_counts: dict = defaultdict(int)
    for a in monthly_appts:
        key = a.created_at.strftime("%Y-%m")
        monthly_counts[key] += 1
    monthly_trend = [
        MonthlyCount(month=k, count=v)
        for k, v in sorted(monthly_counts.items())
    ]

    # Total unique clients
    total_clients = (
        db.query(Client)
        .filter(Client.business_id.in_(business_ids))
        .count()
    )

    return DashboardStats(
        total_appointments=total,
        this_month_appointments=this_month,
        this_year_appointments=this_year,
        upcoming_appointments=upcoming,
        past_appointments=past,
        completed_appointments=breakdown.completed,
        cancelled_appointments=breakdown.cancelled,
        rescheduled_appointments=breakdown.rescheduled,
        status_breakdown=breakdown,
        total_clients=total_clients,
        average_duration_minutes=round(avg_duration, 1),
        monthly_trend=monthly_trend,
    )


@router.get("/reschedules", response_model=RescheduleInsightsResponse)
async def get_reschedule_insights(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back for reschedules"),
    business_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return reschedule-focused insights for the owner's businesses.

    Uses appointments with status=RESCHEDULED whose updated_at falls within the
    requested window as a proxy for "rescheduled in this period".
    """
    _require_business_owner(current_user)

    # Determine which businesses to include
    if business_id:
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business or (
            business.owner_id != current_user.id
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(status_code=403, detail="Not authorized")
        business_ids: List[int] = [business_id]
    else:
        business_ids = [
            b.id
            for b in db.query(Business).filter(Business.owner_id == current_user.id).all()
        ]

    if not business_ids:
        # No businesses yet: return empty insights
        return RescheduleInsightsResponse(
            total_rescheduled=0,
            reschedule_rate=0.0,
            unique_clients=0,
            avg_days_before_reschedule=0.0,
            no_show_after_reschedule=0,
            total_appointments_in_range=0,
            service_breakdown=[],
            dow_breakdown=[],
            recent_reschedules=[],
        )

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    # Base queries
    base_q = db.query(Appointment).filter(Appointment.business_id.in_(business_ids))
    in_range_q = base_q.filter(Appointment.start_time >= window_start, Appointment.start_time <= now)

    total_in_range = in_range_q.count()

    # Rescheduled appointments in range — use updated_at window and RESCHEDULED status
    rescheduled_q = (
        base_q.filter(
            Appointment.status == AppointmentStatus.RESCHEDULED,
            Appointment.updated_at >= window_start,
            Appointment.updated_at <= now,
        )
        .order_by(Appointment.updated_at.desc())
    )

    rescheduled_appts: List[Appointment] = rescheduled_q.all()
    total_rescheduled = len(rescheduled_appts)

    # Unique clients who rescheduled
    client_ids = {a.client_id for a in rescheduled_appts if a.client_id is not None}
    unique_clients = len(client_ids)

    # Average days between original creation and reschedule
    if rescheduled_appts:
        total_days = 0.0
        for a in rescheduled_appts:
            if a.created_at and a.updated_at:
                delta = a.updated_at - a.created_at
                total_days += max(delta.total_seconds(), 0) / 86400.0
        avg_days = total_days / total_rescheduled if total_rescheduled else 0.0
    else:
        avg_days = 0.0

    # No-shows after reschedule
    no_show_after_reschedule = (
        base_q.filter(
            Appointment.status == AppointmentStatus.NO_SHOW,
            Appointment.updated_at >= window_start,
            Appointment.updated_at <= now,
        ).count()
    )

    # Service breakdown
    service_counts: dict[str, int] = defaultdict(int)
    for a in rescheduled_appts:
        name = a.service_name or (a.service.name if a.service else "Appointment")
        service_counts[name] += 1

    service_breakdown = [
        RescheduleServiceBreakdown(service_name=name, count=count)
        for name, count in sorted(service_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Day-of-week breakdown (0=Monday)
    dow_counts: dict[int, int] = defaultdict(int)
    for a in rescheduled_appts:
        if a.updated_at:
            dow_counts[a.updated_at.weekday()] += 1

    dow_breakdown = [
        RescheduleDowBreakdown(day_of_week=dow, count=count)
        for dow, count in sorted(dow_counts.items())
    ]

    # Recent reschedules list (limit 20)
    recent_appts = rescheduled_appts[:20]
    recent_items: List[RescheduleRecentItem] = []
    for a in recent_appts:
        client_name = a.client.name if a.client else None
        service_name = a.service_name or (a.service.name if a.service else None)
        # We don't currently persist original start time separately; expose only current time
        recent_items.append(
            RescheduleRecentItem(
                id=a.id,
                business_id=a.business_id,
                client_name=client_name,
                service_name=service_name,
                original_start_time=None,
                new_start_time=a.start_time,
                status=a.status,
            )
        )

    # Reschedule rate within window
    reschedule_rate = (
        (total_rescheduled / total_in_range) if total_in_range and total_rescheduled else 0.0
    )

    return RescheduleInsightsResponse(
        total_rescheduled=total_rescheduled,
        reschedule_rate=round(reschedule_rate, 4),
        unique_clients=unique_clients,
        avg_days_before_reschedule=round(avg_days, 2),
        no_show_after_reschedule=no_show_after_reschedule,
        total_appointments_in_range=total_in_range,
        service_breakdown=service_breakdown,
        dow_breakdown=dow_breakdown,
        recent_reschedules=recent_items,
    )
