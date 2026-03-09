"""
Property-based tests for authentication requirements on protected endpoints.

This module tests Property 3: Authentication Required for Protected Endpoints
Validates Requirements 1.1, 6.4
"""

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st, HealthCheck
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer
from unittest.mock import MagicMock, patch, AsyncMock
from jose import jwt
from datetime import datetime, timedelta

from main import app
from middleware.auth import AuthMiddleware, security
from models.strategy import StrategyInput, StrategyOutput, StrategyRecord, PlatformRecommendation
from config import settings as app_settings


# Hypothesis strategies for generating test data
@st.composite
def valid_strategy_input_strategy(draw):
    """Generate valid StrategyInput for testing."""
    return {
        "brand_name": draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != '')),
        "industry": draw(st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != '')),
        "target_audience": draw(st.text(min_size=1, max_size=100).filter(lambda x: x.strip() != '')),
        "goals": draw(st.text(min_size=1, max_size=150).filter(lambda x: x.strip() != ''))
    }


@st.composite
def invalid_token_strategy(draw):
    """Generate various types of invalid tokens for testing."""
    token_type = draw(st.sampled_from([
        'malformed',
        'random_ascii',
        'expired',
        'wrong_signature',
        'missing_user_id'
    ]))
    
    if token_type == 'malformed':
        return 'not.a.valid.jwt.token.format'
    elif token_type == 'random_ascii':
        # Only use ASCII-safe characters for HTTP headers
        return draw(st.text(min_size=10, max_size=100, alphabet=st.characters(min_codepoint=33, max_codepoint=126)))
    elif token_type == 'expired':
        # Generate an expired token with correct secret
        payload = {
            "userId": "test-user",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        return jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")
    elif token_type == 'wrong_signature':
        # Generate a token with wrong signature
        payload = {
            "userId": "test-user",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        return jwt.encode(payload, "wrong-secret-that-will-fail", algorithm="HS256")
    elif token_type == 'missing_user_id':
        # Generate a token without userId but with correct secret
        payload = {
            "email": "test@example.com",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        return jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")
    
    return 'invalid-token'


def create_valid_token(user_id: str = "test-user", secret: str = None) -> str:
    """Create a valid JWT token for testing."""
    if secret is None:
        secret = app_settings.jwt_secret
    payload = {
        "userId": user_id,
        "email": "test@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, secret, algorithm="HS256")


class TestAuthenticationProperty:
    """
    Property-based tests for authentication requirements.
    
    **Validates: Requirements 1.1, 6.4**
    """
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_strategy_service(self):
        """Mock the strategy service to avoid actual agent calls."""
        with patch('routes.strategy.strategy_service') as mock_service:
            # Mock the generate_and_store_strategy method
            mock_record = StrategyRecord(
                id="test-strategy-id",
                user_id="test-user",
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
            
            mock_service.generate_and_store_strategy = AsyncMock(return_value=mock_record)
            mock_service.get_user_strategies = AsyncMock(return_value=[mock_record])
            mock_service.get_strategy = AsyncMock(return_value=mock_record)
            
            yield mock_service
    
    @hypothesis_settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(strategy_input=valid_strategy_input_strategy())
    def test_property_generate_endpoint_requires_authentication(
        self,
        client,
        mock_strategy_service,
        strategy_input
    ):
        """
        **Property 3: Authentication Required for Protected Endpoints (POST /generate)**
        
        For any valid strategy input, attempting to call POST /api/strategy/generate
        without a valid JWT token should result in a 401 or 403 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to generate strategy without authentication
        response = client.post(
            "/api/strategy/generate",
            json=strategy_input
        )
        
        # Should return 401 or 403 Unauthorized (FastAPI returns 403 when no auth header)
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403 for unauthenticated request, got {response.status_code}"
        
        # Response should contain error detail
        assert "detail" in response.json(), "Response should contain error detail"
    
    @hypothesis_settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(invalid_token=invalid_token_strategy(), strategy_input=valid_strategy_input_strategy())
    def test_property_generate_endpoint_rejects_invalid_tokens(
        self,
        client,
        mock_strategy_service,
        invalid_token,
        strategy_input
    ):
        """
        **Property 3: Authentication Required for Protected Endpoints (Invalid Tokens)**
        
        For any invalid JWT token, attempting to call POST /api/strategy/generate
        should result in a 401 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to generate strategy with invalid token
        response = client.post(
            "/api/strategy/generate",
            json=strategy_input,
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            f"Expected 401 for invalid token, got {response.status_code}"
    
    def test_property_list_endpoint_requires_authentication(self, client, mock_strategy_service):
        """
        **Property 3: Authentication Required for Protected Endpoints (GET /list)**
        
        Attempting to call GET /api/strategy/list without a valid JWT token
        should result in a 401 or 403 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to list strategies without authentication
        response = client.get("/api/strategy/list")
        
        # Should return 401 or 403 Unauthorized (FastAPI returns 403 when no auth header)
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403 for unauthenticated request, got {response.status_code}"
        
        # Response should contain error detail
        assert "detail" in response.json(), "Response should contain error detail"
    
    @hypothesis_settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(invalid_token=invalid_token_strategy())
    def test_property_list_endpoint_rejects_invalid_tokens(
        self,
        client,
        mock_strategy_service,
        invalid_token
    ):
        """
        **Property 3: Authentication Required for Protected Endpoints (Invalid Tokens - List)**
        
        For any invalid JWT token, attempting to call GET /api/strategy/list
        should result in a 401 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to list strategies with invalid token
        response = client.get(
            "/api/strategy/list",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            f"Expected 401 for invalid token, got {response.status_code}"
    
    @hypothesis_settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(strategy_id=st.uuids())
    def test_property_get_by_id_endpoint_requires_authentication(
        self,
        client,
        mock_strategy_service,
        strategy_id
    ):
        """
        **Property 3: Authentication Required for Protected Endpoints (GET /:id)**
        
        For any strategy ID, attempting to call GET /api/strategy/:id without
        a valid JWT token should result in a 401 or 403 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to get strategy by ID without authentication
        response = client.get(f"/api/strategy/{strategy_id}")
        
        # Should return 401 or 403 Unauthorized (FastAPI returns 403 when no auth header)
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403 for unauthenticated request, got {response.status_code}"
        
        # Response should contain error detail
        assert "detail" in response.json(), "Response should contain error detail"
    
    @hypothesis_settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(strategy_id=st.uuids(), invalid_token=invalid_token_strategy())
    def test_property_get_by_id_endpoint_rejects_invalid_tokens(
        self,
        client,
        mock_strategy_service,
        strategy_id,
        invalid_token
    ):
        """
        **Property 3: Authentication Required for Protected Endpoints (Invalid Tokens - Get by ID)**
        
        For any strategy ID and invalid JWT token, attempting to call GET /api/strategy/:id
        should result in a 401 Unauthorized response.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Attempt to get strategy by ID with invalid token
        response = client.get(
            f"/api/strategy/{strategy_id}",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            f"Expected 401 for invalid token, got {response.status_code}"
    
    @hypothesis_settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        user_id=st.uuids(),
        strategy_input=valid_strategy_input_strategy()
    )
    def test_property_valid_token_allows_access(
        self,
        client,
        mock_strategy_service,
        user_id,
        strategy_input
    ):
        """
        **Property 3: Valid Authentication Allows Access**
        
        For any valid JWT token with a userId, requests to protected endpoints
        should be allowed (not return 401 or 403).
        
        This is the positive case - verifying that valid tokens DO work.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Create a valid token
        valid_token = create_valid_token(user_id=str(user_id))
        
        # Attempt to generate strategy with valid token
        response = client.post(
            "/api/strategy/generate",
            json=strategy_input,
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        # Should NOT return 401 or 403 (may return other codes like 200, 500, etc.)
        assert response.status_code not in [401, 403], \
            f"Valid token should not result in 401/403, got {response.status_code}"
    
    @hypothesis_settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(user_id=st.uuids())
    def test_property_all_protected_endpoints_require_auth(
        self,
        client,
        mock_strategy_service,
        user_id
    ):
        """
        **Property 3: All Protected Endpoints Require Authentication**
        
        For any user, all three protected endpoints (/generate, /list, /:id)
        should require authentication and reject requests without valid tokens.
        
        **Validates: Requirements 1.1, 6.4**
        """
        # Test POST /generate
        response_generate = client.post(
            "/api/strategy/generate",
            json={
                "brand_name": "Test",
                "industry": "Test",
                "target_audience": "Test",
                "goals": "Test"
            }
        )
        assert response_generate.status_code in [401, 403], \
            "POST /generate should require authentication"
        
        # Test GET /list
        response_list = client.get("/api/strategy/list")
        assert response_list.status_code in [401, 403], \
            "GET /list should require authentication"
        
        # Test GET /:id
        response_get = client.get(f"/api/strategy/{user_id}")
        assert response_get.status_code in [401, 403], \
            "GET /:id should require authentication"
    
    def test_property_health_endpoint_does_not_require_auth(self, client):
        """
        **Property: Public Endpoints Do Not Require Authentication**
        
        Public endpoints like /health should be accessible without authentication.
        This verifies that authentication is only applied to protected endpoints.
        
        **Validates: Requirements 1.1, 6.4 (by contrast)**
        """
        # Health endpoint should be accessible without auth
        response = client.get("/health")
        
        # Should return 200 OK, not 401
        assert response.status_code == 200, \
            f"Health endpoint should not require auth, got {response.status_code}"
        
        assert response.json()["status"] == "healthy"
