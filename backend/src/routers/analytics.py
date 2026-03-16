"""Analytics routes — business owner dashboard statistics."""
from typing import Optional
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Business, Appointment, Client, AppointmentStatus, UserRole
from ..schemas import DashboardStats, StatusBreakdown, MonthlyCount
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
