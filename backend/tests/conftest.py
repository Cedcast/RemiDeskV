"""Pytest configuration for backend tests."""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from src.database import Base, get_db
from src.main import app


# Create test database engine
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db():
    """Create a clean database for each test function."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override."""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user_data():
    """Return test user data (always business_owner in B2B SaaS)."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
        "phone": "+1234567890",
        "role": "business_owner"
    }


@pytest.fixture
def test_business_owner_data():
    """Return test business owner data."""
    return {
        "email": "owner@example.com",
        "password": "ownerpassword123",
        "full_name": "Business Owner",
        "phone": "+1987654321",
        "role": "business_owner"
    }


@pytest.fixture
def registered_user(client, test_user_data, db):
    """Create and return a registered user (auto-verified for tests)."""
    response = client.post("/api/auth/register", json=test_user_data)
    assert response.status_code == 201
    # Auto-verify for testing (email verification requires SendGrid)
    from src.models import User
    user = db.query(User).filter(User.email == test_user_data["email"]).first()
    user.is_verified = True
    db.commit()
    return response.json()


@pytest.fixture
def registered_business_owner(client, test_business_owner_data, db):
    """Create and return a registered business owner (auto-verified for tests)."""
    response = client.post("/api/auth/register", json=test_business_owner_data)
    assert response.status_code == 201
    # Auto-verify for testing (email verification requires SendGrid)
    from src.models import User
    user = db.query(User).filter(User.email == test_business_owner_data["email"]).first()
    user.is_verified = True
    db.commit()
    return response.json()


@pytest.fixture
def auth_token(client, test_user_data, registered_user):
    """Get authentication token for test user."""
    response = client.post("/api/auth/token", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def business_owner_token(client, test_business_owner_data, registered_business_owner):
    """Get authentication token for business owner."""
    response = client.post("/api/auth/token", json={
        "email": test_business_owner_data["email"],
        "password": test_business_owner_data["password"]
    })
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Return authorization headers."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def business_owner_headers(business_owner_token):
    """Return authorization headers for business owner."""
    return {"Authorization": f"Bearer {business_owner_token}"}
