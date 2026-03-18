"""Tests for subscription and billing endpoints."""
import pytest


class TestGetPricing:
    """Tests for the public pricing endpoint."""

    def test_get_pricing_usd(self, client):
        """Test pricing returns correct structure for USD."""
        response = client.get("/api/subscriptions/pricing?currency=USD")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        plans = data["plans"]
        assert "premium" in plans
        assert "pro" in plans
        assert plans["premium"]["tier"] == "premium"
        assert plans["pro"]["tier"] == "pro"

    def test_get_pricing_gbp(self, client):
        """Test pricing returns data for GBP currency."""
        response = client.get("/api/subscriptions/pricing?currency=GBP")
        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "GBP"

    def test_get_pricing_default_currency(self, client):
        """Test pricing defaults to USD when no currency specified."""
        response = client.get("/api/subscriptions/pricing")
        assert response.status_code == 200
        assert response.json()["currency"] == "USD"

    def test_get_pricing_trial_info(self, client):
        """Test that pricing includes trial information."""
        response = client.get("/api/subscriptions/pricing")
        assert response.status_code == 200
        data = response.json()
        assert "trial" in data
        assert data["trial"]["requires_payment_method"] is False

    def test_list_currencies(self, client):
        """Test the currencies endpoint returns supported currencies."""
        response = client.get("/api/subscriptions/pricing/currencies")
        assert response.status_code == 200
        data = response.json()
        # Should include at minimum USD and GBP
        assert "USD" in data
        assert "GBP" in data


class TestStartTrial:
    """Tests for starting a free trial."""

    def test_start_trial_success(self, client, auth_headers):
        """Test starting a free trial for a new user."""
        response = client.post(
            "/api/subscriptions/trial",
            json={"currency": "USD"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscription" in data
        assert data["subscription"]["tier"] == "free_trial"

    def test_start_trial_gbp(self, client, auth_headers):
        """Test starting a free trial with GBP currency."""
        response = client.post(
            "/api/subscriptions/trial",
            json={"currency": "GBP"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["subscription"]["currency"] == "GBP"

    def test_start_trial_duplicate(self, client, auth_headers):
        """Test that starting a second trial is rejected."""
        # Start the first trial
        client.post("/api/subscriptions/trial", json={"currency": "USD"}, headers=auth_headers)
        # Attempt a second trial
        response = client.post(
            "/api/subscriptions/trial",
            json={"currency": "USD"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_start_trial_unauthenticated(self, client):
        """Test that unauthenticated trial start is rejected."""
        response = client.post("/api/subscriptions/trial", json={"currency": "USD"})
        assert response.status_code == 401


class TestGetCurrentSubscription:
    """Tests for checking the current subscription."""

    def test_get_subscription_returns_info(self, client, auth_headers):
        """Test subscription status endpoint returns subscription data."""
        response = client.get("/api/subscriptions/current", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # The endpoint auto-creates a trial if none exists
        assert "tier" in data
        assert "status" in data
        assert "currency" in data

    def test_get_subscription_after_explicit_trial(self, client, auth_headers):
        """Test subscription status after explicitly starting a trial."""
        client.post("/api/subscriptions/trial", json={"currency": "USD"}, headers=auth_headers)
        response = client.get("/api/subscriptions/current", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "free_trial"

    def test_get_subscription_unauthenticated(self, client):
        """Test unauthenticated access is rejected."""
        response = client.get("/api/subscriptions/current")
        assert response.status_code == 401


class TestCancelSubscription:
    """Tests for cancelling a subscription."""

    def test_cancel_existing_subscription(self, client, auth_headers):
        """Test cancelling an active subscription."""
        # Start trial first
        client.post("/api/subscriptions/trial", json={"currency": "USD"}, headers=auth_headers)

        response = client.post(
            "/api/subscriptions/cancel",
            json={"reason": "No longer needed"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscription" in data

    def test_cancel_no_subscription(self, client, business_owner_headers):
        """Test cancelling when no subscription exists returns 404.

        Uses business_owner_headers (a different user) to ensure no prior subscription.
        """
        response = client.post(
            "/api/subscriptions/cancel",
            json={},
            headers=business_owner_headers,
        )
        assert response.status_code == 404

    def test_cancel_unauthenticated(self, client):
        """Test unauthenticated cancellation is rejected."""
        response = client.post("/api/subscriptions/cancel", json={})
        assert response.status_code == 401


class TestPaymentHistory:
    """Tests for payment history."""

    def test_get_payment_history_empty(self, client, auth_headers):
        """Test payment history when no payments exist."""
        response = client.get("/api/subscriptions/payments", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_payment_history_unauthenticated(self, client):
        """Test unauthenticated access is rejected."""
        response = client.get("/api/subscriptions/payments")
        assert response.status_code == 401


class TestUpgradeSubscription:
    """Tests for upgrading a subscription."""

    def test_upgrade_invalid_tier(self, client, auth_headers):
        """Test upgrading to an invalid tier is rejected."""
        response = client.post(
            "/api/subscriptions/upgrade",
            json={"tier": "enterprise", "provider": "stripe"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_upgrade_invalid_currency(self, client, auth_headers):
        """Test upgrading with an unsupported currency is rejected."""
        response = client.post(
            "/api/subscriptions/upgrade",
            json={"tier": "premium", "currency": "XYZ", "provider": "stripe"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_upgrade_stripe_missing_payment_method(self, client, auth_headers):
        """Test Stripe upgrade without payment_method_id is rejected."""
        response = client.post(
            "/api/subscriptions/upgrade",
            json={"tier": "premium", "currency": "USD", "provider": "stripe"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_upgrade_invalid_provider(self, client, auth_headers):
        """Test upgrading with an invalid provider is rejected."""
        response = client.post(
            "/api/subscriptions/upgrade",
            json={"tier": "premium", "provider": "bitcoin"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_upgrade_unauthenticated(self, client):
        """Test unauthenticated upgrade is rejected."""
        response = client.post(
            "/api/subscriptions/upgrade",
            json={"tier": "premium", "provider": "stripe"},
        )
        assert response.status_code == 401

