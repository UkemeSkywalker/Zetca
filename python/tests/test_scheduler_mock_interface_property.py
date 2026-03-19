"""
Property-based tests for mock scheduler agent interface compatibility.

Feature: scheduler-agent-backend, Property 11: Mock Agent Interface Compatibility

For any valid input accepted by the real SchedulerAgent's auto_schedule method,
the MockSchedulerAgent should also accept the same input and return the same
Pydantic model type (AutoScheduleOutput). The mock output should reference
the same copyIds that were provided in the input copies data.

**Validates: Requirements 11.4, 11.5**
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
    "text": st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != ""),
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
})


def _make_agent() -> MockSchedulerAgent:
    return MockSchedulerAgent()


class TestSchedulerMockInterfaceCompatibility:
    """
    Feature: scheduler-agent-backend, Property 11: Mock Agent Interface Compatibility

    **Validates: Requirements 11.4, 11.5**
    """

    @hypothesis_settings(max_examples=50, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=10),
    )
    @pytest.mark.asyncio
    async def test_property_auto_schedule_returns_auto_schedule_output(
        self, strategy_data: dict, copies_data: list
    ):
        """
        For any valid strategy_data and copies_data, MockSchedulerAgent.auto_schedule
        should return an AutoScheduleOutput with at least one PostAssignment.

        **Validates: Requirements 11.4**
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert isinstance(result, AutoScheduleOutput)
        assert len(result.posts) >= 1
        for post in result.posts:
            assert isinstance(post, PostAssignment)
            assert isinstance(post.copy_id, str) and len(post.copy_id) > 0
            assert isinstance(post.scheduled_date, str) and len(post.scheduled_date) > 0
            assert isinstance(post.scheduled_time, str) and len(post.scheduled_time) > 0
            assert isinstance(post.platform, str) and len(post.platform) > 0

    @hypothesis_settings(max_examples=50, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=10),
    )
    @pytest.mark.asyncio
    async def test_property_auto_schedule_references_provided_copy_ids(
        self, strategy_data: dict, copies_data: list
    ):
        """
        For any valid input, the mock output should reference the same copyIds
        that were provided in the input copies data.

        **Validates: Requirements 11.5**
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        input_copy_ids = {c["id"] for c in copies_data}
        output_copy_ids = {p.copy_id for p in result.posts}

        # Every output copy_id should come from the input
        assert output_copy_ids.issubset(input_copy_ids), (
            f"Output copy_ids {output_copy_ids - input_copy_ids} not in input"
        )

    @hypothesis_settings(max_examples=50, deadline=None)
    @given(
        strategy_data=strategy_data_strategy,
        copies_data=st.lists(copy_data_strategy, min_size=1, max_size=10),
    )
    @pytest.mark.asyncio
    async def test_property_auto_schedule_count_matches_copies(
        self, strategy_data: dict, copies_data: list
    ):
        """
        The number of returned PostAssignments should equal the number of
        input copies (one assignment per copy).

        **Validates: Requirements 11.4, 11.5**
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.auto_schedule(strategy_data, copies_data)

        assert len(result.posts) == len(copies_data)
