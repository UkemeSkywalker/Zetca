"""
Property-based tests for authentication requirements on all scheduler endpoints.

Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints
Validates: Requirements 7.8

For any request to a scheduler endpoint, if the JWT token is missing, expired, or
invalid, the system should return a 401 status code.
"""

import os

# Ensure mock agent is used so we don't need the real SchedulerAgent module
os.environ.setdefault("USE_MOCK_AGENT", "true")

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st, HealthCheck
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from jose import jwt
from datetime import datetime, timedelta

from config import settings as app_settings

# Import app after env is configured so scheduler routes use mock agent
from main import app
from models.scheduler import ScheduledPostRecord


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


# All scheduler endpoints that require authentication
SCHEDULER_ENDPOINTS = [
    ("POST", "/api/scheduler/auto-schedule", {"strategy_id": "test-strategy-id"}),
    ("POST", "/api/scheduler/manual-schedule", {
        "copy_id": "test-copy-id",
        "scheduled_date": "2025-06-15",
        "scheduled_time": "09:30",
        "platform": "instagram",
    }),
    ("GET", "/api/scheduler/posts", None),
    ("GET", "/api/scheduler/posts/strategy/test-strategy-id", None),
    ("GET", "/api/scheduler/posts/test-post-id", None),
    ("PUT", "/api/scheduler/posts/test-post-id", {"status": "published"}),
    ("DELETE", "/api/scheduler/posts/test-post-id", None),
]


def _make_mock_record(**overrides) -> ScheduledPostRecord:
    """Create a mock ScheduledPostRecord for service mocking."""
    defaults = dict(
        id="test-post-id",
        strategy_id="test-strategy-id",
        copy_id="test-copy-id",
        user_id="test-user",
        content="Sample post content",
        platform="instagram",
        hashtags=["#test"],
        scheduled_date="2025-06-15",
        scheduled_time="09:30",
        status="scheduled",
        strategy_color="#3B82F6",
        strategy_label="TestBrand",
    )
    defaults.update(overrides)
    return ScheduledPostRecord(**defaults)


class TestSchedulerAuthenticationProperty:
    """
    Property 6: Authentication Required for All Scheduler Endpoints.

    For any request to a scheduler endpoint (/api/scheduler/auto-schedule,
    /api/scheduler/manual-schedule, /api/scheduler/posts, /api/scheduler/posts/strategy/{id},
    /api/scheduler/posts/{id}), if the JWT token is missing, expired, or invalid,
    the system should return a 401 status code.

    Validates: Requirements 7.8
    """

    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)

    @pytest.fixture
    def mock_scheduler_service(self):
        """Mock the scheduler service to avoid actual agent/DB calls."""
        with patch("routes.scheduler.scheduler_service") as mock_service:
            mock_record = _make_mock_record()
            mock_service.auto_schedule = AsyncMock(return_value=[mock_record])
            mock_service.manual_schedule = AsyncMock(return_value=mock_record)
            mock_service.list_posts_by_user = AsyncMock(return_value=[mock_record])
            mock_service.list_posts_by_strategy = AsyncMock(return_value=[mock_record])
            mock_service.get_post = AsyncMock(return_value=(mock_record, False))
            mock_service.update_post = AsyncMock(return_value=mock_record)
            mock_service.delete_post = AsyncMock(return_value=(True, False))
            yield mock_service

    # --- No token tests ---

    def test_property_all_scheduler_endpoints_reject_missing_token(self, client, mock_scheduler_service):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        All scheduler endpoints should return 401 or 403 when no Authorization header is provided.
        """
        for method, path, body in SCHEDULER_ENDPOINTS:
            if method == "POST":
                response = client.post(path, json=body)
            elif method == "GET":
                response = client.get(path)
            elif method == "PUT":
                response = client.put(path, json=body)
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
    def test_property_auto_schedule_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token, POST /api/scheduler/auto-schedule should return 401.
        """
        response = client.post(
            "/api/scheduler/auto-schedule",
            json={"strategy_id": "test-strategy-id"},
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on POST /auto-schedule, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_manual_schedule_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token, POST /api/scheduler/manual-schedule should return 401.
        """
        response = client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": "test-copy-id",
                "scheduled_date": "2025-06-15",
                "scheduled_time": "09:30",
                "platform": "instagram",
            },
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on POST /manual-schedule, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_list_posts_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token, GET /api/scheduler/posts should return 401.
        """
        response = client.get(
            "/api/scheduler/posts",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on GET /posts, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        strategy_id=st.uuids().map(str),
    )
    def test_property_list_posts_by_strategy_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token, strategy_id
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token and any strategy ID, GET /api/scheduler/posts/strategy/{id} should return 401.
        """
        response = client.get(
            f"/api/scheduler/posts/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on GET /posts/strategy/{{id}}, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        post_id=st.uuids().map(str),
    )
    def test_property_get_post_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token, post_id
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token and any post ID, GET /api/scheduler/posts/{id} should return 401.
        """
        response = client.get(
            f"/api/scheduler/posts/{post_id}",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on GET /posts/{{id}}, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        post_id=st.uuids().map(str),
    )
    def test_property_update_post_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token, post_id
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token and any post ID, PUT /api/scheduler/posts/{id} should return 401.
        """
        response = client.put(
            f"/api/scheduler/posts/{post_id}",
            json={"status": "published"},
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on PUT /posts/{{id}}, got {response.status_code}"
        )

    @hypothesis_settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(
        invalid_token=invalid_token_strategy(),
        post_id=st.uuids().map(str),
    )
    def test_property_delete_post_rejects_invalid_tokens(
        self, client, mock_scheduler_service, invalid_token, post_id
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any invalid JWT token and any post ID, DELETE /api/scheduler/posts/{id} should return 401.
        """
        response = client.delete(
            f"/api/scheduler/posts/{post_id}",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401, (
            f"Expected 401 for invalid token on DELETE /posts/{{id}}, got {response.status_code}"
        )

    # --- Positive case: valid token allows access ---

    @hypothesis_settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    @given(user_id=st.uuids().map(str))
    def test_property_valid_token_allows_access_to_all_scheduler_endpoints(
        self, client, mock_scheduler_service, user_id
    ):
        """
        Feature: scheduler-agent-backend, Property 6: Authentication Required for All Scheduler Endpoints

        For any valid JWT token, requests to scheduler endpoints should not return 401 or 403.
        This is the positive counterpart confirming valid tokens are accepted.
        """
        valid_token = create_valid_token(user_id=user_id)
        headers = {"Authorization": f"Bearer {valid_token}"}

        for method, path, body in SCHEDULER_ENDPOINTS:
            if method == "POST":
                response = client.post(path, json=body, headers=headers)
            elif method == "GET":
                response = client.get(path, headers=headers)
            elif method == "PUT":
                response = client.put(path, json=body, headers=headers)
            elif method == "DELETE":
                response = client.delete(path, headers=headers)

            assert response.status_code not in [401, 403], (
                f"Valid token should not get 401/403 on {method} {path}, got {response.status_code}"
            )
