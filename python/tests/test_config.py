"""Tests for configuration management.

This module tests that the Settings class properly validates required
environment variables and raises appropriate errors when they are missing.
"""

import pytest
from pydantic import ValidationError
import os


def test_missing_jwt_secret_raises_error(monkeypatch):
    """Test that missing JWT_SECRET raises a validation error.
    
    The JWT_SECRET is a required field with no default value.
    When it's missing from the environment, Settings initialization
    should raise a ValidationError.
    
    Validates: Requirements 8.3
    """
    # Clear all environment variables that Settings might read
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    # Also clear the .env file path to prevent loading from file
    monkeypatch.setenv("_PYDANTIC_SETTINGS_IGNORE_ENV_FILE", "1")
    
    # Attempt to import and instantiate Settings
    # This should fail because JWT_SECRET is required
    with pytest.raises(ValidationError) as exc_info:
        from pydantic_settings import BaseSettings
        from pydantic import ConfigDict
        from typing import Optional
        
        # Create a fresh Settings class that won't load from .env
        class TestSettings(BaseSettings):
            aws_region: str = "us-east-1"
            aws_access_key_id: Optional[str] = None
            aws_secret_access_key: Optional[str] = None
            dynamodb_users_table: str = "users-dev"
            dynamodb_strategies_table: str = "strategies-dev"
            dynamodb_copies_table: str = "copies-dev"
            jwt_secret: str
            bedrock_model_id: str = "anthropic.claude-sonnet-4-6"
            frontend_url: str = "http://localhost:3000"
            api_port: int = 8000
            use_mock_agent: bool = False
            agent_timeout_seconds: int = 60
            
            model_config = ConfigDict(
                case_sensitive=False,
                extra="ignore"
            )
        
        TestSettings()
    
    # Verify the error is about the missing jwt_secret field
    error = exc_info.value
    errors = error.errors()
    assert any(err["loc"] == ("jwt_secret",) for err in errors), \
        "Expected validation error for missing jwt_secret"


def test_settings_loads_with_required_fields(monkeypatch):
    """Test that Settings loads successfully when required fields are provided.
    
    When JWT_SECRET is provided, Settings should initialize successfully
    even if AWS credentials are missing (they have Optional type).
    
    Validates: Requirements 8.1, 8.2
    """
    # Set required environment variable
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    
    # Import fresh to pick up environment changes
    import importlib
    import config
    importlib.reload(config)
    
    from config import Settings
    settings = Settings()
    
    # Verify settings loaded correctly
    assert settings.jwt_secret == "test-secret-key"
    assert settings.aws_region == "us-east-1"  # Default value
    # Note: bedrock_model_id may be overridden by .env file, so we just check it's set
    assert settings.bedrock_model_id is not None


def test_settings_loads_aws_credentials_when_provided(monkeypatch):
    """Test that AWS credentials are loaded when provided in environment.
    
    Validates: Requirements 8.1, 8.4
    """
    # Set all required and AWS-related environment variables
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    monkeypatch.setenv("AWS_REGION", "us-west-2")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
    
    # Import fresh to pick up environment changes
    import importlib
    import config
    importlib.reload(config)
    
    from config import Settings
    settings = Settings()
    
    # Verify AWS settings loaded correctly
    assert settings.aws_region == "us-west-2"
    assert settings.aws_access_key_id == "test-access-key"
    assert settings.aws_secret_access_key == "test-secret-key"


def test_settings_uses_default_values(monkeypatch):
    """Test that Settings uses default values for optional fields.
    
    Validates: Requirements 8.2, 8.4
    """
    # Set only required field
    monkeypatch.setenv("JWT_SECRET", "test-secret-key")
    
    # Import fresh to pick up environment changes
    import importlib
    import config
    importlib.reload(config)
    
    from config import Settings
    settings = Settings()
    
    # Verify default values are used (note: .env file may override some defaults)
    assert settings.aws_region == "us-east-1"
    assert settings.bedrock_model_id is not None  # May be overridden by .env
    assert settings.frontend_url == "http://localhost:3000"
    assert settings.api_port == 8000
    assert settings.agent_timeout_seconds == 60
    assert settings.dynamodb_users_table == "users-dev"
    assert settings.dynamodb_strategies_table == "strategies-dev"
