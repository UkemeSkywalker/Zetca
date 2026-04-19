"""
Pydantic models for copy data validation and serialization.

These models define the structure for copy generation input, output, database records,
and chat refinement. They provide automatic validation, type checking, and JSON serialization.
"""

from datetime import datetime, UTC
from typing import List
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict


class CopyGenerateInput(BaseModel):
    """Input model for copy generation requests."""
    strategy_id: str = Field(
        ...,
        min_length=1,
        description="ID of the strategy to generate copies from"
    )

    @field_validator('strategy_id')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure strategy_id is not just whitespace."""
        if not v or not v.strip():
            raise ValueError('strategy_id cannot be empty or whitespace only')
        return v.strip()


class CopyItem(BaseModel):
    """A single generated copy item from the agent."""
    text: str = Field(..., description="The post caption text")
    platform: str = Field(..., description="Target social media platform")
    hashtags: List[str] = Field(
        default_factory=list,
        description="List of relevant hashtags"
    )


class CopyOutput(BaseModel):
    """Structured output from the Copywriter Agent."""
    copies: List[CopyItem] = Field(
        ...,
        min_length=1,
        description="List of generated copies, 7 variations per platform"
    )


class CopyRecord(BaseModel):
    """Complete copy record for database storage."""
    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique copy identifier"
    )
    strategy_id: str = Field(..., description="Associated strategy ID")
    user_id: str = Field(..., description="Owner user ID from JWT")
    text: str = Field(..., description="Post caption text")
    platform: str = Field(..., description="Target platform")
    hashtags: List[str] = Field(
        default_factory=list,
        description="Relevant hashtags"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Last modification timestamp"
    )

    model_config = ConfigDict(ser_json_timedelta='iso8601')


class ChatRequest(BaseModel):
    """Input model for chat refinement requests."""
    message: str = Field(
        ...,
        min_length=1,
        description="User message to refine the copy"
    )

    @field_validator('message')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure message is not just whitespace."""
        if not v or not v.strip():
            raise ValueError('message cannot be empty or whitespace only')
        return v.strip()


class ChatResponse(BaseModel):
    """Response from chat refinement."""
    updated_text: str = Field(..., description="Updated copy text")
    updated_hashtags: List[str] = Field(
        default_factory=list,
        description="Updated hashtags"
    )
    ai_message: str = Field(
        ...,
        description="AI explanation of changes made"
    )


class RefineTextRequest(BaseModel):
    """Input for standalone text refinement (no copy ID required)."""
    text: str = Field(..., min_length=1, description="Current post text to refine")
    platform: str = Field(..., min_length=1, description="Target platform")
    message: str = Field(..., min_length=1, description="User's refinement instruction")
    hashtags: List[str] = Field(default_factory=list, description="Current hashtags")

    @field_validator('text', 'platform', 'message')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only')
        return v.strip()
