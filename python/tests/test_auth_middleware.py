"""Unit tests for JWT authentication middleware.

Tests the AuthMiddleware class to ensure proper JWT validation,
error handling, and user ID extraction.
"""

import pytest
from jose import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from middleware.auth import AuthMiddleware


@pytest.fixture
def jwt_secret():
    """Test JWT secret key."""
    return "test-secret-key-12345"


@pytest.fixture
def auth_middleware(jwt_secret):
    """Create an AuthMiddleware instance for testing."""
    return AuthMiddleware(jwt_secret=jwt_secret)


@pytest.fixture
def valid_token(jwt_secret):
    """Generate a valid JWT token for testing."""
    payload = {
        "userId": "test-user-123",
        "email": "test@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


@pytest.fixture
def expired_token(jwt_secret):
    """Generate an expired JWT token for testing."""
    payload = {
        "userId": "test-user-123",
        "email": "test@example.com",
        "exp": datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


@pytest.fixture
def token_without_user_id(jwt_secret):
    """Generate a JWT token without userId field."""
    payload = {
        "email": "test@example.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_valid_token_returns_user_id(auth_middleware, valid_token):
    """Test that a valid token returns the correct user ID."""
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=valid_token
    )
    
    user_id = await auth_middleware.get_current_user(credentials)
    
    assert user_id == "test-user-123"


@pytest.mark.asyncio
async def test_expired_token_raises_401(auth_middleware, expired_token):
    """Test that an expired token raises 401 Unauthorized."""
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=expired_token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await auth_middleware.get_current_user(credentials)
    
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_invalid_token_raises_401(auth_middleware):
    """Test that an invalid token raises 401 Unauthorized."""
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid.token.here"
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await auth_middleware.get_current_user(credentials)
    
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_token_without_user_id_raises_401(auth_middleware, token_without_user_id):
    """Test that a token without userId field raises 401 Unauthorized."""
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token_without_user_id
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await auth_middleware.get_current_user(credentials)
    
    assert exc_info.value.status_code == 401
    assert "userId" in exc_info.value.detail


@pytest.mark.asyncio
async def test_wrong_secret_raises_401(jwt_secret, valid_token):
    """Test that a token signed with different secret raises 401."""
    # Create middleware with different secret
    wrong_middleware = AuthMiddleware(jwt_secret="wrong-secret")
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=valid_token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await wrong_middleware.get_current_user(credentials)
    
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_empty_token_raises_401(auth_middleware):
    """Test that an empty token raises 401 Unauthorized."""
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=""
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await auth_middleware.get_current_user(credentials)
    
    assert exc_info.value.status_code == 401
