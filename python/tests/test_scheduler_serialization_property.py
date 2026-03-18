"""
Property-based tests for scheduler Pydantic model JSON serialization round-trip.

Property 2: Pydantic Model JSON Serialization Round-Trip
Validates: Requirements 1.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7

Tests that AutoScheduleInput, ManualScheduleInput, PostAssignment,
AutoScheduleOutput, ScheduledPostRecord, and ScheduledPostUpdate
survive JSON serialize/deserialize without data loss.
"""

import pytest
from hypothesis import given, settings, strategies as st
from datetime import datetime

from models.scheduler import (
    AutoScheduleInput,
    ManualScheduleInput,
    PostAssignment,
    AutoScheduleOutput,
    ScheduledPostRecord,
    ScheduledPostUpdate,
)


# --- Hypothesis strategies for generating valid model data ---

non_empty_str = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
).filter(lambda x: x.strip() != "")

valid_date = st.dates().map(lambda d: d.strftime("%Y-%m-%d"))
valid_time = st.times().map(lambda t: t.strftime("%H:%M"))
valid_status = st.sampled_from(["draft", "scheduled", "published"])
hashtag_list = st.lists(non_empty_str, min_size=0, max_size=5)


@st.composite
def auto_schedule_input_st(draw):
    return AutoScheduleInput(strategy_id=draw(non_empty_str))


@st.composite
def manual_schedule_input_st(draw):
    return ManualScheduleInput(
        copy_id=draw(non_empty_str),
        scheduled_date=draw(valid_date),
        scheduled_time=draw(valid_time),
        platform=draw(non_empty_str),
    )


@st.composite
def post_assignment_st(draw):
    return PostAssignment(
        copy_id=draw(non_empty_str),
        scheduled_date=draw(valid_date),
        scheduled_time=draw(valid_time),
        platform=draw(non_empty_str),
    )


@st.composite
def auto_schedule_output_st(draw):
    posts = draw(st.lists(post_assignment_st(), min_size=1, max_size=5))
    return AutoScheduleOutput(posts=posts)


@st.composite
def scheduled_post_record_st(draw):
    return ScheduledPostRecord(
        strategy_id=draw(non_empty_str),
        copy_id=draw(non_empty_str),
        user_id=draw(non_empty_str),
        content=draw(non_empty_str),
        platform=draw(non_empty_str),
        hashtags=draw(hashtag_list),
        scheduled_date=draw(valid_date),
        scheduled_time=draw(valid_time),
        status=draw(valid_status),
        strategy_color=draw(non_empty_str),
        strategy_label=draw(non_empty_str),
    )


@st.composite
def scheduled_post_update_st(draw):
    """Generate a ScheduledPostUpdate with at least one field set."""
    update = ScheduledPostUpdate(
        scheduled_date=draw(st.one_of(st.none(), valid_date)),
        scheduled_time=draw(st.one_of(st.none(), valid_time)),
        content=draw(st.one_of(st.none(), non_empty_str)),
        platform=draw(st.one_of(st.none(), non_empty_str)),
        hashtags=draw(st.one_of(st.none(), hashtag_list)),
        status=draw(st.one_of(st.none(), valid_status)),
    )
    return update


# --- Round-trip test classes ---


class TestAutoScheduleInputRoundTrip:
    """JSON round-trip for AutoScheduleInput."""

    @given(model=auto_schedule_input_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: AutoScheduleInput):
        json_str = model.model_dump_json()
        restored = AutoScheduleInput.model_validate_json(json_str)
        assert restored.strategy_id == model.strategy_id


class TestManualScheduleInputRoundTrip:
    """JSON round-trip for ManualScheduleInput."""

    @given(model=manual_schedule_input_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: ManualScheduleInput):
        json_str = model.model_dump_json()
        restored = ManualScheduleInput.model_validate_json(json_str)
        assert restored.copy_id == model.copy_id
        assert restored.scheduled_date == model.scheduled_date
        assert restored.scheduled_time == model.scheduled_time
        assert restored.platform == model.platform


class TestPostAssignmentRoundTrip:
    """JSON round-trip for PostAssignment."""

    @given(model=post_assignment_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: PostAssignment):
        json_str = model.model_dump_json()
        restored = PostAssignment.model_validate_json(json_str)
        assert restored == model


class TestAutoScheduleOutputRoundTrip:
    """JSON round-trip for AutoScheduleOutput."""

    @given(model=auto_schedule_output_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: AutoScheduleOutput):
        json_str = model.model_dump_json()
        restored = AutoScheduleOutput.model_validate_json(json_str)
        assert len(restored.posts) == len(model.posts)
        for original, roundtripped in zip(model.posts, restored.posts):
            assert roundtripped.copy_id == original.copy_id
            assert roundtripped.scheduled_date == original.scheduled_date
            assert roundtripped.scheduled_time == original.scheduled_time
            assert roundtripped.platform == original.platform


class TestScheduledPostRecordRoundTrip:
    """JSON round-trip for ScheduledPostRecord."""

    @given(model=scheduled_post_record_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: ScheduledPostRecord):
        json_str = model.model_dump_json()
        restored = ScheduledPostRecord.model_validate_json(json_str)
        assert restored.id == model.id
        assert restored.strategy_id == model.strategy_id
        assert restored.copy_id == model.copy_id
        assert restored.user_id == model.user_id
        assert restored.content == model.content
        assert restored.platform == model.platform
        assert restored.hashtags == model.hashtags
        assert restored.scheduled_date == model.scheduled_date
        assert restored.scheduled_time == model.scheduled_time
        assert restored.status == model.status
        assert restored.strategy_color == model.strategy_color
        assert restored.strategy_label == model.strategy_label
        assert restored.created_at == model.created_at
        assert restored.updated_at == model.updated_at

    @given(model=scheduled_post_record_st())
    @settings(max_examples=50)
    def test_dict_round_trip(self, model: ScheduledPostRecord):
        """Also verify model_dump/model_validate dict round-trip."""
        data = model.model_dump()
        restored = ScheduledPostRecord.model_validate(data)
        assert restored.id == model.id
        assert restored.status == model.status
        assert restored.created_at == model.created_at
        assert restored.updated_at == model.updated_at


class TestScheduledPostUpdateRoundTrip:
    """JSON round-trip for ScheduledPostUpdate."""

    @given(model=scheduled_post_update_st())
    @settings(max_examples=50)
    def test_json_round_trip(self, model: ScheduledPostUpdate):
        json_str = model.model_dump_json()
        restored = ScheduledPostUpdate.model_validate_json(json_str)
        assert restored.scheduled_date == model.scheduled_date
        assert restored.scheduled_time == model.scheduled_time
        assert restored.content == model.content
        assert restored.platform == model.platform
        assert restored.hashtags == model.hashtags
        assert restored.status == model.status
