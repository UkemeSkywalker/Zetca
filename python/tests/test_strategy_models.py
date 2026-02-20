"""
Unit tests for Pydantic strategy models.

Tests validation rules for StrategyInput, StrategyOutput, and StrategyRecord models.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from models.strategy import (
    StrategyInput,
    PlatformRecommendation,
    StrategyOutput,
    StrategyRecord
)


class TestStrategyInput:
    """Tests for StrategyInput model validation."""

    def test_valid_input(self):
        """Test that valid input is accepted."""
        input_data = StrategyInput(
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness"
        )
        assert input_data.brand_name == "TechCorp"
        assert input_data.industry == "SaaS"
        assert input_data.target_audience == "B2B decision makers"
        assert input_data.goals == "Increase brand awareness"

    def test_empty_brand_name_rejected(self):
        """Test that empty brand_name is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyInput(
                brand_name="",
                industry="SaaS",
                target_audience="B2B decision makers",
                goals="Increase brand awareness"
            )
        assert "brand_name" in str(exc_info.value)

    def test_empty_industry_rejected(self):
        """Test that empty industry is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyInput(
                brand_name="TechCorp",
                industry="",
                target_audience="B2B decision makers",
                goals="Increase brand awareness"
            )
        assert "industry" in str(exc_info.value)

    def test_empty_target_audience_rejected(self):
        """Test that empty target_audience is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyInput(
                brand_name="TechCorp",
                industry="SaaS",
                target_audience="",
                goals="Increase brand awareness"
            )
        assert "target_audience" in str(exc_info.value)

    def test_empty_goals_rejected(self):
        """Test that empty goals is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyInput(
                brand_name="TechCorp",
                industry="SaaS",
                target_audience="B2B decision makers",
                goals=""
            )
        assert "goals" in str(exc_info.value)

    def test_whitespace_only_fields_rejected(self):
        """Test that whitespace-only fields are rejected."""
        with pytest.raises(ValidationError):
            StrategyInput(
                brand_name="   ",
                industry="SaaS",
                target_audience="B2B decision makers",
                goals="Increase brand awareness"
            )

    def test_fields_are_trimmed(self):
        """Test that leading/trailing whitespace is trimmed."""
        input_data = StrategyInput(
            brand_name="  TechCorp  ",
            industry="  SaaS  ",
            target_audience="  B2B decision makers  ",
            goals="  Increase brand awareness  "
        )
        assert input_data.brand_name == "TechCorp"
        assert input_data.industry == "SaaS"
        assert input_data.target_audience == "B2B decision makers"
        assert input_data.goals == "Increase brand awareness"


class TestPlatformRecommendation:
    """Tests for PlatformRecommendation model validation."""

    def test_valid_platform_recommendation(self):
        """Test that valid platform recommendation is accepted."""
        platform = PlatformRecommendation(
            platform="LinkedIn",
            rationale="Ideal for B2B audience",
            priority="high"
        )
        assert platform.platform == "LinkedIn"
        assert platform.rationale == "Ideal for B2B audience"
        assert platform.priority == "high"

    def test_invalid_priority_rejected(self):
        """Test that invalid priority values are rejected."""
        with pytest.raises(ValidationError):
            PlatformRecommendation(
                platform="LinkedIn",
                rationale="Ideal for B2B audience",
                priority="critical"  # Invalid, must be high/medium/low
            )


class TestStrategyOutput:
    """Tests for StrategyOutput model validation."""

    def test_valid_strategy_output(self):
        """Test that valid strategy output is accepted."""
        output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Prompt 1", "Prompt 2"]
        )
        assert len(output.content_pillars) == 3
        assert len(output.platform_recommendations) == 2
        assert len(output.visual_prompts) == 2

    def test_content_pillars_requires_3_to_6_items(self):
        """Test that content_pillars requires 3-6 items."""
        # Too few (2 items)
        with pytest.raises(ValidationError) as exc_info:
            StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2"],
                posting_schedule="3 times per week",
                platform_recommendations=[
                    PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                    PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2"]
            )
        assert "content_pillars" in str(exc_info.value)

        # Too many (7 items)
        with pytest.raises(ValidationError) as exc_info:
            StrategyOutput(
                content_pillars=["P1", "P2", "P3", "P4", "P5", "P6", "P7"],
                posting_schedule="3 times per week",
                platform_recommendations=[
                    PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                    PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2"]
            )
        assert "content_pillars" in str(exc_info.value)

    def test_platform_recommendations_requires_at_least_2_items(self):
        """Test that platform_recommendations requires at least 2 items."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                posting_schedule="3 times per week",
                platform_recommendations=[
                    PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high")
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2"]
            )
        assert "platform_recommendations" in str(exc_info.value)

    def test_visual_prompts_requires_2_to_3_items(self):
        """Test that visual_prompts requires 2-3 items."""
        # Too few (1 item)
        with pytest.raises(ValidationError) as exc_info:
            StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                posting_schedule="3 times per week",
                platform_recommendations=[
                    PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                    PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1"]
            )
        assert "visual_prompts" in str(exc_info.value)

        # Too many (4 items)
        with pytest.raises(ValidationError) as exc_info:
            StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                posting_schedule="3 times per week",
                platform_recommendations=[
                    PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                    PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4"]
            )
        assert "visual_prompts" in str(exc_info.value)


class TestStrategyRecord:
    """Tests for StrategyRecord model validation."""

    def test_valid_strategy_record(self):
        """Test that valid strategy record is accepted."""
        strategy_output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Prompt 1", "Prompt 2"]
        )

        record = StrategyRecord(
            user_id="user-123",
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness",
            strategy_output=strategy_output
        )

        assert record.user_id == "user-123"
        assert record.brand_name == "TechCorp"
        assert record.id is not None  # Auto-generated UUID
        assert isinstance(record.created_at, datetime)

    def test_id_auto_generated(self):
        """Test that id is auto-generated if not provided."""
        strategy_output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Prompt 1", "Prompt 2"]
        )

        record1 = StrategyRecord(
            user_id="user-123",
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness",
            strategy_output=strategy_output
        )

        record2 = StrategyRecord(
            user_id="user-123",
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness",
            strategy_output=strategy_output
        )

        # Each record should have a unique ID
        assert record1.id != record2.id

    def test_created_at_auto_generated(self):
        """Test that created_at is auto-generated if not provided."""
        strategy_output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Prompt 1", "Prompt 2"]
        )

        record = StrategyRecord(
            user_id="user-123",
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness",
            strategy_output=strategy_output
        )

        assert isinstance(record.created_at, datetime)

    def test_json_serialization(self):
        """Test that StrategyRecord can be serialized to JSON."""
        strategy_output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(platform="LinkedIn", rationale="B2B", priority="high"),
                PlatformRecommendation(platform="Twitter", rationale="Engagement", priority="medium")
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Prompt 1", "Prompt 2"]
        )

        record = StrategyRecord(
            user_id="user-123",
            brand_name="TechCorp",
            industry="SaaS",
            target_audience="B2B decision makers",
            goals="Increase brand awareness",
            strategy_output=strategy_output
        )

        # Should be able to convert to dict and back
        json_data = record.model_dump()
        assert json_data["user_id"] == "user-123"
        assert json_data["brand_name"] == "TechCorp"
        assert "strategy_output" in json_data
        assert "content_pillars" in json_data["strategy_output"]
