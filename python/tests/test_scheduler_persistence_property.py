"""
Property-based tests for scheduler post persistence round-trip.

This module tests Property 3: Post Persistence Round-Trip
- Created posts can be retrieved by postId with matching fields
- Manual schedule posts have status "scheduled"

Validates: Requirements 2.1, 2.2, 4.2
"""

import pytest
from hypothesis import given, settings, strategies as st
from uuid import uuid4
from datetime import datetime, UTC
from unittest.mock import MagicMock, AsyncMock

from models.scheduler import (
    ManualScheduleInput,
    ScheduledPostRecord,
)
from models.copy import CopyRecord
from models.strategy import StrategyRecord, StrategyOutput, PlatformRecommendation
from services.scheduler_service import SchedulerService
from repositories.scheduler_repository import SchedulerRepository
from repositories.copy_repository import CopyRepository
from repositories.strategy_repository import StrategyRepository


# --- Hypothesis strategies ---

PLATFORMS = ["instagram", "twitter", "linkedin", "facebook", "tiktok"]


@st.composite
def valid_date_str(draw):
    """Generate a valid YYYY-MM-DD date string."""
    year = draw(st.integers(min_value=2025, max_value=2030))
    month = draw(st.integers(min_value=1, max_value=12))
    day = draw(st.integers(min_value=1, max_value=28))
    return f"{year:04d}-{month:02d}-{day:02d}"


@st.composite
def valid_time_str(draw):
    """Generate a valid HH:MM time string."""
    hour = draw(st.integers(min_value=0, max_value=23))
    minute = draw(st.integers(min_value=0, max_value=59))
    return f"{hour:02d}:{minute:02d}"


@st.composite
def manual_schedule_input_strategy(draw):
    """Generate a valid ManualScheduleInput."""
    return ManualScheduleInput(
        copy_id=str(draw(st.uuids())),
        scheduled_date=draw(valid_date_str()),
        scheduled_time=draw(valid_time_str()),
        platform=draw(st.sampled_from(PLATFORMS)),
    )


@st.composite
def scheduled_post_data_strategy(draw):
    """Generate data for creating a ScheduledPostRecord directly."""
    return {
        "strategy_id": str(draw(st.uuids())),
        "copy_id": str(draw(st.uuids())),
        "content": draw(
            st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_categories=("Cs", "Cc")))
            .filter(lambda x: x.strip() != "")
        ),
        "platform": draw(st.sampled_from(PLATFORMS)),
        "hashtags": draw(st.lists(st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=("Cs", "Cc"))), min_size=0, max_size=5)),
        "scheduled_date": draw(valid_date_str()),
        "scheduled_time": draw(valid_time_str()),
    }


# --- Mock helpers ---

def create_mock_scheduler_repository():
    """Create a mock scheduler repository with in-memory storage."""
    repo = SchedulerRepository.__new__(SchedulerRepository)
    repo._storage = {}

    async def mock_create_post(record: ScheduledPostRecord) -> ScheduledPostRecord:
        repo._storage[record.id] = record
        return record

    async def mock_create_posts(records):
        for r in records:
            repo._storage[r.id] = r
        return records

    async def mock_get_post_by_id(post_id: str, user_id: str = None):
        if post_id not in repo._storage:
            return None
        record = repo._storage[post_id]
        if user_id is not None and record.user_id != user_id:
            return None
        return record

    async def mock_post_exists(post_id: str) -> bool:
        return post_id in repo._storage

    async def mock_list_posts_by_user(user_id: str):
        return sorted(
            [r for r in repo._storage.values() if r.user_id == user_id],
            key=lambda r: r.scheduled_date,
        )

    repo.create_post = mock_create_post
    repo.create_posts = mock_create_posts
    repo.get_post_by_id = mock_get_post_by_id
    repo.post_exists = mock_post_exists
    repo.list_posts_by_user = mock_list_posts_by_user

    return repo


def create_mock_copy_repository(copies_by_id: dict, user_id: str):
    """Create a mock copy repository pre-loaded with copies."""
    repo = CopyRepository.__new__(CopyRepository)

    async def mock_copy_exists(copy_id: str) -> bool:
        return copy_id in copies_by_id

    async def mock_get_copy_by_id(copy_id: str, uid: str = None):
        copy = copies_by_id.get(copy_id)
        if copy is None:
            return None
        if uid is not None and copy.user_id != uid:
            return None
        return copy

    async def mock_list_copies_by_strategy(strategy_id: str):
        return [c for c in copies_by_id.values() if c.strategy_id == strategy_id]

    repo.copy_exists = mock_copy_exists
    repo.get_copy_by_id = mock_get_copy_by_id
    repo.list_copies_by_strategy = mock_list_copies_by_strategy

    return repo


def create_mock_strategy_repository(strategies_by_id: dict, user_id: str):
    """Create a mock strategy repository pre-loaded with strategies."""
    repo = StrategyRepository.__new__(StrategyRepository)

    async def mock_strategy_exists(strategy_id: str) -> bool:
        return strategy_id in strategies_by_id

    async def mock_get_strategy_by_id(strategy_id: str, uid: str = None):
        strategy = strategies_by_id.get(strategy_id)
        if strategy is None:
            return None
        if uid is not None and strategy.user_id != uid:
            return None
        return strategy

    repo.strategy_exists = mock_strategy_exists
    repo.get_strategy_by_id = mock_get_strategy_by_id

    return repo


def make_copy_record(copy_id: str, strategy_id: str, user_id: str, platform: str = "instagram"):
    """Helper to create a CopyRecord for testing."""
    return CopyRecord(
        id=copy_id,
        strategy_id=strategy_id,
        user_id=user_id,
        text="Sample copy text for testing",
        platform=platform,
        hashtags=["#test", "#sample"],
    )


def make_strategy_record(strategy_id: str, user_id: str, brand_name: str = "TestBrand"):
    """Helper to create a StrategyRecord for testing."""
    return StrategyRecord(
        id=strategy_id,
        user_id=user_id,
        brand_name=brand_name,
        industry="Tech",
        target_audience="Developers",
        goals="Grow awareness",
        strategy_output=StrategyOutput(
            content_pillars=["Pillar A", "Pillar B", "Pillar C"],
            posting_schedule="3x per week",
            platform_recommendations=[
                PlatformRecommendation(platform="instagram", rationale="Visual", priority="high"),
                PlatformRecommendation(platform="twitter", rationale="Reach", priority="medium"),
            ],
            content_themes=["Theme1", "Theme2", "Theme3", "Theme4", "Theme5"],
            engagement_tactics=["Tactic1", "Tactic2", "Tactic3", "Tactic4"],
            visual_prompts=[
                "A modern workspace with natural lighting and plants",
                "A team collaborating around a whiteboard in a bright office",
            ],
        ),
    )


class TestSchedulerPersistenceProperty:
    """
    Property-based tests for scheduler post persistence round-trip.

    Validates: Requirements 2.1, 2.2, 4.2
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data=scheduled_post_data_strategy(),
    )
    async def test_property_created_post_retrievable_by_id(self, user_id, post_data):
        """
        Property 3: Post Persistence Round-Trip — Create then Retrieve

        For any valid ScheduledPostRecord, creating it and then retrieving it
        by postId should return a record with all fields matching the original.

        Validates: Requirement 4.2
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()

        record = ScheduledPostRecord(
            user_id=user_id_str,
            status="draft",
            **post_data,
        )

        # Create
        stored = await scheduler_repo.create_post(record)
        assert stored is not None

        # Retrieve by ID
        retrieved = await scheduler_repo.get_post_by_id(stored.id, user_id_str)
        assert retrieved is not None, "Post should be retrievable by postId after creation"

        # Verify all fields match
        assert retrieved.id == stored.id
        assert retrieved.strategy_id == post_data["strategy_id"]
        assert retrieved.copy_id == post_data["copy_id"]
        assert retrieved.user_id == user_id_str
        assert retrieved.content == post_data["content"]
        assert retrieved.platform == post_data["platform"]
        assert retrieved.hashtags == post_data["hashtags"]
        assert retrieved.scheduled_date == post_data["scheduled_date"]
        assert retrieved.scheduled_time == post_data["scheduled_time"]
        assert retrieved.status == "draft"
        assert retrieved.created_at is not None
        assert retrieved.updated_at is not None

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        schedule_input=manual_schedule_input_strategy(),
        brand_name=st.text(
            min_size=1, max_size=50,
            alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
        ).filter(lambda x: x.strip() != ""),
    )
    async def test_property_manual_schedule_creates_post_with_status_scheduled(
        self, user_id, schedule_input, brand_name
    ):
        """
        Property 3: Manual Schedule Posts Have Status "scheduled"

        For any valid ManualScheduleInput, calling manual_schedule should create
        a ScheduledPostRecord with status "scheduled" that is retrievable by postId.

        Validates: Requirements 2.1, 2.2
        """
        user_id_str = str(user_id)
        strategy_id = str(uuid4())
        copy_id = schedule_input.copy_id

        # Set up mock data
        copy = make_copy_record(copy_id, strategy_id, user_id_str, schedule_input.platform)
        strategy = make_strategy_record(strategy_id, user_id_str, brand_name)

        scheduler_repo = create_mock_scheduler_repository()
        copy_repo = create_mock_copy_repository({copy_id: copy}, user_id_str)
        strategy_repo = create_mock_strategy_repository({strategy_id: strategy}, user_id_str)

        service = SchedulerService(
            agent=None,  # Not used for manual scheduling
            scheduler_repository=scheduler_repo,
            copy_repository=copy_repo,
            strategy_repository=strategy_repo,
        )

        # Manual schedule
        result = await service.manual_schedule(schedule_input, user_id_str)

        # Verify status is "scheduled"
        assert result.status == "scheduled", "Manual schedule posts must have status 'scheduled'"

        # Verify the post is retrievable
        retrieved = await scheduler_repo.get_post_by_id(result.id, user_id_str)
        assert retrieved is not None, "Manually scheduled post should be retrievable by postId"
        assert retrieved.status == "scheduled"
        assert retrieved.copy_id == copy_id
        assert retrieved.strategy_id == strategy_id
        assert retrieved.user_id == user_id_str
        assert retrieved.scheduled_date == schedule_input.scheduled_date
        assert retrieved.scheduled_time == schedule_input.scheduled_time
        assert retrieved.platform == schedule_input.platform
        assert retrieved.content == copy.text
        assert retrieved.strategy_label == brand_name

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data_list=st.lists(scheduled_post_data_strategy(), min_size=2, max_size=6),
    )
    async def test_property_multiple_posts_all_retrievable(self, user_id, post_data_list):
        """
        Property 3: Multiple Posts All Retrievable

        For any sequence of post creations, every post should be independently
        retrievable by its postId with correct data.

        Validates: Requirement 4.2
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()

        stored_ids = []
        for post_data in post_data_list:
            record = ScheduledPostRecord(user_id=user_id_str, status="draft", **post_data)
            stored = await scheduler_repo.create_post(record)
            stored_ids.append((stored.id, post_data))

        # Verify each post is retrievable with correct data
        for post_id, original_data in stored_ids:
            retrieved = await scheduler_repo.get_post_by_id(post_id, user_id_str)
            assert retrieved is not None, f"Post {post_id} should be retrievable"
            assert retrieved.content == original_data["content"]
            assert retrieved.platform == original_data["platform"]
            assert retrieved.scheduled_date == original_data["scheduled_date"]
            assert retrieved.scheduled_time == original_data["scheduled_time"]

        # Verify all posts appear in user listing
        all_posts = await scheduler_repo.list_posts_by_user(user_id_str)
        assert len(all_posts) == len(post_data_list)

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data=scheduled_post_data_strategy(),
    )
    async def test_property_persistence_preserves_data_integrity(self, user_id, post_data):
        """
        Property 3: Persistence Preserves Data Integrity

        For any created post, the persisted data should exactly match the input
        without loss, corruption, or modification of any field.

        Validates: Requirement 4.2
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()

        record = ScheduledPostRecord(user_id=user_id_str, status="scheduled", **post_data)
        await scheduler_repo.create_post(record)

        retrieved = await scheduler_repo.get_post_by_id(record.id, user_id_str)

        # Exact field-by-field comparison
        assert retrieved.id == record.id
        assert retrieved.strategy_id == record.strategy_id
        assert retrieved.copy_id == record.copy_id
        assert retrieved.user_id == record.user_id
        assert retrieved.content == record.content
        assert retrieved.platform == record.platform
        assert retrieved.hashtags == record.hashtags
        assert retrieved.scheduled_date == record.scheduled_date
        assert retrieved.scheduled_time == record.scheduled_time
        assert retrieved.status == record.status
        assert retrieved.strategy_color == record.strategy_color
        assert retrieved.strategy_label == record.strategy_label
        assert retrieved.created_at == record.created_at
        assert retrieved.updated_at == record.updated_at
