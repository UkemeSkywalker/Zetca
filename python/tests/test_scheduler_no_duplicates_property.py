"""
Property-based tests for auto-schedule no duplicate platform-date-time.

Feature: scheduler-agent-backend, Property 9: Auto-Schedule No Duplicate Platform-Date-Time

For any valid auto-schedule operation, no two post assignments should share the same
(platform, scheduledDate, scheduledTime) combination. Additionally, each post assignment
must reference a valid copyId from the input copies data.

**Validates: Requirements 1.3, 1.5**
"""

import pytest
from unittest.mock import patch
from hypothesis import given, settings as hypothesis_settings, strategies as st

from models.scheduler import AutoScheduleOutput, PostAssignment
from services.mock_scheduler_agent import MockSchedulerAgent


# --- Strategies ---

platform_strategy = st.sampled_from(
    ["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok"]
)

copy_data_strategy = st.fixed_dictionaries({
    "id": st.uuids().map(str),
    "platform": platform_strategy,
    "content": st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
    "hashtags": st.lists(
        st.text(min_size=1, max_size=20).map(lambda t: f"#{t}"),
        min_size=0, max_size=5,
    ),
})

strategy_data_strategy = st.fixed_dictionaries({
    "id": st.uuids().map(str),
    "brand_name": st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != ""),
    "posting_schedule": st.text(min_size=5, max_size=100),
    "platform_recommendations": st.lists(
        st.fixed_dictionaries({
            "platform": platform_strategy,
            "rationale": st.text(min_size=1, max_size=100),
            "priority": st.sampled_from(["high", "medium", "low"]),
        }),
        min_size=1, max_size=4,
    ),
    "content_themes": st.lists(
        st.text(min_size=1, max_size=30).filter(lambda x: x.strip() != ""),
        min_size=0, max_size=5,
    ),
})


def _make_mock_agent() -> MockSchedulerAgent:
    """Create a MockSchedulerAgent instance for testing."""
    return MockSchedulerAgent()


class TestSchedulerNoDuplicatesProperty:
    """
    Feature: scheduler-agent-backend, Property 9: Auto-Schedule No Duplicate Platform-Date-Time

    Tests that the scheduler agent produces post assignments with unique
    (platform, scheduledDate, scheduledTime) combinations and valid copyId references.

    **Validates: Requirements 1.3, 1.5**
    """

    @hypothesis_settings(max_examples=100, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=20),
    )
    @pytest.mark.asyncio
    async def test_property_no_duplicate_platform_date_time(
        self, strategy_data: dict, copies_data: list
    ):
        """
        For any valid auto-schedule operation, no two post assignments should
        share the same (platform, scheduledDate, scheduledTime) combination.

        This ensures the scheduler distributes posts across the calendar without
        scheduling multiple posts on the same platform at the exact same time.

        **Validates: Requirement 1.3**
        """
        agent = _make_mock_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert isinstance(result, AutoScheduleOutput)
        assert len(result.posts) >= 1

        # Collect all (platform, date, time) tuples
        slot_keys = []
        for post in result.posts:
            slot_key = (post.platform, post.scheduled_date, post.scheduled_time)
            slot_keys.append(slot_key)

        # Check for duplicates
        unique_slots = set(slot_keys)
        assert len(unique_slots) == len(slot_keys), (
            f"Duplicate (platform, date, time) found. "
            f"Total assignments: {len(slot_keys)}, Unique slots: {len(unique_slots)}. "
            f"Duplicates: {[k for k in slot_keys if slot_keys.count(k) > 1]}"
        )

    @hypothesis_settings(max_examples=100, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=20),
    )
    @pytest.mark.asyncio
    async def test_property_each_assignment_references_valid_copy_id(
        self, strategy_data: dict, copies_data: list
    ):
        """
        For any valid auto-schedule operation, each post assignment must
        reference a copyId that exists in the input copies data.

        This ensures the scheduler only schedules copies that were provided
        and doesn't generate phantom or invalid copy references.

        **Validates: Requirement 1.5**
        """
        agent = _make_mock_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert isinstance(result, AutoScheduleOutput)

        # Build set of valid copy IDs from input
        valid_copy_ids = {copy["id"] for copy in copies_data}

        # Verify each assignment references a valid copy
        for post in result.posts:
            assert post.copy_id in valid_copy_ids, (
                f"Post assignment references invalid copy_id '{post.copy_id}'. "
                f"Valid copy_ids: {valid_copy_ids}"
            )

    @hypothesis_settings(max_examples=50, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=2, max_size=15),
    )
    @pytest.mark.asyncio
    async def test_property_all_copies_are_scheduled(
        self, strategy_data: dict, copies_data: list
    ):
        """
        For any valid auto-schedule operation with multiple copies, each copy
        should receive exactly one post assignment.

        This ensures the scheduler doesn't skip any copies and doesn't
        schedule the same copy multiple times.

        **Validates: Requirements 1.3, 1.5**
        """
        agent = _make_mock_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert isinstance(result, AutoScheduleOutput)

        # Number of assignments should match number of copies
        assert len(result.posts) == len(copies_data), (
            f"Expected {len(copies_data)} assignments, got {len(result.posts)}"
        )

        # Each copy should be scheduled exactly once
        input_copy_ids = {copy["id"] for copy in copies_data}
        output_copy_ids = [post.copy_id for post in result.posts]

        # Check all input copies are represented
        assert set(output_copy_ids) == input_copy_ids, (
            f"Not all copies were scheduled. "
            f"Missing: {input_copy_ids - set(output_copy_ids)}, "
            f"Extra: {set(output_copy_ids) - input_copy_ids}"
        )

        # Check no copy is scheduled more than once
        assert len(output_copy_ids) == len(set(output_copy_ids)), (
            f"Some copies were scheduled multiple times. "
            f"Duplicates: {[cid for cid in output_copy_ids if output_copy_ids.count(cid) > 1]}"
        )

    @hypothesis_settings(max_examples=30, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        # Test with many copies on the same platform to stress duplicate avoidance
        platform=platform_strategy,
        num_copies=st.integers(min_value=5, max_value=15),
    )
    @pytest.mark.asyncio
    async def test_property_same_platform_copies_no_duplicates(
        self, strategy_data: dict, platform: str, num_copies: int
    ):
        """
        When multiple copies target the same platform, the scheduler must
        still produce unique (platform, date, time) combinations for each.

        This stress-tests the duplicate avoidance logic when all copies
        are for a single platform.

        **Validates: Requirement 1.3**
        """
        # Generate copies all targeting the same platform
        copies_data = [
            {
                "id": f"copy-{i}-{platform}",
                "platform": platform,
                "content": f"Test content for copy {i}",
                "hashtags": [f"#tag{i}"],
            }
            for i in range(num_copies)
        ]

        agent = _make_mock_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert isinstance(result, AutoScheduleOutput)
        assert len(result.posts) == num_copies

        # All posts should be for the same platform
        for post in result.posts:
            assert post.platform == platform

        # Collect (date, time) tuples for this platform
        date_time_slots = [(post.scheduled_date, post.scheduled_time) for post in result.posts]

        # All should be unique
        unique_slots = set(date_time_slots)
        assert len(unique_slots) == len(date_time_slots), (
            f"Duplicate (date, time) found for platform '{platform}'. "
            f"Total: {len(date_time_slots)}, Unique: {len(unique_slots)}"
        )

    @hypothesis_settings(max_examples=50, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=10),
    )
    @pytest.mark.asyncio
    async def test_property_valid_date_time_formats(
        self, strategy_data: dict, copies_data: list
    ):
        """
        All post assignments should have valid date (YYYY-MM-DD) and
        time (HH:MM) formats.

        **Validates: Requirements 1.3, 1.5**
        """
        from datetime import datetime

        agent = _make_mock_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        for post in result.posts:
            # Validate date format
            try:
                datetime.strptime(post.scheduled_date, "%Y-%m-%d")
            except ValueError:
                pytest.fail(
                    f"Invalid date format '{post.scheduled_date}' for copy {post.copy_id}. "
                    f"Expected YYYY-MM-DD format."
                )

            # Validate time format
            try:
                datetime.strptime(post.scheduled_time, "%H:%M")
            except ValueError:
                pytest.fail(
                    f"Invalid time format '{post.scheduled_time}' for copy {post.copy_id}. "
                    f"Expected HH:MM format."
                )
