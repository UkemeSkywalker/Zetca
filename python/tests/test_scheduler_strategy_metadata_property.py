"""
Property-based tests for strategy metadata consistency.

This module tests Property 12: Strategy Metadata Consistency
- strategyColor is deterministically derived from strategyId (same ID always yields same color)
- strategyLabel matches the strategy's brandName

Validates: Requirements 6.1, 6.3, 6.4, 6.5
"""

import pytest
from hypothesis import given, settings, strategies as st
from uuid import uuid4
from unittest.mock import AsyncMock

from models.scheduler import (
    AutoScheduleOutput,
    ManualScheduleInput,
    PostAssignment,
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
    year = draw(st.integers(min_value=2025, max_value=2030))
    month = draw(st.integers(min_value=1, max_value=12))
    day = draw(st.integers(min_value=1, max_value=28))
    return f"{year:04d}-{month:02d}-{day:02d}"


@st.composite
def valid_time_str(draw):
    hour = draw(st.integers(min_value=0, max_value=23))
    minute = draw(st.integers(min_value=0, max_value=59))
    return f"{hour:02d}:{minute:02d}"


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


def make_copy_record(copy_id, strategy_id, user_id, platform="instagram"):
    return CopyRecord(
        id=copy_id,
        strategy_id=strategy_id,
        user_id=user_id,
        text="Sample copy text for testing",
        platform=platform,
        hashtags=["#test", "#sample"],
    )


def make_strategy_record(strategy_id, user_id, brand_name="TestBrand"):
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
            visual_prompts=["A modern workspace", "A team collaborating in a bright office"],
        ),
    )


def make_mock_agent(copies_data_ref: list):
    """Create a mock agent that returns one PostAssignment per copy."""
    agent = AsyncMock()

    async def mock_auto_schedule(strategy_data, copies_data):
        copies_data_ref.clear()
        copies_data_ref.extend(copies_data)
        assignments = [
            PostAssignment(
                copy_id=c["id"],
                scheduled_date="2025-06-15",
                scheduled_time="10:00",
                platform=c.get("platform", "instagram"),
            )
            for c in copies_data
        ]
        return AutoScheduleOutput(posts=assignments)

    agent.auto_schedule = mock_auto_schedule
    return agent


class TestSchedulerStrategyMetadataProperty:
    """
    Property-based tests for strategy metadata consistency.

    Validates: Requirements 6.1, 6.3, 6.4, 6.5
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        strategy_id_a=st.uuids(),
        strategy_id_b=st.uuids(),
    )
    async def test_property_strategy_color_deterministic(self, strategy_id_a, strategy_id_b):
        """
        Property 12: strategyColor is deterministically derived from strategyId.

        Calling _get_strategy_color with the same strategyId must always return
        the same color, and the color must be one of the defined STRATEGY_COLORS.

        Validates: Requirements 6.3, 6.4
        """
        service = SchedulerService(
            agent=None,
            scheduler_repository=create_mock_scheduler_repository(),
            copy_repository=CopyRepository.__new__(CopyRepository),
            strategy_repository=StrategyRepository.__new__(StrategyRepository),
        )

        sid_a = str(strategy_id_a)
        sid_b = str(strategy_id_b)

        color_a1 = service._get_strategy_color(sid_a)
        color_a2 = service._get_strategy_color(sid_a)
        color_b1 = service._get_strategy_color(sid_b)
        color_b2 = service._get_strategy_color(sid_b)

        # Same ID always yields the same color
        assert color_a1 == color_a2, "Color must be deterministic for the same strategyId"
        assert color_b1 == color_b2, "Color must be deterministic for the same strategyId"

        # Colors must come from the defined palette
        assert color_a1 in SchedulerService.STRATEGY_COLORS
        assert color_b1 in SchedulerService.STRATEGY_COLORS

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        brand_name=st.text(
            min_size=1, max_size=80,
            alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
        ).filter(lambda x: x.strip() != ""),
        schedule_input=st.builds(
            ManualScheduleInput,
            copy_id=st.uuids().map(str),
            scheduled_date=valid_date_str(),
            scheduled_time=valid_time_str(),
            platform=st.sampled_from(PLATFORMS),
        ),
    )
    async def test_property_manual_schedule_label_matches_brand_name(
        self, user_id, brand_name, schedule_input
    ):
        """
        Property 12: strategyLabel matches the strategy's brandName on manual schedule.

        For any strategy with a given brandName, manually scheduling a copy from
        that strategy must produce a post whose strategyLabel equals the brandName.

        Validates: Requirements 6.1, 6.5
        """
        user_id_str = str(user_id)
        strategy_id = str(uuid4())
        copy_id = schedule_input.copy_id

        copy = make_copy_record(copy_id, strategy_id, user_id_str, schedule_input.platform)
        strategy = make_strategy_record(strategy_id, user_id_str, brand_name)

        scheduler_repo = create_mock_scheduler_repository()
        copy_repo = create_mock_copy_repository({copy_id: copy}, user_id_str)
        strategy_repo = create_mock_strategy_repository({strategy_id: strategy}, user_id_str)

        service = SchedulerService(
            agent=None,
            scheduler_repository=scheduler_repo,
            copy_repository=copy_repo,
            strategy_repository=strategy_repo,
        )

        result = await service.manual_schedule(schedule_input, user_id_str)

        assert result.strategy_label == brand_name, (
            f"strategyLabel must match brandName: expected {brand_name!r}, got {result.strategy_label!r}"
        )
        assert result.strategy_color in SchedulerService.STRATEGY_COLORS, (
            "strategyColor must be from the defined palette"
        )
        assert result.strategy_color == service._get_strategy_color(strategy_id), (
            "strategyColor must be deterministically derived from strategyId"
        )

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=None)
    @given(
        user_id=st.uuids(),
        brand_name=st.text(
            min_size=1, max_size=80,
            alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
        ).filter(lambda x: x.strip() != ""),
        num_copies=st.integers(min_value=1, max_value=4),
    )
    async def test_property_auto_schedule_metadata_consistency(
        self, user_id, brand_name, num_copies
    ):
        """
        Property 12: Auto-scheduled posts carry correct strategy metadata.

        For any strategy, all posts produced by auto_schedule must have
        strategyLabel == strategy.brandName and strategyColor deterministically
        derived from the strategyId.

        Validates: Requirements 6.1, 6.3, 6.4, 6.5
        """
        user_id_str = str(user_id)
        strategy_id = str(uuid4())

        copies = {}
        for i in range(num_copies):
            cid = str(uuid4())
            copies[cid] = make_copy_record(cid, strategy_id, user_id_str, "instagram")

        strategy = make_strategy_record(strategy_id, user_id_str, brand_name)

        scheduler_repo = create_mock_scheduler_repository()
        copy_repo = create_mock_copy_repository(copies, user_id_str)
        strategy_repo = create_mock_strategy_repository({strategy_id: strategy}, user_id_str)

        captured_copies: list = []
        agent = make_mock_agent(captured_copies)

        service = SchedulerService(
            agent=agent,
            scheduler_repository=scheduler_repo,
            copy_repository=copy_repo,
            strategy_repository=strategy_repo,
        )

        results = await service.auto_schedule(strategy_id, user_id_str)
        expected_color = service._get_strategy_color(strategy_id)

        assert len(results) == num_copies

        for post in results:
            assert post.strategy_label == brand_name, (
                f"strategyLabel must match brandName: expected {brand_name!r}, got {post.strategy_label!r}"
            )
            assert post.strategy_color == expected_color, (
                "All posts from the same strategy must share the same deterministic color"
            )
            assert post.strategy_color in SchedulerService.STRATEGY_COLORS

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=None)
    @given(
        user_id=st.uuids(),
        brand_names=st.lists(
            st.text(
                min_size=1, max_size=50,
                alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
            ).filter(lambda x: x.strip() != ""),
            min_size=2, max_size=4,
        ),
    )
    async def test_property_multiple_strategies_distinct_metadata(
        self, user_id, brand_names
    ):
        """
        Property 12: Posts from different strategies carry their own metadata.

        When manually scheduling copies from different strategies, each post's
        strategyLabel and strategyColor must correspond to its own strategy.

        Validates: Requirements 6.1, 6.3, 6.4, 6.5
        """
        user_id_str = str(user_id)

        strategies = {}
        all_copies = {}
        copy_to_strategy = {}

        for brand_name in brand_names:
            sid = str(uuid4())
            strategies[sid] = make_strategy_record(sid, user_id_str, brand_name)
            cid = str(uuid4())
            all_copies[cid] = make_copy_record(cid, sid, user_id_str)
            copy_to_strategy[cid] = sid

        scheduler_repo = create_mock_scheduler_repository()
        copy_repo = create_mock_copy_repository(all_copies, user_id_str)
        strategy_repo = create_mock_strategy_repository(strategies, user_id_str)

        service = SchedulerService(
            agent=None,
            scheduler_repository=scheduler_repo,
            copy_repository=copy_repo,
            strategy_repository=strategy_repo,
        )

        for cid, sid in copy_to_strategy.items():
            inp = ManualScheduleInput(
                copy_id=cid,
                scheduled_date="2025-07-01",
                scheduled_time="10:00",
                platform="instagram",
            )
            result = await service.manual_schedule(inp, user_id_str)

            expected_brand = strategies[sid].brand_name
            expected_color = service._get_strategy_color(sid)

            assert result.strategy_label == expected_brand
            assert result.strategy_color == expected_color
            assert result.strategy_color in SchedulerService.STRATEGY_COLORS
