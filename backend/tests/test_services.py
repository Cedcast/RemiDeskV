"""Tests for service endpoints."""
import pytest


@pytest.fixture
def test_business(client, business_owner_headers):
    """Create and return a test business."""
    business_data = {
        "name": "Test Business",
        "description": "A test business",
        "city": "London",
        "state": "England"
    }
    response = client.post(
        "/api/businesses",
        json=business_data,
        headers=business_owner_headers
    )
    return response.json()


@pytest.fixture
def test_service_data(test_business):
    """Return test service data."""
    return {
        "name": "Test Service",
        "description": "A test service description",
        "duration_minutes": 60,
        "price": 50.00,
        "business_id": test_business["id"]
    }


class TestCreateService:
    """Tests for creating a service."""

    def test_create_service_success(self, client, business_owner_headers, test_service_data):
        """Test successful service creation."""
        response = client.post(
            "/api/services",
            json=test_service_data,
            headers=business_owner_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == test_service_data["name"]
        assert data["duration_minutes"] == test_service_data["duration_minutes"]
        assert data["price"] == test_service_data["price"]
        assert "id" in data

    def test_create_service_unauthenticated(self, client, test_service_data):
        """Test creating service without authentication fails."""
        response = client.post("/api/services", json=test_service_data)
        
        assert response.status_code == 401

    def test_create_service_not_owner(self, client, auth_headers, test_service_data):
        """Test customer cannot create service for business they don't own."""
        response = client.post(
            "/api/services",
            json=test_service_data,
            headers=auth_headers
        )
        
        assert response.status_code == 403


class TestGetBusinessServices:
    """Tests for getting services for a business."""

    def test_get_services_empty(self, client, test_business):
        """Test getting services when none exist."""
        response = client.get(f"/api/services/business/{test_business['id']}")
        
        assert response.status_code == 200
        assert response.json() == []

    def test_get_services_with_data(self, client, business_owner_headers, test_service_data, test_business):
        """Test getting services with data."""
        # Create a service
        client.post(
            "/api/services",
            json=test_service_data,
            headers=business_owner_headers
        )
        
        response = client.get(f"/api/services/business/{test_business['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == test_service_data["name"]

    def test_get_services_nonexistent_business(self, client):
        """Test getting services for nonexistent business."""
        response = client.get("/api/services/business/99999")
        
        assert response.status_code == 404


class TestUpdateService:
    """Tests for updating a service."""

    def test_update_service_success(self, client, business_owner_headers, test_service_data):
        """Test updating a service."""
        # Create a service
        create_response = client.post(
            "/api/services",
            json=test_service_data,
            headers=business_owner_headers
        )
        service_id = create_response.json()["id"]
        
        # Update the service
        update_data = {"name": "Updated Service", "price": 75.00}
        response = client.put(
            f"/api/services/{service_id}",
            json=update_data,
            headers=business_owner_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Service"
        assert data["price"] == 75.00


class TestDeleteService:
    """Tests for deleting a service."""

    def test_delete_service_success(self, client, business_owner_headers, test_service_data, test_business):
        """Test deleting (deactivating) a service."""
        # Create a service
        create_response = client.post(
            "/api/services",
            json=test_service_data,
            headers=business_owner_headers
        )
        service_id = create_response.json()["id"]
        
        # Delete the service
        response = client.delete(
            f"/api/services/{service_id}",
            headers=business_owner_headers
        )
        
        assert response.status_code == 204
        
        # Verify service is no longer in active list
        list_response = client.get(f"/api/services/business/{test_business['id']}")
        assert len(list_response.json()) == 0
