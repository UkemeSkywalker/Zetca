"""
Pydantic models for strategy data validation and serialization.

These models define the structure for strategy input, output, and database records.
They provide automatic validation, type checking, and JSON serialization.
"""

from datetime import datetime, UTC
from typing import List, Literal
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict


class StrategyInput(BaseModel):
    """
    Input model for strategy generation requests.
    
    All fields are required and must be non-empty strings.
    """
    brand_name: str = Field(
        ..., 
        min_length=1,
        description="Brand or company name",
        json_schema_extra={"example": "TechCorp"}
    )
    industry: str = Field(
        ..., 
        min_length=1,
        description="Industry or business sector",
        json_schema_extra={"example": "SaaS"}
    )
    target_audience: str = Field(
        ..., 
        min_length=1,
        description="Target audience description",
        json_schema_extra={"example": "B2B decision makers"}
    )
    goals: str = Field(
        ..., 
        min_length=1,
        description="Business goals and objectives",
        json_schema_extra={"example": "Increase brand awareness and lead generation"}
    )

    @field_validator('brand_name', 'industry', 'target_audience', 'goals')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure fields are not just whitespace."""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only')
        return v.strip()


class PlatformRecommendation(BaseModel):
    """
    Social media platform recommendation with rationale.
    """
    platform: str = Field(
        ..., 
        description="Platform name (e.g., Instagram, LinkedIn, Twitter)",
        json_schema_extra={"example": "LinkedIn"}
    )
    rationale: str = Field(
        ..., 
        description="Why this platform is recommended for the brand",
        json_schema_extra={"example": "Ideal for reaching B2B decision makers"}
    )
    priority: Literal['high', 'medium', 'low'] = Field(
        ..., 
        description="Priority level for this platform",
        json_schema_extra={"example": "high"}
    )


class StrategyOutput(BaseModel):
    """
    Structured output model for generated social media strategies.
    
    This model is used as the structured_output_model for the Strands Agent,
    ensuring the agent returns properly formatted and validated strategy data.
    """
    content_pillars: List[str] = Field(
        ..., 
        min_length=3,
        max_length=6,
        description="3-6 core content themes that align with brand identity and resonate with the target audience",
        json_schema_extra={"example": ["Thought Leadership", "Product Innovation", "Customer Success"]}
    )
    posting_schedule: str = Field(
        ..., 
        description="Recommended posting frequency and optimal timing for maximum engagement",
        json_schema_extra={"example": "Post 3-4 times per week, Tuesday-Thursday 9-11 AM"}
    )
    platform_recommendations: List[PlatformRecommendation] = Field(
        ...,
        min_length=2,
        description="Recommended social media platforms with rationale and priority",
        json_schema_extra={"example": [
            {"platform": "LinkedIn", "rationale": "B2B audience", "priority": "high"}
        ]}
    )
    content_themes: List[str] = Field(
        ...,
        min_length=5,
        description="Specific content ideas and topics aligned with content pillars",
        json_schema_extra={"example": ["Industry trends analysis", "Product tutorials", "Customer testimonials"]}
    )
    engagement_tactics: List[str] = Field(
        ...,
        min_length=4,
        description="Strategies for audience interaction and community building",
        json_schema_extra={"example": ["Host weekly Q&A sessions", "Respond to comments within 2 hours"]}
    )
    visual_prompts: List[str] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="2-3 detailed image generation prompts that align with content themes and engagement tactics, designed to be passed to a Designer Agent for creating graphics",
        json_schema_extra={"example": [
            "Professional office workspace with diverse team collaborating on a project",
            "Modern tech product showcase with clean minimalist background"
        ]}
    )

    @field_validator('content_pillars')
    @classmethod
    def validate_content_pillars_count(cls, v: List[str]) -> List[str]:
        """Ensure content_pillars has 3-6 items."""
        if len(v) < 3:
            raise ValueError('content_pillars must have at least 3 items')
        if len(v) > 6:
            raise ValueError('content_pillars must have at most 6 items')
        return v

    @field_validator('platform_recommendations')
    @classmethod
    def validate_platform_recommendations_count(cls, v: List[PlatformRecommendation]) -> List[PlatformRecommendation]:
        """Ensure platform_recommendations has at least 2 items."""
        if len(v) < 2:
            raise ValueError('platform_recommendations must have at least 2 items')
        return v

    @field_validator('visual_prompts')
    @classmethod
    def validate_visual_prompts_count(cls, v: List[str]) -> List[str]:
        """Ensure visual_prompts has 2-3 items."""
        if len(v) < 2:
            raise ValueError('visual_prompts must have at least 2 items')
        if len(v) > 3:
            raise ValueError('visual_prompts must have at most 3 items')
        return v


class StrategyRecord(BaseModel):
    """
    Complete strategy record for database storage.
    
    Combines the input data, generated output, and metadata for persistence.
    """
    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique identifier for the strategy record"
    )
    user_id: str = Field(
        ..., 
        description="User ID from JWT token, ensures user isolation"
    )
    brand_name: str = Field(..., description="Brand or company name from input")
    industry: str = Field(..., description="Industry or business sector from input")
    target_audience: str = Field(..., description="Target audience description from input")
    goals: str = Field(..., description="Business goals and objectives from input")
    strategy_output: StrategyOutput = Field(..., description="Generated strategy data")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Timestamp when the strategy was created"
    )

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )
