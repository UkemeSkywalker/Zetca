"""
Real Scheduler Agent using Strands Agents SDK with Amazon Bedrock.

This module implements the production Scheduler Agent that uses the Strands Agents
Python SDK to intelligently schedule social media posts via Amazon Bedrock.
The agent analyzes strategy data (posting schedule, platform recommendations,
content themes) and copy content to distribute posts across optimal dates and times.
"""

import boto3
from strands import Agent
from strands.models.bedrock import BedrockModel
from models.scheduler import AutoScheduleOutput
from typing import Optional, List


class StructuredOutputException(Exception):
    """Raised when the agent fails to return structured output."""
    pass


class SchedulerAgent:
    """
    Production Scheduler Agent using Strands Agents SDK with Bedrock.

    This agent analyzes a strategy's posting schedule, platform recommendations,
    and content themes alongside copy content to determine optimal scheduling
    dates and times for each post. It uses structured output to ensure the
    response conforms to the AutoScheduleOutput Pydantic model.
    """

    def __init__(
        self,
        aws_region: str,
        model_id: str = "anthropic.claude-3-haiku-20240307-v1:0",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
    ):
        """
        Initialize the Scheduler Agent with Bedrock provider.

        Args:
            aws_region: AWS region for Bedrock API calls
            model_id: Bedrock model identifier
            aws_access_key_id: AWS access key ID (if None, uses default credential chain)
            aws_secret_access_key: AWS secret access key (if None, uses default credential chain)
        """
        if aws_access_key_id and aws_secret_access_key:
            boto_session = boto3.Session(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=aws_region,
            )
            self.model = BedrockModel(
                boto_session=boto_session,
                model_id=model_id,
            )
        else:
            self.model = BedrockModel(
                region_name=aws_region,
                model_id=model_id,
            )

        self.agent = Agent(
            model=self.model,
            system_prompt=self._get_system_prompt(),
        )

    def _get_system_prompt(self) -> str:
        """Return the system prompt instructing the agent to act as a scheduling optimizer."""
        return """You are an expert social media scheduling optimizer. Your job is to analyze
a brand's posting strategy and a set of ready-to-publish copies, then determine the optimal
date and time to publish each copy on its target platform.

When scheduling, follow these principles:

1. Respect the strategy's posting_schedule — honour the recommended frequency and preferred
   days/times for each platform.
2. Use platform_recommendations to prioritise platforms and align timing with peak engagement
   windows (e.g., LinkedIn mornings on weekdays, Instagram evenings and weekends).
3. Distribute copies evenly across the upcoming 2-4 weeks so the calendar is balanced.
4. NEVER schedule two posts on the same platform at the same date AND time — every
   (platform, scheduledDate, scheduledTime) combination must be unique.
5. Use content_themes to group thematically related posts on consecutive days when it
   makes sense for storytelling.
6. Prefer time slots known for high engagement on each platform:
   - Instagram: 11:00, 13:00, 17:00, 19:00
   - Twitter/X: 08:00, 12:00, 17:00
   - LinkedIn: 07:30, 09:00, 12:00
   - Facebook: 09:00, 13:00, 16:00
   - TikTok: 10:00, 14:00, 19:00, 21:00

For each copy provided, produce exactly one PostAssignment containing:
- copy_id: the id of the copy being scheduled (must match one of the provided copies)
- scheduled_date: an ISO 8601 date string (YYYY-MM-DD) in the near future
- scheduled_time: a time string in HH:MM format
- platform: the target social media platform

Return a structured AutoScheduleOutput with a "posts" list containing all assignments."""

    async def auto_schedule(
        self, strategy_data: dict, copies_data: List[dict]
    ) -> AutoScheduleOutput:
        """
        Analyze strategy and copies to determine optimal scheduling.

        Args:
            strategy_data: Strategy record data including posting_schedule,
                          platform_recommendations, content_themes, etc.
            copies_data: List of copy record dicts, each with at least id,
                        platform, content, and hashtags.

        Returns:
            AutoScheduleOutput with a PostAssignment for each copy.

        Raises:
            StructuredOutputException: If the agent fails to return structured output.
        """
        # Format strategy context
        posting_schedule = strategy_data.get("posting_schedule", "N/A")
        content_themes = strategy_data.get("content_themes", [])
        platform_recs = strategy_data.get("platform_recommendations", [])

        themes_str = (
            ", ".join(content_themes)
            if isinstance(content_themes, list)
            else str(content_themes)
        )

        if platform_recs and isinstance(platform_recs[0], dict):
            platform_str = ", ".join(
                p.get("platform", "") for p in platform_recs
            )
        elif isinstance(platform_recs, list):
            platform_str = ", ".join(str(p) for p in platform_recs)
        else:
            platform_str = str(platform_recs)

        # Format copies list
        copies_block = "\n".join(
            f"  - Copy ID: {c.get('id', c.get('copy_id', 'unknown'))}, "
            f"Platform: {c.get('platform', 'N/A')}, "
            f"Content preview: {str(c.get('content', ''))[:120]}"
            for c in copies_data
        )

        prompt = f"""Schedule the following copies based on the brand strategy below.

Strategy:
- Brand: {strategy_data.get("brand_name", "N/A")}
- Posting Schedule: {posting_schedule}
- Content Themes: {themes_str}
- Recommended Platforms: {platform_str}

Copies to schedule ({len(copies_data)} total):
{copies_block}

Produce exactly {len(copies_data)} PostAssignment entries — one per copy.
Each must reference the exact copy_id from the list above.
Ensure no two assignments share the same (platform, scheduled_date, scheduled_time)."""

        result = await self.agent.invoke_async(
            prompt, structured_output_model=AutoScheduleOutput
        )

        if result.structured_output is None:
            raise StructuredOutputException(
                "Scheduler agent failed to return structured output"
            )

        return result.structured_output
