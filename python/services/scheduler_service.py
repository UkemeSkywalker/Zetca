"""
Service layer for scheduling operations.

This module provides business logic for auto-scheduling copies via the AI agent,
manually scheduling individual posts, and full CRUD operations on scheduled posts.
It coordinates between the Scheduler Agent, Scheduler Repository, Copy Repository,
and Strategy Repository while enforcing user isolation and data integrity.
"""

import logging
from datetime import datetime, date, timedelta, UTC
from typing import List, Optional

from fastapi import HTTPException, status

from models.scheduler import (
    AutoScheduleOutput,
    ManualScheduleInput,
    ScheduledPostRecord,
    ScheduledPostUpdate,
)
from repositories.scheduler_repository import SchedulerRepository
from repositories.copy_repository import CopyRepository
from repositories.strategy_repository import StrategyRepository

logger = logging.getLogger(__name__)


class SchedulerService:
    """
    Business logic for scheduling operations.

    Coordinates between the Scheduler Agent (for AI-powered auto-scheduling),
    Scheduler Repository (for persistence), Copy Repository (for copy lookups),
    and Strategy Repository (for strategy context). Ensures that errors during
    agent calls do not result in incomplete database records.
    """

    STRATEGY_COLORS = [
        "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
        "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
    ]

    def __init__(
        self,
        agent,
        scheduler_repository: SchedulerRepository,
        copy_repository: CopyRepository,
        strategy_repository: StrategyRepository,
    ):
        self.agent = agent
        self.scheduler_repository = scheduler_repository
        self.copy_repository = copy_repository
        self.strategy_repository = strategy_repository

    def _get_strategy_color(self, strategy_id: str) -> str:
        """Derive a consistent color from strategyId hash."""
        return self.STRATEGY_COLORS[hash(strategy_id) % len(self.STRATEGY_COLORS)]

    @staticmethod
    def _validate_future_date(scheduled_date: str, scheduled_time: str = "23:59") -> None:
        """Raise 400 if the given date/time is in the past (UTC)."""
        try:
            dt = datetime.strptime(f"{scheduled_date} {scheduled_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date or time format: {scheduled_date} {scheduled_time}",
            )
        if dt <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot schedule a post in the past. The date {scheduled_date} at {scheduled_time} has already passed. Please choose a future date and time.",
            )

    @staticmethod
    def _ensure_future_date(scheduled_date: str) -> str:
        """If the date is today or in the past, bump it to tomorrow. Used as a safety net for agent output."""
        try:
            d = datetime.strptime(scheduled_date, "%Y-%m-%d").date()
        except ValueError:
            return scheduled_date
        today = date.today()
        if d <= today:
            return (today + timedelta(days=1)).isoformat()
        return scheduled_date

    async def _get_strategy_with_ownership(self, strategy_id: str, user_id: str):
        """Fetch a strategy and verify ownership. Raises 404/403 on failure."""
        exists = await self.strategy_repository.strategy_exists(strategy_id)
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found",
            )
        strategy = await self.strategy_repository.get_strategy_by_id(strategy_id, user_id)
        if strategy is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )
        return strategy

    async def auto_schedule(
        self, strategy_id: str, user_id: str
    ) -> List[ScheduledPostRecord]:
        """
        Auto-schedule all copies for a strategy using the AI agent.

        1. Fetch strategy (verify ownership -> 404/403)
        2. Fetch copies for strategy (400 if none)
        3. Call agent.auto_schedule() with strategy + copies data
        4. Create ScheduledPostRecord for each assignment with status "scheduled"
        5. Batch store all records

        If the agent fails, no records are stored.
        """
        strategy = await self._get_strategy_with_ownership(strategy_id, user_id)

        # Fetch copies for this strategy
        copies = await self.copy_repository.list_copies_by_strategy(strategy_id)
        if not copies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No copies available to schedule for this strategy",
            )

        # Build data dicts for the agent
        strategy_data = {
            "brand_name": strategy.brand_name,
            "industry": strategy.industry,
            "target_audience": strategy.target_audience,
            "goals": strategy.goals,
        }
        if strategy.strategy_output:
            strategy_data.update(strategy.strategy_output.model_dump())

        copies_data = [
            {
                "id": c.id,
                "text": c.text,
                "platform": c.platform,
                "hashtags": c.hashtags,
            }
            for c in copies
        ]

        # Call agent — if this raises, no records are written
        agent_output: AutoScheduleOutput = await self.agent.auto_schedule(
            strategy_data, copies_data
        )

        # Build a lookup for copy content
        copy_lookup = {c.id: c for c in copies}
        strategy_color = self._get_strategy_color(strategy_id)
        strategy_label = strategy.brand_name

        records = []
        for assignment in agent_output.posts:
            copy = copy_lookup.get(assignment.copy_id)
            content = copy.text if copy else ""
            hashtags = copy.hashtags if copy else []
            platform = assignment.platform or (copy.platform if copy else "")

            # Safety net: ensure the agent didn't return a past date
            safe_date = self._ensure_future_date(assignment.scheduled_date)

            records.append(
                ScheduledPostRecord(
                    strategy_id=strategy_id,
                    copy_id=assignment.copy_id,
                    user_id=user_id,
                    content=content,
                    platform=platform,
                    hashtags=hashtags,
                    scheduled_date=safe_date,
                    scheduled_time=assignment.scheduled_time,
                    status="scheduled",
                    strategy_color=strategy_color,
                    strategy_label=strategy_label,
                )
            )

        return await self.scheduler_repository.create_posts(records)

    async def manual_schedule(
        self, input: ManualScheduleInput, user_id: str
    ) -> ScheduledPostRecord:
        """
        Manually schedule a single copy.

        1. Validate date is in the future
        2. Fetch copy (verify ownership -> 404/403)
        3. Fetch associated strategy for color/label
        4. Create ScheduledPostRecord with status "scheduled"
        5. Store record
        """
        # Reject past dates with a clear message
        self._validate_future_date(input.scheduled_date, input.scheduled_time)

        # If content is provided directly (manual post from calendar), skip copy lookup
        if input.content and input.copy_id.startswith('manual'):
            record = ScheduledPostRecord(
                strategy_id='manual',
                copy_id=input.copy_id,
                user_id=user_id,
                content=input.content,
                platform=input.platform,
                hashtags=[],
                scheduled_date=input.scheduled_date,
                scheduled_time=input.scheduled_time,
                status="scheduled",
                media_id=input.media_id,
                media_type=input.media_type,
            )
            return await self.scheduler_repository.create_post(record)

        # Verify copy exists and belongs to user
        copy_exists = await self.copy_repository.copy_exists(input.copy_id)
        if not copy_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Copy not found",
            )
        copy = await self.copy_repository.get_copy_by_id(input.copy_id, user_id)
        if copy is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )

        # Fetch associated strategy for color/label
        strategy = await self.strategy_repository.get_strategy_by_id(copy.strategy_id)
        strategy_color = self._get_strategy_color(copy.strategy_id) if strategy else ""
        strategy_label = strategy.brand_name if strategy else ""

        record = ScheduledPostRecord(
            strategy_id=copy.strategy_id,
            copy_id=copy.id,
            user_id=user_id,
            content=copy.text,
            platform=input.platform,
            hashtags=copy.hashtags,
            scheduled_date=input.scheduled_date,
            scheduled_time=input.scheduled_time,
            status="scheduled",
            strategy_color=strategy_color,
            strategy_label=strategy_label,
            media_id=input.media_id,
            media_type=input.media_type,
        )

        return await self.scheduler_repository.create_post(record)

    async def create_post(
        self, post_data: dict, user_id: str
    ) -> ScheduledPostRecord:
        """Create a new post with status 'draft'."""
        record = ScheduledPostRecord(
            user_id=user_id,
            status="draft",
            **post_data,
        )
        return await self.scheduler_repository.create_post(record)

    async def get_post(
        self, post_id: str, user_id: str
    ) -> tuple[Optional[ScheduledPostRecord], bool]:
        """
        Get a post by ID with user isolation.

        Returns:
            (record, False)  — found and owned by user
            (None, True)     — exists but belongs to another user
            (None, False)    — does not exist
        """
        exists = await self.scheduler_repository.post_exists(post_id)
        if not exists:
            return (None, False)

        record = await self.scheduler_repository.get_post_by_id(post_id, user_id)
        if record is None:
            return (None, True)

        return (record, False)

    async def list_posts_by_user(
        self, user_id: str
    ) -> List[ScheduledPostRecord]:
        """List all posts for the authenticated user, sorted by scheduledDate ascending."""
        return await self.scheduler_repository.list_posts_by_user(user_id)

    async def list_posts_by_strategy(
        self, strategy_id: str, user_id: str
    ) -> List[ScheduledPostRecord]:
        """List posts for a strategy after verifying ownership."""
        await self._get_strategy_with_ownership(strategy_id, user_id)
        return await self.scheduler_repository.list_posts_by_strategy(strategy_id)

    async def update_post(
        self, post_id: str, updates: ScheduledPostUpdate, user_id: str
    ) -> ScheduledPostRecord:
        """Update a post after verifying ownership. Sets updatedAt."""
        record, belongs_to_other = await self.get_post(post_id, user_id)
        if belongs_to_other:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheduled post not found",
            )

        # Build updates dict — exclude_none for most fields, but preserve
        # explicit None for nullable fields (media_id, media_type) so the
        # repository can issue a REMOVE in DynamoDB.
        update_dict = updates.model_dump(exclude_none=True)

        # If the client explicitly sent media_id=null or media_type=null,
        # include them so the repository can REMOVE the DynamoDB attribute.
        for field in ('media_id', 'media_type'):
            if field in updates.model_fields_set and getattr(updates, field) is None:
                update_dict[field] = None

        if not update_dict:
            # Nothing to update, return existing record
            return record

        return await self.scheduler_repository.update_post(post_id, update_dict)

    async def delete_all_posts(self, user_id: str) -> int:
        """Delete all posts for the authenticated user. Returns count of deleted posts."""
        return await self.scheduler_repository.delete_all_by_user(user_id)

    async def delete_post(
        self, post_id: str, user_id: str
    ) -> tuple[bool, bool]:
        """
        Delete a post with user isolation.

        Returns:
            (True, False)  — deleted successfully
            (False, True)  — exists but belongs to another user
            (False, False) — does not exist
        """
        record, belongs_to_other = await self.get_post(post_id, user_id)
        if belongs_to_other:
            return (False, True)
        if record is None:
            return (False, False)

        await self.scheduler_repository.delete_post(post_id)
        return (True, False)
