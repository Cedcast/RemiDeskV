"""Tests for the public reschedule portal endpoints."""
import json
import secrets
from datetime import datetime, timedelta, timezone
import pytest

from src.models import Appointment, AppointmentStatus, Business, Client, User, UserRole


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def business_owner_with_token(client, test_user_data):
    """Register a business owner and return their auth token."""
    client.post("/api/auth/register", json=test_user_data)
    res = client.post("/api/auth/token", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    })
    return res.json()["access_token"]


@pytest.fixture
def created_business(client, business_owner_with_token):
    """Create a business and return its data."""
    headers = {"Authorization": f"Bearer {business_owner_with_token}"}
    res = client.post("/api/businesses", json={
        "name": "Test Barbershop",
        "description": "Test business",
        "timezone": "America/New_York",
    }, headers=headers)
    assert res.status_code == 201
    return res.json()


@pytest.fixture
def appointment_with_token(client, business_owner_with_token, created_business, db):
    """Create an appointment with a reschedule token and return it."""
    headers = {"Authorization": f"Bearer {business_owner_with_token}"}
    future = datetime.now(timezone.utc) + timedelta(hours=48)
    end = future + timedelta(hours=1)

    res = client.post("/api/appointments", json={
        "business_id": created_business["id"],
        "client_name": "Alice Smith",
        "client_email": "alice@example.com",
        "client_phone": "+15550001111",
        "service_name": "Haircut",
        "start_time": future.isoformat(),
        "end_time": end.isoformat(),
        "notification_channels": {"email": False, "sms": False, "whatsapp": False},
    }, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["reschedule_token"], "Appointment must have a reschedule token"
    return data


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestRescheduleGet:
    """Tests for GET /api/reschedule/{token}."""

    def test_get_appointment_by_valid_token(self, client, appointment_with_token):
        """Valid token returns appointment details."""
        token = appointment_with_token["reschedule_token"]
        res = client.get(f"/api/reschedule/{token}")
        assert res.status_code == 200
        data = res.json()
        assert data["business_name"] == "Test Barbershop"
        assert data["service_name"] == "Haircut"
        assert data["client_name"] == "Alice Smith"
        # Token must NOT be in the public response
        assert "reschedule_token" not in data

    def test_get_appointment_invalid_token(self, client):
        """Invalid token returns 404."""
        res = client.get("/api/reschedule/totally-invalid-token-xyz")
        assert res.status_code == 404

    def test_get_cancelled_appointment_returns_conflict(
        self, client, appointment_with_token, business_owner_with_token
    ):
        """Cancelled appointment cannot be rescheduled — returns 409."""
        token = appointment_with_token["reschedule_token"]
        appt_id = appointment_with_token["id"]
        headers = {"Authorization": f"Bearer {business_owner_with_token}"}

        # Cancel the appointment via the authenticated endpoint
        cancel_res = client.delete(f"/api/appointments/{appt_id}", headers=headers)
        assert cancel_res.status_code == 204

        # Reschedule portal should now refuse with 409
        res = client.get(f"/api/reschedule/{token}")
        assert res.status_code == 409


class TestReschedulePost:
    """Tests for POST /api/reschedule/{token}."""

    def test_reschedule_success(self, client, appointment_with_token):
        """Valid reschedule request updates the appointment."""
        token = appointment_with_token["reschedule_token"]
        new_start = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()
        new_end = (datetime.now(timezone.utc) + timedelta(hours=73)).isoformat()

        res = client.post(f"/api/reschedule/{token}", json={
            "new_start_time": new_start,
            "new_end_time": new_end,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "rescheduled"

    def test_reschedule_invalid_token(self, client):
        """Invalid token returns 404."""
        new_start = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        new_end = (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
        res = client.post("/api/reschedule/bad-token", json={
            "new_start_time": new_start,
            "new_end_time": new_end,
        })
        assert res.status_code == 404

    def test_reschedule_end_before_start_rejected(self, client, appointment_with_token):
        """End time before start time is rejected with 422."""
        token = appointment_with_token["reschedule_token"]
        new_start = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        new_end = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()

        res = client.post(f"/api/reschedule/{token}", json={
            "new_start_time": new_start,
            "new_end_time": new_end,
        })
        assert res.status_code == 422

    def test_reschedule_twice_fails(self, client, appointment_with_token):
        """After rescheduling once the token cannot be used again."""
        token = appointment_with_token["reschedule_token"]
        new_start = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()
        new_end = (datetime.now(timezone.utc) + timedelta(hours=73)).isoformat()

        # First reschedule succeeds
        res1 = client.post(f"/api/reschedule/{token}", json={
            "new_start_time": new_start,
            "new_end_time": new_end,
        })
        assert res1.status_code == 200

        # Second attempt on the same token must be rejected (status is now rescheduled)
        res2 = client.post(f"/api/reschedule/{token}", json={
            "new_start_time": new_start,
            "new_end_time": new_end,
        })
        assert res2.status_code == 409
