"""Tests for appointment endpoints."""
import pytest
from datetime import datetime, timedelta, timezone


def future_time(hours_from_now: int = 24) -> str:
    """Return an ISO datetime string in the future."""
    return (datetime.now(timezone.utc) + timedelta(hours=hours_from_now)).isoformat()


@pytest.fixture
def test_business(client, business_owner_headers):
    """Create and return a test business."""
    business_data = {
        "name": "Test Appointment Business",
        "description": "A test business for appointments",
        "city": "London",
        "state": "England",
    }
    response = client.post(
        "/api/businesses",
        json=business_data,
        headers=business_owner_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def test_client_contact(client, business_owner_headers, test_business):
    """Create and return a test client contact."""
    client_data = {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+441234567891",
        "business_id": test_business["id"],
    }
    response = client.post(
        "/api/clients/",
        json=client_data,
        headers=business_owner_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def test_appointment_data(test_business, test_client_contact):
    """Return valid appointment creation payload."""
    start = future_time(24)
    end = future_time(25)
    return {
        "business_id": test_business["id"],
        "client_id": test_client_contact["id"],
        "service_name": "Consultation",
        "start_time": start,
        "end_time": end,
        "notes": "Test appointment notes",
        "notification_channels": {"email": True, "sms": False, "whatsapp": False},
    }


class TestCreateAppointment:
    """Tests for appointment creation."""

    def test_create_appointment_success(self, client, business_owner_headers, test_appointment_data):
        """Test successful appointment creation."""
        response = client.post(
            "/api/appointments/",
            json=test_appointment_data,
            headers=business_owner_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["business_id"] == test_appointment_data["business_id"]
        assert data["service_name"] == test_appointment_data["service_name"]
        assert data["status"] == "confirmed"
        assert "id" in data
        assert "reschedule_token" in data

    def test_create_appointment_with_inline_client(self, client, business_owner_headers, test_business):
        """Test creating an appointment with an inline client (no existing client ID)."""
        payload = {
            "business_id": test_business["id"],
            "client_name": "Inline Client",
            "client_email": "inline@example.com",
            "client_phone": "+440000000001",
            "service_name": "Initial Consult",
            "start_time": future_time(10),
            "end_time": future_time(11),
        }
        response = client.post(
            "/api/appointments/",
            json=payload,
            headers=business_owner_headers,
        )
        assert response.status_code == 201
        assert response.json()["service_name"] == "Initial Consult"

    def test_create_appointment_unauthenticated(self, client, test_appointment_data):
        """Test that unauthenticated requests are rejected."""
        response = client.post("/api/appointments/", json=test_appointment_data)
        assert response.status_code == 401

    def test_create_appointment_end_before_start(self, client, business_owner_headers, test_appointment_data):
        """Test that end_time before start_time is rejected."""
        test_appointment_data["end_time"] = future_time(1)
        test_appointment_data["start_time"] = future_time(5)
        response = client.post(
            "/api/appointments/",
            json=test_appointment_data,
            headers=business_owner_headers,
        )
        assert response.status_code == 422

    def test_create_appointment_wrong_business(self, client, auth_headers, test_appointment_data):
        """Test that a different user cannot create appointments for another owner's business."""
        response = client.post(
            "/api/appointments/",
            json=test_appointment_data,
            headers=auth_headers,
        )
        assert response.status_code == 403


class TestListAppointments:
    """Tests for listing appointments."""

    def test_list_appointments_empty(self, client, business_owner_headers):
        """Test listing appointments when none exist returns empty list."""
        response = client.get("/api/appointments/", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["appointments"] == []

    def test_list_appointments_with_data(self, client, business_owner_headers, test_appointment_data):
        """Test listing appointments after creating one."""
        client.post("/api/appointments/", json=test_appointment_data, headers=business_owner_headers)

        response = client.get("/api/appointments/", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["appointments"]) == 1

    def test_list_appointments_unauthenticated(self, client):
        """Test unauthenticated listing is rejected."""
        response = client.get("/api/appointments/")
        assert response.status_code == 401

    def test_list_appointments_pagination(self, client, business_owner_headers, test_appointment_data):
        """Test pagination parameters are respected."""
        # Create two appointments with different times
        test_appointment_data["start_time"] = future_time(24)
        test_appointment_data["end_time"] = future_time(25)
        client.post("/api/appointments/", json=test_appointment_data, headers=business_owner_headers)

        test_appointment_data["start_time"] = future_time(48)
        test_appointment_data["end_time"] = future_time(49)
        client.post("/api/appointments/", json=test_appointment_data, headers=business_owner_headers)

        response = client.get("/api/appointments/?page=1&size=1", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["appointments"]) == 1
        assert data["page"] == 1
        assert data["size"] == 1


class TestGetAppointment:
    """Tests for getting a specific appointment."""

    def test_get_appointment_success(self, client, business_owner_headers, test_appointment_data):
        """Test getting appointment details."""
        create_response = client.post(
            "/api/appointments/", json=test_appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]

        response = client.get(f"/api/appointments/{appointment_id}", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == appointment_id
        assert "business" in data

    def test_get_appointment_not_found(self, client, business_owner_headers):
        """Test getting a non-existent appointment returns 404."""
        response = client.get("/api/appointments/99999", headers=business_owner_headers)
        assert response.status_code == 404

    def test_get_appointment_unauthenticated(self, client, business_owner_headers, test_appointment_data):
        """Test that unauthenticated access is rejected."""
        create_response = client.post(
            "/api/appointments/", json=test_appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]
        response = client.get(f"/api/appointments/{appointment_id}")
        assert response.status_code == 401


class TestUpdateAppointmentStatus:
    """Tests for updating appointment status."""

    def test_update_status_cancelled(self, client, business_owner_headers, test_appointment_data):
        """Test cancelling an appointment."""
        create_response = client.post(
            "/api/appointments/", json=test_appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]

        response = client.patch(
            f"/api/appointments/{appointment_id}/status",
            json={"status": "cancelled", "cancellation_reason": "Client request"},
            headers=business_owner_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    def test_update_status_completed(self, client, business_owner_headers, test_appointment_data):
        """Test marking an appointment as completed."""
        create_response = client.post(
            "/api/appointments/", json=test_appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]

        response = client.patch(
            f"/api/appointments/{appointment_id}/status",
            json={"status": "completed"},
            headers=business_owner_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    def test_update_status_not_found(self, client, business_owner_headers):
        """Test updating status of non-existent appointment."""
        response = client.patch(
            "/api/appointments/99999/status",
            json={"status": "cancelled"},
            headers=business_owner_headers,
        )
        assert response.status_code == 404


class TestCancelAppointment:
    """Tests for cancelling/deleting appointments."""

    def test_cancel_appointment_success(self, client, business_owner_headers, test_appointment_data):
        """Test cancelling an appointment via DELETE sets status to cancelled."""
        create_response = client.post(
            "/api/appointments/", json=test_appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]

        response = client.delete(
            f"/api/appointments/{appointment_id}", headers=business_owner_headers
        )
        assert response.status_code == 204

    def test_cancel_appointment_not_found(self, client, business_owner_headers):
        """Test deleting a non-existent appointment returns 404."""
        response = client.delete("/api/appointments/99999", headers=business_owner_headers)
        assert response.status_code == 404


class TestUpcomingAppointments:
    """Tests for the upcoming appointments endpoint."""

    def test_get_upcoming_empty(self, client, business_owner_headers):
        """Test upcoming appointments when none exist."""
        response = client.get("/api/appointments/upcoming", headers=business_owner_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_upcoming_with_data(self, client, business_owner_headers, test_appointment_data):
        """Test upcoming appointments returns future confirmed appointments."""
        client.post("/api/appointments/", json=test_appointment_data, headers=business_owner_headers)

        response = client.get("/api/appointments/upcoming", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
