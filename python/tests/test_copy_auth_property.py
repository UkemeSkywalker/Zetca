"""
Property-based tests for authentication requirements on all copy endpoints.

Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints
Validates: Requirements 5.6

For any request to a copy endpoint, if the JWT token is missing, expired, or
invalid, the system should return a 401 status code.
"""

import os

# Ensure mock agent is used so we don't need the real CopywriterAgent module
os.environ.setdefault("USE_MOCK_AGENT", "true")

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st, HealthCheck
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from jose import jwt
from datetime import datetime, timedelta

from config import settings as app_settings

# Import app after env is configured so copy routes use mock agent
from main import app
from models.copy import CopyRecord, ChatResponse


# --- Strategies ---

@st.composite
def invalid_token_strategy(draw):
    """Generate various types of invalid JWT tokens."""
    token_type = draw(st.sampled_from([
        "malformed",
        "random_ascii",
        "expired",
        "wrong_signature",
        "missing_user_id",
    ]))

    if token_type == "malformed":
        return "not.a.valid.jwt.token.format"
    elif token_type == "random_ascii":
        return draw(st.text(min_size=10, max_size=100, alphabet=st.characters(min_codepoint=33, max_codepoint=126)))
    elif token_type == "expired":
        payload = {
            "userId": "test-user",
            "exp": datetime.utcnow() - timedelta(hours=1),
        }
        return jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")
    elif token_type == "wrong_signature":
        payload = {
            "userId": "test-user",
            "exp": datetime.utcnow() + timedelta(hours=1),
        }
        return jwt.encode(payload, "wrong-secret-that-will-fail", algorithm="HS256")
    elif token_type == "missing_user_id":
        payload = {
            "email": "test@example.com",
            "exp": datetime.utcnow() + timedelta(hours=1),
        }
        return jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")

    return "invalid-token"


def create_valid_token(user_id: str = "test-user") -> str:
    """Create a valid JWT token for testing."""
    payload = {
        "userId": user_id,
        "email": "test@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")


# All copy endpoints that require authentication
COPY_ENDPOINTS = [
    ("POST", "/api/copy/generate", {"strategy_id": "test-strategy-id"}),
    ("GET", "/api/copy/list/test-strategy-id", None),
    ("GET", "/api/copy/test-copy-id", None),
    ("POST", "/api/copy/test-copy-id/chat", {"message": "make it shorter"}),
    ("DELETE", "/api/copy/test-copy-id", None),
]


class TestCopyAuthenticationProperty:
    """
    Property 6: Authentication Required for All Copy Endpoints.

    For any request to a copy endpoint (/api/copy/generate, /api/copy/list/{id},
    /api/copy/{id}, /api/copy/{id}/chat, /api/copy/{id}), if the JWT token is
    missing, expired, or invalid, the system should return a 401 status code.

    Validates: Requirements 5.6
    """

    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)

    @pytest.fixture
    def mock_copy_service(self):
        """Mock the copy service to avoid actual agent/DB calls."""
        with patch("routes.copy.copy_service") as mock_service:
            mock_record = CopyRecord(
                id="test-copy-id",
                strategy_id="test-strategy-id",
                user_id="test-user",
                text="Sample copy text",
                platform="instagram",
                hashtags=["#test"],
            )
            mock_service.generate_copies = AsyncMock(return_value=[mock_record])
            mock_service.get_copies_by_strategy = AsyncMock(return_value=[mock_record])
            mock_service.get_copy = AsyncMock(return_value=(mock_record, False))
            mock_service.chat_refine_copy = AsyncMock(
                return_value=(
                    ChatResponse(
                        updated_text="Updated text",
                        updated_hashtags=["#updated"],
                        ai_message="Made it shorter",
                    ),
                    mock_record,
                )
            )
            mock_service.delete_copy = AsyncMock(return_value=(True, False))
            yield mock_service

    # --- No token tests ---

    def test_property_all_copy_endpoints_reject_missing_token(self, client, mock_copy_service):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        All copy endpoints should return 401 or 403 when no Authorization header is provided.
        """
        for method, path, body in COPY_ENDPOINTS:
            if method == "POST":
                response = client.post(path, json=body)
            elif method == "GET":
                response = client.get(path)
            elif method == "DELETE":
                response = client.delete(path)

            assert response.status_code in [401, 403], (
                f"{method} {path} should require auth, got {response.status_code}"
            )
            assert "detail" in response.json()

    # --- Invalid token tests (property-based) ---

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_generate_rejects_invalid_tokens(
        self, client, mock_copy_service, invalid_token
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any invalid JWT token, POST /api/copy/generate should return 401.
        """
        response = client.post(
            "/api/copy/generate",
            json={"strategy_id": "test-strategy-id"},
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on POST /generate, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_list_rejects_invalid_tokens(
        self, client, mock_copy_service, invalid_token
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any invalid JWT token, GET /api/copy/list/{strategyId} should return 401.
        """
        response = client.get(
            "/api/copy/list/test-strategy-id",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on GET /list, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        copy_id=st.uuids().map(str),
    )
    def test_property_get_copy_rejects_invalid_tokens(
        self, client, mock_copy_service, invalid_token, copy_id
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any invalid JWT token and any copy ID, GET /api/copy/{copyId} should return 401.
        """
        response = client.get(
            f"/api/copy/{copy_id}",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on GET /copy/{{id}}, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_chat_rejects_invalid_tokens(
        self, client, mock_copy_service, invalid_token
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any invalid JWT token, POST /api/copy/{copyId}/chat should return 401.
        """
        response = client.post(
            "/api/copy/test-copy-id/chat",
            json={"message": "make it shorter"},
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on POST /chat, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        copy_id=st.uuids().map(str),
    )
    def test_property_delete_rejects_invalid_tokens(
        self, client, mock_copy_service, invalid_token, copy_id
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any invalid JWT token and any copy ID, DELETE /api/copy/{copyId} should return 401.
        """
        response = client.delete(
            f"/api/copy/{copy_id}",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on DELETE /copy/{{id}}, got {response.status_code}"
        )

    # --- Positive case: valid token allows access ---

    @hypothesis_settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(user_id=st.uuids().map(str))
    def test_property_valid_token_allows_access_to_all_copy_endpoints(
        self, client, mock_copy_service, user_id
    ):
        """
        Feature: copywriter-agent-backend, Property 6: Authentication Required for All Copy Endpoints

        For any valid JWT token, requests to copy endpoints should not return 401 or 403.
        This is the positive counterpart confirming valid tokens are accepted.
        """
        valid_token = create_valid_token(user_id=user_id)
        headers = {"Authorization": f"Bearer {valid_token}"}

        for method, path, body in COPY_ENDPOINTS:
            if method == "POST":
                response = client.post(path, json=body, headers=headers)
            elif method == "GET":
                response = client.get(path, headers=headers)
            elif method == "DELETE":
                response = client.delete(path, headers=headers)

            assert response.status_code not in [401, 403], (
                f"Valid token should not get 401/403 on {method} {path}, got {response.status_code}"
            )
