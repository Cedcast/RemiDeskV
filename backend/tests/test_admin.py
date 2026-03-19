"""Tests for the superadmin dashboard endpoints."""
import pytest
from src.auth import get_password_hash
from src.models import (
    AuditLog, Business, NotificationLog, Payment,
    PaymentProvider, PaymentStatus, Subscription,
    SubscriptionStatus, SubscriptionTier, User, UserRole,
)


# ---------------------------------------------------------------------------
# Helper fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    """Create a superadmin user directly in the database."""
    admin = User(
        email="superadmin@remidesk.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Super Admin",
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def admin_token(client, admin_user):
    """Get JWT token for the admin user."""
    response = client.post(
        "/api/auth/token",
        json={"email": "superadmin@remidesk.com", "password": "adminpassword123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    """Return authorization headers for the admin user."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def regular_user(db):
    """Create a regular business owner user."""
    user = User(
        email="owner@business.com",
        hashed_password=get_password_hash("ownerpassword123"),
        full_name="Business Owner",
        role=UserRole.BUSINESS_OWNER,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_token(client, regular_user):
    """Get JWT token for the regular user."""
    response = client.post(
        "/api/auth/token",
        json={"email": "owner@business.com", "password": "ownerpassword123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def regular_headers(regular_token):
    """Return authorization headers for the regular user."""
    return {"Authorization": f"Bearer {regular_token}"}


@pytest.fixture
def test_business(db, regular_user):
    """Create a test business."""
    biz = Business(
        owner_id=regular_user.id,
        name="Test Barbershop",
        city="London",
        country="UK",
        is_active=True,
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


@pytest.fixture
def test_subscription(db, regular_user):
    """Create a test subscription for the regular user."""
    sub = Subscription(
        user_id=regular_user.id,
        tier=SubscriptionTier.PREMIUM,
        status=SubscriptionStatus.ACTIVE,
        currency="USD",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@pytest.fixture
def test_payment(db, regular_user, test_subscription):
    """Create a test payment."""
    payment = Payment(
        user_id=regular_user.id,
        subscription_id=test_subscription.id,
        provider=PaymentProvider.PAYSTACK,
        status=PaymentStatus.COMPLETED,
        amount=1200,
        currency="USD",
        description="Premium subscription",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@pytest.fixture
def test_notification(db, test_business):
    """Create a test appointment and notification log."""
    from src.models import Appointment, AppointmentStatus, Client, NotificationLog
    from datetime import datetime, timedelta, timezone

    client = Client(
        business_id=test_business.id,
        name="Test Client",
        email="client@example.com",
        phone="+1234567890",
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    now = datetime.now(timezone.utc)
    appt = Appointment(
        business_id=test_business.id,
        client_id=client.id,
        service_name="Haircut",
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=3),
        status=AppointmentStatus.CONFIRMED,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    log = NotificationLog(
        appointment_id=appt.id,
        channel="email",
        notification_type="confirmation",
        recipient="client@example.com",
        message="Your appointment is confirmed.",
        status="sent",
    )
    db.add(log)

    failed_log = NotificationLog(
        appointment_id=appt.id,
        channel="sms",
        notification_type="reminder_24h",
        recipient="+1234567890",
        message="Reminder",
        status="failed",
        error_message="Invalid phone number",
    )
    db.add(failed_log)
    db.commit()
    return log, failed_log


# ---------------------------------------------------------------------------
# Auth enforcement tests
# ---------------------------------------------------------------------------

class TestAdminAuthEnforcement:
    """Verify that non-admin users cannot access admin endpoints."""

    def test_stats_unauthenticated(self, client):
        response = client.get("/api/admin/stats")
        assert response.status_code == 401

    def test_stats_regular_user(self, client, regular_headers):
        response = client.get("/api/admin/stats", headers=regular_headers)
        assert response.status_code == 403
        assert "Superadmin" in response.json()["detail"]

    def test_users_list_regular_user(self, client, regular_headers):
        response = client.get("/api/admin/users", headers=regular_headers)
        assert response.status_code == 403

    def test_businesses_list_regular_user(self, client, regular_headers):
        response = client.get("/api/admin/businesses", headers=regular_headers)
        assert response.status_code == 403

    def test_audit_log_regular_user(self, client, regular_headers):
        response = client.get("/api/admin/audit-log", headers=regular_headers)
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Platform Stats
# ---------------------------------------------------------------------------

class TestPlatformStats:
    """Tests for the platform statistics endpoints."""

    def test_get_stats_empty(self, client, admin_headers):
        response = client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_businesses" in data
        assert "total_appointments" in data
        assert "active_subscriptions" in data
        assert "trial_users" in data
        assert "notifications_sent" in data
        assert "notifications_failed" in data

    def test_get_stats_counts_users(self, client, admin_headers, regular_user):
        response = client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # At least the admin + regular user
        assert data["total_users"] >= 2

    def test_get_stats_counts_revenue(self, client, admin_headers, test_payment):
        response = client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_revenue_usd_cents"] >= 1200

    def test_get_growth_stats(self, client, admin_headers, regular_user):
        response = client.get("/api/admin/stats/growth", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "monthly_signups" in data
        assert "monthly_businesses" in data
        assert "monthly_appointments" in data
        assert isinstance(data["monthly_signups"], list)


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------

class TestAdminUserManagement:
    """Tests for user management endpoints."""

    def test_list_users(self, client, admin_headers, regular_user):
        response = client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert data["total"] >= 2  # admin + regular_user

    def test_list_users_search_by_email(self, client, admin_headers, regular_user):
        response = client.get(
            "/api/admin/users?search=owner@business.com", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(u["email"] == "owner@business.com" for u in data["items"])

    def test_list_users_filter_by_role(self, client, admin_headers, regular_user):
        response = client.get(
            "/api/admin/users?role=business_owner", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for user in data["items"]:
            assert user["role"] == "business_owner"

    def test_list_users_filter_by_active(self, client, admin_headers, regular_user):
        response = client.get(
            "/api/admin/users?is_active=true", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for user in data["items"]:
            assert user["is_active"] is True

    def test_get_user_detail(self, client, admin_headers, regular_user):
        response = client.get(
            f"/api/admin/users/{regular_user.id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == regular_user.id
        assert data["email"] == regular_user.email
        assert "businesses" in data
        assert "recent_payments" in data

    def test_get_user_detail_not_found(self, client, admin_headers):
        response = client.get("/api/admin/users/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_ban_user(self, client, admin_headers, regular_user):
        response = client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Violation of terms"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "banned" in response.json()["detail"].lower()

    def test_ban_user_creates_audit_log(self, client, admin_headers, regular_user, db):
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test ban"},
            headers=admin_headers,
        )
        log = db.query(AuditLog).filter(AuditLog.action == "user_banned").first()
        assert log is not None
        assert log.target_id == regular_user.id
        assert log.target_type == "user"

    def test_unban_user(self, client, admin_headers, regular_user, db):
        # First ban
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test"},
            headers=admin_headers,
        )
        # Then unban (need fresh token since user is inactive)
        # Directly update via DB to avoid auth issues
        user = db.query(User).filter(User.id == regular_user.id).first()
        user.is_active = False
        db.commit()

        response = client.patch(
            f"/api/admin/users/{regular_user.id}/unban",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "unbanned" in response.json()["detail"].lower()

    def test_unban_creates_audit_log(self, client, admin_headers, regular_user, db):
        client.patch(
            f"/api/admin/users/{regular_user.id}/unban",
            headers=admin_headers,
        )
        log = db.query(AuditLog).filter(AuditLog.action == "user_unbanned").first()
        assert log is not None

    def test_ban_self_is_forbidden(self, client, admin_headers, admin_user):
        response = client.patch(
            f"/api/admin/users/{admin_user.id}/ban",
            json={"reason": "Self-ban"},
            headers=admin_headers,
        )
        assert response.status_code == 400

    def test_get_user_with_subscription(self, client, admin_headers, regular_user, test_subscription):
        response = client.get(
            f"/api/admin/users/{regular_user.id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subscription_tier"] == "premium"
        assert data["subscription_status"] == "active"


# ---------------------------------------------------------------------------
# Business Management
# ---------------------------------------------------------------------------

class TestAdminBusinessManagement:
    """Tests for admin business management endpoints."""

    def test_list_businesses(self, client, admin_headers, test_business):
        response = client.get("/api/admin/businesses", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    def test_list_businesses_search(self, client, admin_headers, test_business):
        response = client.get(
            "/api/admin/businesses?search=Test Barbershop", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    def test_list_businesses_filter_by_country(self, client, admin_headers, test_business):
        response = client.get(
            "/api/admin/businesses?country=UK", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    def test_list_businesses_filter_active(self, client, admin_headers, test_business):
        response = client.get(
            "/api/admin/businesses?is_active=true", headers=admin_headers
        )
        assert response.status_code == 200

    def test_get_business_detail(self, client, admin_headers, test_business):
        response = client.get(
            f"/api/admin/businesses/{test_business.id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_business.id
        assert data["name"] == test_business.name
        assert "appointment_count" in data
        assert "client_count" in data
        assert "service_count" in data
        assert "owner_name" in data

    def test_get_business_detail_not_found(self, client, admin_headers):
        response = client.get("/api/admin/businesses/99999", headers=admin_headers)
        assert response.status_code == 404

    def test_update_business(self, client, admin_headers, test_business):
        response = client.put(
            f"/api/admin/businesses/{test_business.id}",
            json={"name": "Updated Barbershop", "city": "Manchester"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Barbershop"
        assert data["city"] == "Manchester"

    def test_update_business_creates_audit_log(self, client, admin_headers, test_business, db):
        client.put(
            f"/api/admin/businesses/{test_business.id}",
            json={"name": "Audit Test Name"},
            headers=admin_headers,
        )
        log = db.query(AuditLog).filter(AuditLog.action == "business_updated").first()
        assert log is not None
        assert log.target_id == test_business.id

    def test_delete_business(self, client, admin_headers, test_business):
        response = client.delete(
            f"/api/admin/businesses/{test_business.id}", headers=admin_headers
        )
        assert response.status_code == 200
        assert "soft-deleted" in response.json()["detail"]

    def test_delete_business_creates_audit_log(self, client, admin_headers, test_business, db):
        client.delete(
            f"/api/admin/businesses/{test_business.id}", headers=admin_headers
        )
        log = db.query(AuditLog).filter(AuditLog.action == "business_deleted").first()
        assert log is not None

    def test_suspend_business(self, client, admin_headers, test_business):
        response = client.patch(
            f"/api/admin/businesses/{test_business.id}/suspend",
            json={"reason": "Suspicious activity"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "suspended" in response.json()["detail"].lower()

    def test_suspend_business_creates_audit_log(self, client, admin_headers, test_business, db):
        client.patch(
            f"/api/admin/businesses/{test_business.id}/suspend",
            json={"reason": "Policy violation"},
            headers=admin_headers,
        )
        log = db.query(AuditLog).filter(AuditLog.action == "business_suspended").first()
        assert log is not None

    def test_reinstate_business(self, client, admin_headers, test_business):
        # Suspend first
        client.patch(
            f"/api/admin/businesses/{test_business.id}/suspend",
            json={"reason": "Test suspend"},
            headers=admin_headers,
        )
        # Then reinstate
        response = client.patch(
            f"/api/admin/businesses/{test_business.id}/reinstate",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "reinstated" in response.json()["detail"].lower()

    def test_reinstate_creates_audit_log(self, client, admin_headers, test_business, db):
        client.patch(
            f"/api/admin/businesses/{test_business.id}/reinstate",
            headers=admin_headers,
        )
        log = db.query(AuditLog).filter(AuditLog.action == "business_reinstated").first()
        assert log is not None

    def test_list_suspended_businesses(self, client, admin_headers, test_business):
        # Suspend the business
        client.patch(
            f"/api/admin/businesses/{test_business.id}/suspend",
            json={"reason": "Test"},
            headers=admin_headers,
        )
        response = client.get(
            "/api/admin/businesses?suspended=true", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1


# ---------------------------------------------------------------------------
# Subscription Tracking
# ---------------------------------------------------------------------------

class TestAdminSubscriptions:
    """Tests for subscription management endpoints."""

    def test_list_subscriptions(self, client, admin_headers, test_subscription):
        response = client.get("/api/admin/subscriptions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    def test_list_subscriptions_filter_tier(self, client, admin_headers, test_subscription):
        response = client.get(
            "/api/admin/subscriptions?tier=premium", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["tier"] == "premium"

    def test_list_subscriptions_filter_status(self, client, admin_headers, test_subscription):
        response = client.get(
            "/api/admin/subscriptions?status=active", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "active"

    def test_subscription_summary(self, client, admin_headers, test_subscription):
        response = client.get(
            "/api/admin/subscriptions/summary", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "free_trial_count" in data
        assert "premium_count" in data
        assert "pro_count" in data
        assert "expired_count" in data
        assert "total_mrr" in data
        assert data["premium_count"] >= 1

    def test_subscription_summary_mrr(self, client, admin_headers, test_subscription):
        response = client.get(
            "/api/admin/subscriptions/summary", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Premium active subscription should contribute to MRR
        assert data["total_mrr"].get("USD", 0) >= 1200


# ---------------------------------------------------------------------------
# Payment Tracking
# ---------------------------------------------------------------------------

class TestAdminPayments:
    """Tests for payment management endpoints."""

    def test_list_payments(self, client, admin_headers, test_payment):
        response = client.get("/api/admin/payments", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    def test_list_payments_filter_provider(self, client, admin_headers, test_payment):
        response = client.get(
            "/api/admin/payments?provider=stripe", headers=admin_headers
        )
        assert response.status_code == 200

    def test_list_payments_filter_status(self, client, admin_headers, test_payment):
        response = client.get(
            "/api/admin/payments?status=completed", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "completed"

    def test_get_revenue_stats(self, client, admin_headers, test_payment):
        response = client.get("/api/admin/payments/revenue", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "monthly_revenue" in data
        assert "total_by_currency" in data
        assert "total_by_provider" in data
        assert data["total_by_currency"].get("USD", 0) >= 1200


# ---------------------------------------------------------------------------
# Notification Monitoring
# ---------------------------------------------------------------------------

class TestAdminNotifications:
    """Tests for notification monitoring endpoints."""

    def test_get_notification_stats(self, client, admin_headers, test_notification):
        response = client.get(
            "/api/admin/notifications/stats", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_sent" in data
        assert "total_failed" in data
        assert "by_channel" in data
        assert "delivery_rate_percent" in data
        assert data["total_sent"] >= 1
        assert data["total_failed"] >= 1

    def test_get_notification_failures(self, client, admin_headers, test_notification):
        response = client.get(
            "/api/admin/notifications/failures", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["status"] == "failed"

    def test_list_notifications(self, client, admin_headers, test_notification):
        response = client.get("/api/admin/notifications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 2  # 1 sent + 1 failed

    def test_list_notifications_filter_channel(self, client, admin_headers, test_notification):
        response = client.get(
            "/api/admin/notifications?channel=email", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["channel"] == "email"

    def test_list_notifications_filter_status(self, client, admin_headers, test_notification):
        response = client.get(
            "/api/admin/notifications?status=sent", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "sent"

    def test_delivery_rate_calculation(self, client, admin_headers, test_notification):
        response = client.get(
            "/api/admin/notifications/stats", headers=admin_headers
        )
        data = response.json()
        # 1 sent, 1 failed → 50% rate
        assert data["delivery_rate_percent"] == 50.0


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

class TestAdminAuditLog:
    """Tests for the audit log endpoint."""

    def test_audit_log_empty(self, client, admin_headers):
        response = client.get("/api/admin/audit-log", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    def test_audit_log_populated_after_action(
        self, client, admin_headers, regular_user
    ):
        # Trigger an action that creates an audit log entry
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test for audit log"},
            headers=admin_headers,
        )
        response = client.get("/api/admin/audit-log", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert data["items"][0]["action"] == "user_banned"
        assert data["items"][0]["target_type"] == "user"
        assert data["items"][0]["target_id"] == regular_user.id

    def test_audit_log_filter_by_action(self, client, admin_headers, regular_user):
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test filter"},
            headers=admin_headers,
        )
        response = client.get(
            "/api/admin/audit-log?action=user_banned", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert "user_banned" in item["action"]

    def test_audit_log_filter_by_target_type(
        self, client, admin_headers, regular_user
    ):
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test"},
            headers=admin_headers,
        )
        response = client.get(
            "/api/admin/audit-log?target_type=user", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["target_type"] == "user"

    def test_audit_log_has_admin_name(
        self, client, admin_headers, regular_user, admin_user
    ):
        client.patch(
            f"/api/admin/users/{regular_user.id}/ban",
            json={"reason": "Test"},
            headers=admin_headers,
        )
        response = client.get("/api/admin/audit-log", headers=admin_headers)
        data = response.json()
        assert data["items"][0]["admin_name"] == admin_user.full_name

    def test_audit_log_pagination(self, client, admin_headers, regular_user):
        response = client.get(
            "/api/admin/audit-log?page=1&size=5", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 5
