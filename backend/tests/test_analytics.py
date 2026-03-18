"""Tests for analytics and dashboard statistics endpoints."""
import pytest
from datetime import datetime, timedelta, timezone


@pytest.fixture
def test_business(client, business_owner_headers):
    """Create and return a test business."""
    response = client.post(
        "/api/businesses",
        json={"name": "Analytics Test Biz", "city": "London", "state": "England"},
        headers=business_owner_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def test_client_contact(client, business_owner_headers, test_business):
    """Create and return a test client contact."""
    response = client.post(
        "/api/clients/",
        json={"name": "Analytics Client", "email": "analytics@example.com", "business_id": test_business["id"]},
        headers=business_owner_headers,
    )
    assert response.status_code == 201
    return response.json()


def future_time(hours: int = 24) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


class TestDashboardStats:
    """Tests for the dashboard statistics endpoint."""

    def test_get_stats_empty(self, client, business_owner_headers):
        """Test statistics endpoint when no data exists."""
        response = client.get("/api/analytics/stats", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_appointments"] == 0
        assert data["total_clients"] == 0
        assert "status_breakdown" in data
        assert "monthly_trend" in data

    def test_get_stats_with_appointments(self, client, business_owner_headers, test_business, test_client_contact):
        """Test statistics reflect created appointments."""
        # Create an appointment
        appointment_data = {
            "business_id": test_business["id"],
            "client_id": test_client_contact["id"],
            "service_name": "Consultation",
            "start_time": future_time(24),
            "end_time": future_time(25),
        }
        client.post("/api/appointments/", json=appointment_data, headers=business_owner_headers)

        response = client.get("/api/analytics/stats", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_appointments"] >= 1
        assert data["upcoming_appointments"] >= 1

    def test_get_stats_unauthenticated(self, client):
        """Test that unauthenticated access is rejected."""
        response = client.get("/api/analytics/stats")
        assert response.status_code == 401

    def test_get_stats_structure(self, client, business_owner_headers):
        """Test that statistics response has the expected structure."""
        response = client.get("/api/analytics/stats", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()

        # Verify all expected fields are present
        expected_fields = [
            "total_appointments",
            "this_month_appointments",
            "this_year_appointments",
            "upcoming_appointments",
            "past_appointments",
            "completed_appointments",
            "cancelled_appointments",
            "rescheduled_appointments",
            "status_breakdown",
            "total_clients",
            "average_duration_minutes",
            "monthly_trend",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_get_stats_filter_by_business(self, client, business_owner_headers, test_business, test_client_contact):
        """Test statistics can be filtered by specific business_id."""
        appointment_data = {
            "business_id": test_business["id"],
            "client_id": test_client_contact["id"],
            "service_name": "Business Filter Test",
            "start_time": future_time(24),
            "end_time": future_time(25),
        }
        client.post("/api/appointments/", json=appointment_data, headers=business_owner_headers)

        response = client.get(
            f"/api/analytics/stats?business_id={test_business['id']}",
            headers=business_owner_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_appointments"] >= 1

    def test_get_stats_filter_invalid_business(self, client, business_owner_headers):
        """Test that filtering by another owner's business returns 403."""
        response = client.get(
            "/api/analytics/stats?business_id=99999",
            headers=business_owner_headers,
        )
        assert response.status_code == 403

    def test_get_stats_status_breakdown(self, client, business_owner_headers, test_business, test_client_contact):
        """Test that status breakdown tracks appointment statuses."""
        # Create and cancel an appointment
        appointment_data = {
            "business_id": test_business["id"],
            "client_id": test_client_contact["id"],
            "service_name": "Test Service",
            "start_time": future_time(24),
            "end_time": future_time(25),
        }
        create_response = client.post(
            "/api/appointments/", json=appointment_data, headers=business_owner_headers
        )
        appointment_id = create_response.json()["id"]

        client.patch(
            f"/api/appointments/{appointment_id}/status",
            json={"status": "cancelled"},
            headers=business_owner_headers,
        )

        response = client.get("/api/analytics/stats", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["cancelled_appointments"] >= 1
        assert data["status_breakdown"]["cancelled"] >= 1

