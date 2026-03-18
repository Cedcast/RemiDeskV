"""Tests for user profile endpoints."""
import pytest


class TestGetMyProfile:
    """Tests for getting the current user's profile."""

    def test_get_profile_success(self, client, auth_headers, test_user_data):
        """Test getting the authenticated user's profile."""
        response = client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert "id" in data

    def test_get_profile_unauthenticated(self, client):
        """Test that unauthenticated access is rejected."""
        response = client.get("/api/users/me")
        assert response.status_code == 401


class TestUpdateMyProfile:
    """Tests for updating the current user's profile."""

    def test_update_profile_success(self, client, auth_headers):
        """Test updating user's full name and phone."""
        update_data = {"full_name": "Updated Name", "phone": "+441111111111"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["phone"] == "+441111111111"

    def test_update_profile_partial(self, client, auth_headers, test_user_data):
        """Test partial update only changes specified fields."""
        response = client.put(
            "/api/users/me", json={"full_name": "Partial Update"}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Partial Update"
        assert data["email"] == test_user_data["email"]

    def test_update_profile_unauthenticated(self, client):
        """Test that unauthenticated update is rejected."""
        response = client.put("/api/users/me", json={"full_name": "Hacker"})
        assert response.status_code == 401


class TestGetUserById:
    """Tests for getting a user by ID."""

    def test_get_user_success(self, client, auth_headers, registered_user):
        """Test getting a user by their ID."""
        user_id = registered_user["id"]
        response = client.get(f"/api/users/{user_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id

    def test_get_user_not_found(self, client, auth_headers):
        """Test getting a non-existent user returns 404."""
        response = client.get("/api/users/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_user_unauthenticated(self, client, registered_user):
        """Test that unauthenticated access is rejected."""
        response = client.get(f"/api/users/{registered_user['id']}")
        assert response.status_code == 401


class TestHealthCheck:
    """Tests for the health check endpoints."""

    def test_health_check(self, client):
        """Test the root health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_api_health_check(self, client):
        """Test the API health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_root_endpoint(self, client):
        """Test the root endpoint returns welcome message."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
