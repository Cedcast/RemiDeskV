"""Tests for authentication endpoints."""
import pytest


class TestRegistration:
    """Tests for user registration."""

    def test_register_customer_success(self, client, test_user_data):
        """Test successful customer registration."""
        response = client.post("/api/auth/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert data["role"] == "customer"
        assert "id" in data
        assert "hashed_password" not in data

    def test_register_business_owner_success(self, client, test_business_owner_data):
        """Test successful business owner registration."""
        response = client.post("/api/auth/register", json=test_business_owner_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == test_business_owner_data["email"]
        assert data["role"] == "business_owner"

    def test_register_duplicate_email(self, client, test_user_data, registered_user):
        """Test registration with duplicate email fails."""
        response = client.post("/api/auth/register", json=test_user_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email fails."""
        test_user_data["email"] = "invalid-email"
        response = client.post("/api/auth/register", json=test_user_data)
        
        assert response.status_code == 422

    def test_register_short_password(self, client, test_user_data):
        """Test registration with short password fails."""
        test_user_data["password"] = "short"
        response = client.post("/api/auth/register", json=test_user_data)
        
        assert response.status_code == 422


class TestLogin:
    """Tests for user login."""

    def test_login_success(self, client, test_user_data, registered_user):
        """Test successful login."""
        response = client.post("/api/auth/token", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user_data, registered_user):
        """Test login with wrong password fails."""
        response = client.post("/api/auth/token", json={
            "email": test_user_data["email"],
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user fails."""
        response = client.post("/api/auth/token", json={
            "email": "nonexistent@example.com",
            "password": "somepassword"
        })
        
        assert response.status_code == 401


class TestGetCurrentUser:
    """Tests for getting current user info."""

    def test_get_me_authenticated(self, client, auth_headers, test_user_data):
        """Test getting current user info when authenticated."""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]

    def test_get_me_unauthenticated(self, client):
        """Test getting current user info when not authenticated."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client):
        """Test getting current user info with invalid token."""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        
        assert response.status_code == 401
