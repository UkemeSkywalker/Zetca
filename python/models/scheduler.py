"""
Pydantic models for scheduler data validation and serialization.

These models define the structure for scheduler input, output, and database records.
They provide automatic validation, type checking, and JSON serialization for
auto-scheduling, manual scheduling, and scheduled post CRUD operations.
"""

from datetime import datetime, UTC
from typing import List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict


class AutoScheduleInput(BaseModel):
    """Input model for auto-schedule requests."""
    strategy_id: str = Field(
        ...,
        min_length=1,
        description="ID of the strategy to auto-schedule copies from"
    )

    @field_validator('strategy_id')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('strategy_id cannot be empty or whitespace only')
        return v.strip()


class ManualScheduleInput(BaseModel):
    """Input model for manual scheduling of a single post."""
    copy_id: str = Field(default="manual", min_length=1, description="ID of the copy to schedule (use 'manual' for direct content)")
    scheduled_date: str = Field(..., description="ISO 8601 date string (YYYY-MM-DD)")
    scheduled_time: str = Field(..., description="Time in HH:MM format")
    platform: str = Field(..., min_length=1, description="Target social media platform")
    content: Optional[str] = Field(default=None, description="Post content (required when copy_id is not a real copy)")
    media_id: Optional[str] = Field(default=None, description="Optional media attachment ID")
    media_type: Optional[str] = Field(default=None, description="Media type: image or video")

    @field_validator('copy_id', 'platform')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only')
        return v.strip()

    @field_validator('scheduled_date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('scheduled_date is required')
        try:
            datetime.strptime(v.strip(), '%Y-%m-%d')
        except ValueError:
            raise ValueError('scheduled_date must be in YYYY-MM-DD format')
        return v.strip()

    @field_validator('scheduled_time')
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('scheduled_time is required')
        try:
            datetime.strptime(v.strip(), '%H:%M')
        except ValueError:
            raise ValueError('scheduled_time must be in HH:MM format')
        return v.strip()


class PostAssignment(BaseModel):
    """A single post assignment from the Scheduler Agent."""
    copy_id: str = Field(..., description="ID of the copy being scheduled")
    scheduled_date: str = Field(..., description="ISO 8601 date string")
    scheduled_time: str = Field(..., description="Time in HH:MM format")
    platform: str = Field(..., description="Target platform")


class AutoScheduleOutput(BaseModel):
    """Structured output from the Scheduler Agent."""
    posts: List[PostAssignment] = Field(
        ...,
        min_length=1,
        description="List of post assignments with dates, times, and copy references"
    )


class ScheduledPostRecord(BaseModel):
    """Complete scheduled post record for database storage."""
    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique post identifier"
    )
    strategy_id: str = Field(..., description="Associated strategy ID")
    copy_id: str = Field(..., description="Associated copy ID")
    user_id: str = Field(..., description="Owner user ID from JWT")
    content: str = Field(..., description="Post text content")
    platform: str = Field(..., description="Target platform")
    hashtags: List[str] = Field(
        default_factory=list,
        description="Relevant hashtags"
    )
    scheduled_date: str = Field(..., description="ISO 8601 date string")
    scheduled_time: str = Field(..., description="Time in HH:MM format")
    status: str = Field(
        default="draft",
        description="Post status: draft, scheduled, or published"
    )
    strategy_color: str = Field(
        default="",
        description="Color assigned to the strategy for visual differentiation"
    )
    strategy_label: str = Field(
        default="",
        description="Strategy brand name for display"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Creation timestamp"
    )
    media_id: Optional[str] = Field(default=None, description="Optional media attachment ID")
    media_type: Optional[str] = Field(default=None, description="Media type: image or video")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Last modification timestamp"
    )

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {'draft', 'scheduled', 'published'}
        if v not in allowed:
            raise ValueError(f'status must be one of: {", ".join(allowed)}')
        return v

    model_config = ConfigDict(ser_json_timedelta='iso8601')


class ScheduledPostUpdate(BaseModel):
    """Input model for updating a scheduled post."""
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    content: Optional[str] = None
    platform: Optional[str] = None
    hashtags: Optional[List[str]] = None
    status: Optional[str] = None
    media_id: Optional[str] = None
    media_type: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {'draft', 'scheduled', 'published'}
            if v not in allowed:
                raise ValueError(f'status must be one of: {", ".join(allowed)}')
        return v

    @field_validator('scheduled_date')
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                datetime.strptime(v.strip(), '%Y-%m-%d')
            except ValueError:
                raise ValueError('scheduled_date must be in YYYY-MM-DD format')
        return v

    @field_validator('scheduled_time')
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                datetime.strptime(v.strip(), '%H:%M')
            except ValueError:
                raise ValueError('scheduled_time must be in HH:MM format')
        return v
