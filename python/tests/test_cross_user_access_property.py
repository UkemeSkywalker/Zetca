"""
Property-based tests for cross-user access control.

This module tests Property 12: Cross-User Access Returns 403
Validates Requirements 6.6
"""

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st, HealthCheck
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from jose import jwt
from datetime import datetime, timedelta

from main import app
from models.strategy import StrategyOutput, StrategyRecord, PlatformRecommendation
from config import settings as app_settings


def create_valid_token(user_id: str, secret: str = None) -> str:
    """Create a valid JWT token for testing."""
    if secret is None:
        secret = app_settings.jwt_secret
    payload = {
        "userId": user_id,
        "email": f"{user_id}@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@st.composite
def user_id_pair_strategy(draw):
    """Generate two distinct user IDs for testing cross-user access."""
    user_a = draw(st.text(min_size=5, max_size=50, alphabet=st.characters(
        min_codepoint=97, max_codepoint=122  # lowercase letters only
    )))
    user_b = draw(st.text(min_size=5, max_size=50, alphabet=st.characters(
        min_codepoint=97, max_codepoint=122
    )).filter(lambda x: x != user_a))  # Ensure different from user_a
    
    return (user_a, user_b)


@st.composite
def strategy_id_strategy(draw):
    """Generate a valid strategy ID (URL-safe characters only)."""
    # Use only alphanumeric characters and hyphens (URL-safe)
    return draw(st.text(
        min_size=10, 
        max_size=50, 
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),  # Uppercase, lowercase, digits
            whitelist_characters='-_'  # Also allow hyphens and underscores
        )
    ).filter(lambda x: len(x) >= 10))  # Ensure minimum length after filtering


class TestCrossUserAccessProperty:
    """
    Property-based tests for cross-user access control.
    
    **Validates: Requirements 6.6**
    """
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_strategy_service(self):
        """Mock the strategy service to simulate cross-user access scenarios."""
        with patch('routes.strategy.strategy_service') as mock_service:
            yield mock_service
    
    @hypothesis_settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        user_pair=user_id_pair_strategy(),
        strategy_id=strategy_id_strategy()
    )
    def test_property_cross_user_access_returns_403(
        self,
        client,
        mock_strategy_service,
        user_pair,
        strategy_id
    ):
        """
        **Property 12: Cross-User Access Returns 403**
        
        For any two distinct users A and B, if user A creates a strategy,
        then user B attempting to access that strategy by ID should receive
        a 403 Forbidden response.
        
        **Validates: Requirements 6.6**
        """
        user_a, user_b = user_pair
        
        # Mock the service to return (None, True) indicating strategy exists but belongs to another user
        mock_strategy_service.get_strategy = AsyncMock(return_value=(None, True))
        
        # Create valid token for user B
        token_user_b = create_valid_token(user_b)
        
        # User B attempts to access user A's strategy
        response = client.get(
            f"/api/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {token_user_b}"}
        )
        
        # Should return 403 Forbidden
        assert response.status_code == 403, \
            f"Expected 403 when user {user_b} accesses user {user_a}'s strategy, got {response.status_code}"
        
        # Response should contain appropriate error message
        assert "detail" in response.json(), "Response should contain error detail"
        assert "permission" in response.json()["detail"].lower() or "access denied" in response.json()["detail"].lower(), \
            "Error message should indicate permission/access issue"
    
    @hypothesis_settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        user_pair=user_id_pair_strategy(),
        strategy_id=strategy_id_strategy()
    )
    def test_property_own_strategy_access_allowed(
        self,
        client,
        mock_strategy_service,
        user_pair,
        strategy_id
    ):
        """
        **Property 12: Own Strategy Access Allowed (Positive Case)**
        
        For any user A, accessing their own strategy should NOT return 403.
        This verifies that the 403 response is specific to cross-user access.
        
        **Validates: Requirements 6.6 (by contrast)**
        """
        user_a, _ = user_pair
        
        # Create a mock strategy record belonging to user A
        mock_record = StrategyRecord(
            id=strategy_id,
            user_id=user_a,
            brand_name="Test Brand",
            industry="Test Industry",
            target_audience="Test Audience",
            goals="Test Goals",
            strategy_output=StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                posting_schedule="Daily at 9 AM",
                platform_recommendations=[
                    PlatformRecommendation(
                        platform="Instagram",
                        rationale="Visual content",
                        priority="high"
                    ),
                    PlatformRecommendation(
                        platform="LinkedIn",
                        rationale="Professional audience",
                        priority="medium"
                    )
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2"]
            )
        )
        
        # Mock the service to return the strategy (belongs to user A)
        mock_strategy_service.get_strategy = AsyncMock(return_value=(mock_record, False))
        
        # Create valid token for user A
        token_user_a = create_valid_token(user_a)
        
        # User A accesses their own strategy
        response = client.get(
            f"/api/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {token_user_a}"}
        )
        
        # Should NOT return 403 (may return 200, 404, 500, etc., but not 403)
        assert response.status_code != 403, \
            f"User {user_a} should be able to access their own strategy, got {response.status_code}"
    
    @hypothesis_settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        user_pair=user_id_pair_strategy(),
        strategy_id=strategy_id_strategy()
    )
    def test_property_nonexistent_strategy_returns_404_not_403(
        self,
        client,
        mock_strategy_service,
        user_pair,
        strategy_id
    ):
        """
        **Property 12: Non-existent Strategy Returns 404, Not 403**
        
        For any user attempting to access a non-existent strategy,
        the response should be 404 Not Found, not 403 Forbidden.
        
        This ensures that 403 is specifically for cross-user access,
        not for missing strategies.
        
        **Validates: Requirements 6.6, 6.7**
        """
        user_a, _ = user_pair
        
        # Mock the service to return (None, False) indicating strategy doesn't exist
        mock_strategy_service.get_strategy = AsyncMock(return_value=(None, False))
        
        # Create valid token for user A
        token_user_a = create_valid_token(user_a)
        
        # User A attempts to access non-existent strategy
        response = client.get(
            f"/api/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {token_user_a}"}
        )
        
        # Should return 404 Not Found, not 403 Forbidden
        assert response.status_code == 404, \
            f"Expected 404 for non-existent strategy, got {response.status_code}"
        
        # Should not return 403
        assert response.status_code != 403, \
            "Non-existent strategy should return 404, not 403"
    
    @hypothesis_settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        user_pair=user_id_pair_strategy(),
        strategy_id=strategy_id_strategy()
    )
    def test_property_403_message_is_descriptive(
        self,
        client,
        mock_strategy_service,
        user_pair,
        strategy_id
    ):
        """
        **Property 12: 403 Response Contains Descriptive Message**
        
        When a 403 Forbidden response is returned for cross-user access,
        the error message should clearly indicate a permission/access issue.
        
        **Validates: Requirements 6.6**
        """
        user_a, user_b = user_pair
        
        # Mock the service to return (None, True) indicating cross-user access
        mock_strategy_service.get_strategy = AsyncMock(return_value=(None, True))
        
        # Create valid token for user B
        token_user_b = create_valid_token(user_b)
        
        # User B attempts to access user A's strategy
        response = client.get(
            f"/api/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {token_user_b}"}
        )
        
        # Should return 403
        assert response.status_code == 403
        
        # Error message should be descriptive
        error_detail = response.json().get("detail", "").lower()
        
        # Should contain keywords related to permission/access
        permission_keywords = ["permission", "access", "denied", "forbidden", "not authorized"]
        assert any(keyword in error_detail for keyword in permission_keywords), \
            f"403 error message should indicate permission issue, got: {error_detail}"
    
    def test_property_list_endpoint_respects_user_isolation(
        self,
        client,
        mock_strategy_service
    ):
        """
        **Property 12: List Endpoint Respects User Isolation**
        
        The /list endpoint should only return strategies belonging to the
        authenticated user, never strategies from other users.
        
        This is a related property ensuring user isolation across all endpoints.
        
        **Validates: Requirements 4.7, 5.2, 5.4**
        """
        user_a = "user-a-test"
        user_b = "user-b-test"
        
        # Create mock strategies for user A
        strategies_user_a = [
            StrategyRecord(
                id="strategy-a-1",
                user_id=user_a,
                brand_name="Brand A1",
                industry="Industry A",
                target_audience="Audience A",
                goals="Goals A",
                strategy_output=StrategyOutput(
                    content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                    posting_schedule="Daily",
                    platform_recommendations=[
                        PlatformRecommendation(platform="Instagram", rationale="Visual", priority="high"),
                        PlatformRecommendation(platform="LinkedIn", rationale="Professional", priority="medium")
                    ],
                    content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                    engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                    visual_prompts=["Prompt 1", "Prompt 2"]
                )
            )
        ]
        
        # Mock service to return only user A's strategies
        mock_strategy_service.get_user_strategies = AsyncMock(return_value=strategies_user_a)
        
        # User A requests their strategies
        token_user_a = create_valid_token(user_a)
        response = client.get(
            "/api/strategy/list",
            headers={"Authorization": f"Bearer {token_user_a}"}
        )
        
        # Should return 200 with user A's strategies
        assert response.status_code == 200
        strategies = response.json()
        
        # All returned strategies should belong to user A
        for strategy in strategies:
            assert strategy["user_id"] == user_a, \
                f"List endpoint returned strategy belonging to {strategy['user_id']}, expected {user_a}"
