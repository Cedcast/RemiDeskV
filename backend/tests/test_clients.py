"""Tests for client contact endpoints."""
import pytest


@pytest.fixture
def test_business(client, business_owner_headers):
    """Create and return a test business."""
    business_data = {
        "name": "Client Test Business",
        "description": "A test business for client tests",
        "city": "Manchester",
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
def test_client_data(test_business):
    """Return test client data."""
    return {
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "phone": "+441234567899",
        "notes": "VIP client",
        "business_id": test_business["id"],
    }


class TestCreateClient:
    """Tests for creating client contacts."""

    def test_create_client_success(self, client, business_owner_headers, test_client_data):
        """Test successful client creation."""
        response = client.post(
            "/api/clients/",
            json=test_client_data,
            headers=business_owner_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == test_client_data["name"]
        assert data["email"] == test_client_data["email"]
        assert data["phone"] == test_client_data["phone"]
        assert data["business_id"] == test_client_data["business_id"]
        assert "id" in data

    def test_create_client_unauthenticated(self, client, test_client_data):
        """Test client creation without authentication fails."""
        response = client.post("/api/clients/", json=test_client_data)
        assert response.status_code == 401

    def test_create_client_wrong_business(self, client, auth_headers, test_client_data):
        """Test that a user cannot create a client for a business they don't own."""
        response = client.post(
            "/api/clients/",
            json=test_client_data,
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_create_client_nonexistent_business(self, client, business_owner_headers):
        """Test creating a client for a non-existent business returns 404."""
        response = client.post(
            "/api/clients/",
            json={"name": "Bob", "business_id": 99999},
            headers=business_owner_headers,
        )
        assert response.status_code == 404

    def test_create_client_minimal_data(self, client, business_owner_headers, test_business):
        """Test creating a client with only required fields."""
        response = client.post(
            "/api/clients/",
            json={"name": "Minimal Client", "business_id": test_business["id"]},
            headers=business_owner_headers,
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Minimal Client"


class TestListClients:
    """Tests for listing client contacts."""

    def test_list_clients_empty(self, client, business_owner_headers):
        """Test listing clients when none exist."""
        response = client.get("/api/clients/", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["clients"] == []

    def test_list_clients_with_data(self, client, business_owner_headers, test_client_data):
        """Test listing clients after creating one."""
        client.post("/api/clients/", json=test_client_data, headers=business_owner_headers)
        response = client.get("/api/clients/", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["clients"]) == 1
        assert data["clients"][0]["name"] == test_client_data["name"]

    def test_list_clients_unauthenticated(self, client):
        """Test unauthenticated listing is rejected."""
        response = client.get("/api/clients/")
        assert response.status_code == 401

    def test_list_clients_pagination(self, client, business_owner_headers, test_client_data, test_business):
        """Test pagination parameters are respected."""
        # Create two clients
        client.post("/api/clients/", json=test_client_data, headers=business_owner_headers)
        client.post(
            "/api/clients/",
            json={"name": "Second Client", "business_id": test_business["id"]},
            headers=business_owner_headers,
        )

        response = client.get("/api/clients/?page=1&size=1", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["clients"]) == 1

    def test_list_clients_search(self, client, business_owner_headers, test_client_data, test_business):
        """Test search filter works on name and email."""
        client.post("/api/clients/", json=test_client_data, headers=business_owner_headers)
        client.post(
            "/api/clients/",
            json={"name": "Completely Different", "business_id": test_business["id"]},
            headers=business_owner_headers,
        )

        # Search by name fragment
        response = client.get("/api/clients/?search=Alice", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["clients"][0]["name"] == test_client_data["name"]

    def test_list_clients_filter_by_business(self, client, business_owner_headers, test_client_data, test_business):
        """Test filtering clients by business_id."""
        client.post("/api/clients/", json=test_client_data, headers=business_owner_headers)

        response = client.get(
            f"/api/clients/?business_id={test_business['id']}",
            headers=business_owner_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


class TestGetClient:
    """Tests for getting a specific client."""

    def test_get_client_success(self, client, business_owner_headers, test_client_data):
        """Test getting a client by ID."""
        create_response = client.post(
            "/api/clients/", json=test_client_data, headers=business_owner_headers
        )
        client_id = create_response.json()["id"]

        response = client.get(f"/api/clients/{client_id}", headers=business_owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_id
        assert data["name"] == test_client_data["name"]

    def test_get_client_not_found(self, client, business_owner_headers):
        """Test getting a non-existent client returns 404."""
        response = client.get("/api/clients/99999", headers=business_owner_headers)
        assert response.status_code == 404

    def test_get_client_unauthenticated(self, client, business_owner_headers, test_client_data):
        """Test unauthenticated access is rejected."""
        create_response = client.post(
            "/api/clients/", json=test_client_data, headers=business_owner_headers
        )
        client_id = create_response.json()["id"]
        response = client.get(f"/api/clients/{client_id}")
        assert response.status_code == 401


class TestUpdateClient:
    """Tests for updating a client contact."""

    def test_update_client_success(self, client, business_owner_headers, test_client_data):
        """Test updating a client's details."""
        create_response = client.post(
            "/api/clients/", json=test_client_data, headers=business_owner_headers
        )
        client_id = create_response.json()["id"]

        update_data = {"name": "Alice Updated", "notes": "Updated notes"}
        response = client.put(
            f"/api/clients/{client_id}",
            json=update_data,
            headers=business_owner_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Alice Updated"
        assert data["notes"] == "Updated notes"

    def test_update_client_not_found(self, client, business_owner_headers):
        """Test updating a non-existent client returns 404."""
        response = client.put(
            "/api/clients/99999",
            json={"name": "Ghost"},
            headers=business_owner_headers,
        )
        assert response.status_code == 404


class TestDeleteClient:
    """Tests for deleting a client contact."""

    def test_delete_client_success(self, client, business_owner_headers, test_client_data):
        """Test deleting a client."""
        create_response = client.post(
            "/api/clients/", json=test_client_data, headers=business_owner_headers
        )
        client_id = create_response.json()["id"]

        response = client.delete(f"/api/clients/{client_id}", headers=business_owner_headers)
        assert response.status_code == 204

        # Verify the client is gone
        get_response = client.get(f"/api/clients/{client_id}", headers=business_owner_headers)
        assert get_response.status_code == 404

    def test_delete_client_not_found(self, client, business_owner_headers):
        """Test deleting a non-existent client returns 404."""
        response = client.delete("/api/clients/99999", headers=business_owner_headers)
        assert response.status_code == 404
