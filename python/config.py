"""Configuration management for the Strategist Agent Backend.

This module provides environment-based configuration using Pydantic BaseSettings.
All settings are loaded from environment variables with sensible defaults where appropriate.
"""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables.
    
    This class uses Pydantic BaseSettings to automatically load configuration
    from environment variables. Missing required variables will raise validation
    errors at startup.
    """
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    
    # DynamoDB Configuration
    dynamodb_users_table: str = "users-dev"
    dynamodb_strategies_table: str = "strategies-dev"
    dynamodb_copies_table: str = "copies-dev"
    dynamodb_scheduled_posts_table: str = "scheduled-posts-dev"
    
    # JWT Configuration
    jwt_secret: str
    
    # Bedrock Configuration
    bedrock_model_id: str = "us.anthropic.claude-sonnet-4-6"
    
    # API Configuration
    frontend_url: str = "http://localhost:3000"
    api_port: int = 8000
    
    # Agent Configuration
    use_mock_agent: bool = False  # Set to True to use mock agent instead of real Bedrock
    
    # Timeout Configuration
    agent_timeout_seconds: int = 60
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
