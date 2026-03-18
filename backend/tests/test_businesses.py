"""Tests for business endpoints."""
import pytest


@pytest.fixture
def test_business_data():
    """Return test business data."""
    return {
        "name": "Test Business",
        "description": "A test business description",
        "address": "123 Test Street",
        "city": "London",
        "state": "England",
        "zip_code": "SW1A 1AA",
        "phone": "+441234567890",
        "email": "business@example.com",
        "website": "https://testbusiness.com"
    }


class TestCreateBusiness:
    """Tests for creating a business."""

    def test_create_business_success(self, client, business_owner_headers, test_business_data):
        """Test successful business creation."""
        response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=business_owner_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == test_business_data["name"]
        assert data["city"] == test_business_data["city"]
        assert "id" in data
        assert "owner_id" in data

    def test_create_business_unauthenticated(self, client, test_business_data):
        """Test creating business without authentication fails."""
        response = client.post("/api/businesses", json=test_business_data)

        assert response.status_code == 401

    def test_create_business_customer_becomes_owner(self, client, auth_headers, test_business_data):
        """Test customer can create a business and becomes business owner."""
        response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=auth_headers
        )

        # Customer can create business - they become business owner
        assert response.status_code == 201
        assert response.json()["name"] == test_business_data["name"]


class TestDeleteBusiness:
    """Tests for deleting (deactivating) a business."""

    def test_delete_business_success(self, client, business_owner_headers, test_business_data):
        """Test deactivating a business."""
        create_response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=business_owner_headers,
        )
        business_id = create_response.json()["id"]

        response = client.delete(
            f"/api/businesses/{business_id}",
            headers=business_owner_headers,
        )
        assert response.status_code == 204

    def test_delete_business_not_found(self, client, business_owner_headers):
        """Test deleting a non-existent business returns 404."""
        response = client.delete("/api/businesses/99999", headers=business_owner_headers)
        assert response.status_code == 404

    def test_delete_business_not_owner(self, client, business_owner_headers, auth_headers, test_business_data):
        """Test that a different user cannot delete another owner's business."""
        create_response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=business_owner_headers,
        )
        business_id = create_response.json()["id"]

        response = client.delete(
            f"/api/businesses/{business_id}",
            headers=auth_headers,
        )
        assert response.status_code == 403


class TestGetMyBusinesses:
    """Tests for listing the current user's businesses."""

    def test_get_my_businesses_empty(self, client, business_owner_headers):
        """Test listing businesses when none exist."""
        response = client.get("/api/businesses/my", headers=business_owner_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_my_businesses_with_data(self, client, business_owner_headers, test_business_data):
        """Test listing businesses after creating one."""
        client.post("/api/businesses", json=test_business_data, headers=business_owner_headers)
        response = client.get("/api/businesses/my", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == test_business_data["name"]

    def test_get_my_businesses_unauthenticated(self, client):
        """Test unauthenticated access is rejected."""
        response = client.get("/api/businesses/my")
        assert response.status_code == 401


class TestUpdateBusiness:
    """Tests for updating a business."""

    def test_update_business_success(self, client, business_owner_headers, test_business_data):
        """Test updating a business."""
        # Create a business first
        create_response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=business_owner_headers
        )
        business_id = create_response.json()["id"]

        # Update the business
        update_data = {"name": "Updated Business Name", "city": "Manchester"}
        response = client.put(
            f"/api/businesses/{business_id}",
            json=update_data,
            headers=business_owner_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Business Name"
        assert data["city"] == "Manchester"

    def test_update_business_not_owner(self, client, business_owner_headers, auth_headers, test_business_data):
        """Test updating a business by non-owner fails."""
        # Create a business
        create_response = client.post(
            "/api/businesses",
            json=test_business_data,
            headers=business_owner_headers
        )
        business_id = create_response.json()["id"]

        # Try to update as different user
        response = client.put(
            f"/api/businesses/{business_id}",
            json={"name": "Hacked Name"},
            headers=auth_headers
        )

        assert response.status_code == 403
