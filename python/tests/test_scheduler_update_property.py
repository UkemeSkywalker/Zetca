"""
Property-based tests for scheduler update round-trip with timestamp advancement.

This module tests Property 8: Update Round-Trip with Timestamp Advancement
- Updating fields and retrieving the post reflects updated values
- updatedAt >= original updatedAt after update
- Invalid status values are rejected

Validates: Requirements 4.3, 4.5, 4.6
"""

import pytest
from hypothesis import given, settings, assume, strategies as st
from uuid import uuid4
from datetime import datetime, UTC, timedelta
from pydantic import ValidationError

from models.scheduler import (
    ScheduledPostRecord,
    ScheduledPostUpdate,
)
from services.scheduler_service import SchedulerService
from repositories.scheduler_repository import SchedulerRepository
from repositories.copy_repository import CopyRepository
from repositories.strategy_repository import StrategyRepository


# --- Hypothesis strategies ---

PLATFORMS = ["instagram", "twitter", "linkedin", "facebook", "tiktok"]
VALID_STATUSES = ["draft", "scheduled", "published"]


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
def scheduled_post_data(draw):
    """Generate data for creating a ScheduledPostRecord."""
    return {
        "strategy_id": str(draw(st.uuids())),
        "copy_id": str(draw(st.uuids())),
        "content": draw(
            st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_categories=("Cs", "Cc")))
            .filter(lambda x: x.strip() != "")
        ),
        "platform": draw(st.sampled_from(PLATFORMS)),
        "hashtags": draw(
            st.lists(
                st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=("Cs", "Cc"))),
                min_size=0,
                max_size=5,
            )
        ),
        "scheduled_date": draw(valid_date_str()),
        "scheduled_time": draw(valid_time_str()),
    }


@st.composite
def update_fields(draw):
    """Generate a random subset of update fields, each optionally present."""
    update = {}
    if draw(st.booleans()):
        update["scheduled_date"] = draw(valid_date_str())
    if draw(st.booleans()):
        update["scheduled_time"] = draw(valid_time_str())
    if draw(st.booleans()):
        update["content"] = draw(
            st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_categories=("Cs", "Cc")))
            .filter(lambda x: x.strip() != "")
        )
    if draw(st.booleans()):
        update["platform"] = draw(st.sampled_from(PLATFORMS))
    if draw(st.booleans()):
        update["hashtags"] = draw(
            st.lists(
                st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=("Cs", "Cc"))),
                min_size=0,
                max_size=5,
            )
        )
    if draw(st.booleans()):
        update["status"] = draw(st.sampled_from(VALID_STATUSES))
    return update


# --- Mock helpers ---

def create_mock_scheduler_repository():
    """Create a mock scheduler repository with in-memory storage."""
    repo = SchedulerRepository.__new__(SchedulerRepository)
    repo._storage = {}

    async def mock_create_post(record: ScheduledPostRecord) -> ScheduledPostRecord:
        repo._storage[record.id] = record
        return record

    async def mock_get_post_by_id(post_id: str, user_id: str = None):
        if post_id not in repo._storage:
            return None
        record = repo._storage[post_id]
        if user_id is not None and record.user_id != user_id:
            return None
        return record

    async def mock_post_exists(post_id: str) -> bool:
        return post_id in repo._storage

    async def mock_update_post(post_id: str, updates: dict) -> ScheduledPostRecord:
        record = repo._storage[post_id]
        now = datetime.now(UTC)

        field_mapping = {
            "scheduled_date": "scheduled_date",
            "scheduled_time": "scheduled_time",
            "content": "content",
            "platform": "platform",
            "hashtags": "hashtags",
            "status": "status",
        }

        update_data = record.model_dump()
        for py_field in field_mapping:
            if py_field in updates and updates[py_field] is not None:
                update_data[py_field] = updates[py_field]
        update_data["updated_at"] = now

        updated_record = ScheduledPostRecord(**update_data)
        repo._storage[post_id] = updated_record
        return updated_record

    repo.create_post = mock_create_post
    repo.get_post_by_id = mock_get_post_by_id
    repo.post_exists = mock_post_exists
    repo.update_post = mock_update_post

    return repo


def create_service(scheduler_repo):
    """Create a SchedulerService with the given scheduler repo and dummy deps."""
    copy_repo = CopyRepository.__new__(CopyRepository)
    strategy_repo = StrategyRepository.__new__(StrategyRepository)
    return SchedulerService(
        agent=None,
        scheduler_repository=scheduler_repo,
        copy_repository=copy_repo,
        strategy_repository=strategy_repo,
    )


class TestSchedulerUpdateProperty:
    """
    Property-based tests for update round-trip with timestamp advancement.

    Feature: scheduler-agent-backend, Property 8: Update Round-Trip with Timestamp Advancement

    Validates: Requirements 4.3, 4.5, 4.6
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data=scheduled_post_data(),
        updates=update_fields(),
    )
    async def test_property_update_reflects_new_values(self, user_id, post_data, updates):
        """
        Property 8: For any existing post and any valid combination of update fields,
        updating and then retrieving the post should reflect the updated values.

        Validates: Requirement 4.3
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()
        service = create_service(scheduler_repo)

        # Create initial post
        record = ScheduledPostRecord(user_id=user_id_str, status="scheduled", **post_data)
        await scheduler_repo.create_post(record)

        # Build ScheduledPostUpdate from generated updates
        update_model = ScheduledPostUpdate(**updates)

        # Perform update via service
        updated = await service.update_post(record.id, update_model, user_id_str)

        # Retrieve the post independently
        retrieved = await scheduler_repo.get_post_by_id(record.id, user_id_str)
        assert retrieved is not None

        # Verify each updated field reflects the new value
        for field, value in updates.items():
            assert getattr(retrieved, field) == value, (
                f"Field '{field}' should be '{value}' after update, got '{getattr(retrieved, field)}'"
            )

        # Verify non-updated fields remain unchanged
        non_updated_fields = {
            "scheduled_date", "scheduled_time", "content", "platform", "hashtags", "status"
        } - set(updates.keys())
        for field in non_updated_fields:
            original_value = getattr(record, field)
            assert getattr(retrieved, field) == original_value, (
                f"Field '{field}' should remain '{original_value}', got '{getattr(retrieved, field)}'"
            )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data=scheduled_post_data(),
        updates=update_fields().filter(lambda u: len(u) > 0),
    )
    async def test_property_updated_at_advances(self, user_id, post_data, updates):
        """
        Property 8: For any update with at least one field changed,
        updatedAt after the update should be >= the original updatedAt.

        Validates: Requirement 4.5
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()
        service = create_service(scheduler_repo)

        # Create initial post with a known timestamp slightly in the past
        original_time = datetime.now(UTC) - timedelta(seconds=1)
        record = ScheduledPostRecord(
            user_id=user_id_str,
            status="scheduled",
            created_at=original_time,
            updated_at=original_time,
            **post_data,
        )
        await scheduler_repo.create_post(record)

        original_updated_at = record.updated_at

        # Perform update
        update_model = ScheduledPostUpdate(**updates)
        updated = await service.update_post(record.id, update_model, user_id_str)

        # updatedAt should have advanced
        assert updated.updated_at >= original_updated_at, (
            f"updatedAt ({updated.updated_at}) should be >= original ({original_updated_at})"
        )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        invalid_status=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=("Cs", "Cc")))
        .filter(lambda s: s.strip() not in {"draft", "scheduled", "published", ""})
    )
    async def test_property_invalid_status_rejected(self, invalid_status):
        """
        Property 8: For any status value not in {"draft", "scheduled", "published"},
        creating a ScheduledPostUpdate should raise a ValidationError.

        Validates: Requirement 4.6
        """
        with pytest.raises(ValidationError):
            ScheduledPostUpdate(status=invalid_status)

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        post_data=scheduled_post_data(),
    )
    async def test_property_empty_update_preserves_record(self, user_id, post_data):
        """
        Property 8: For any existing post, submitting an update with no fields
        should return the record unchanged (identity update).

        Validates: Requirement 4.3
        """
        user_id_str = str(user_id)
        scheduler_repo = create_mock_scheduler_repository()
        service = create_service(scheduler_repo)

        record = ScheduledPostRecord(user_id=user_id_str, status="scheduled", **post_data)
        await scheduler_repo.create_post(record)

        # Empty update
        update_model = ScheduledPostUpdate()
        result = await service.update_post(record.id, update_model, user_id_str)

        # All fields should match original
        assert result.id == record.id
        assert result.content == record.content
        assert result.platform == record.platform
        assert result.scheduled_date == record.scheduled_date
        assert result.scheduled_time == record.scheduled_time
        assert result.status == record.status
        assert result.hashtags == record.hashtags
