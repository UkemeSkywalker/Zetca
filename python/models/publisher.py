"""
Pydantic models for publisher data validation and serialization.

These models define the structure for publish log records, LinkedIn API
request/response objects, and image upload responses. They provide automatic
validation, type checking, and JSON serialization for the publishing workflow.
"""

from datetime import datetime, UTC
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator


class PublishLogRecord(BaseModel):
    """A single publish attempt log entry."""
    log_id: str = Field(default_factory=lambda: str(uuid4()))
    post_id: str
    user_id: str
    platform: str = "linkedin"
    status: str  # "published", "failed", "skipped"
    linkedin_post_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    attempted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {'published', 'failed', 'skipped'}
        if v not in allowed:
            raise ValueError(f'status must be one of: {", ".join(allowed)}')
        return v


class LinkedInPostRequest(BaseModel):
    """Request body for LinkedIn Posts API."""
    author: str  # urn:li:person:{linkedinSub}
    commentary: str
    visibility: str = "PUBLIC"
    distribution: dict = Field(default_factory=lambda: {
        "feedDistribution": "MAIN_FEED",
        "targetEntities": [],
        "thirdPartyDistributionChannels": []
    })
    lifecycle_state: str = "PUBLISHED"
    is_reshare_disabled_by_author: bool = False
    content: Optional[dict] = None  # For image posts: {"media": {"id": "urn:li:image:..."}}


class LinkedInPostResponse(BaseModel):
    """Parsed response from LinkedIn Posts API."""
    status_code: int
    post_id: Optional[str] = None  # From x-restli-id header
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class LinkedInImageUploadResponse(BaseModel):
    """Parsed response from LinkedIn image upload initialization."""
    upload_url: str
    image_urn: str
