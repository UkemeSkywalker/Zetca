"""
Property-based tests for ScheduledPostRecord completeness.

This module tests Property 4: ScheduledPostRecord Completeness
Validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
"""

import pytest
import re
from hypothesis import given, settings, strategies as st
from uuid import uuid4, UUID
from datetime import datetime, UTC
from unittest.mock import MagicMock

from models.scheduler import ScheduledPostRecord
from repositories.scheduler_repository import SchedulerRepository


# Valid statuses for scheduled posts
VALID_STATUSES = ['draft', 'scheduled', 'published']

# Date/time format patterns
DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
TIME_PATTERN = re.compile(r'^\d{2}:\d{2}$')


@st.composite
def scheduled_post_record_strategy(draw):
    """Generate random ScheduledPostRecord data for testing."""
    platforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok']

    content = draw(st.text(
        min_size=1,
        max_size=200,
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ).filter(lambda x: x.strip() != ''))

    hashtags = draw(st.lists(
        st.text(min_size=2, max_size=30, alphabet=st.characters(
            whitelist_categories=('L', 'N'),
        )).map(lambda x: f'#{x}'),
        min_size=0,
        max_size=10
    ))

    # Generate valid date (YYYY-MM-DD)
    year = draw(st.integers(min_value=2025, max_value=2030))
    month = draw(st.integers(min_value=1, max_value=12))
    day = draw(st.integers(min_value=1, max_value=28))
    scheduled_date = f'{year:04d}-{month:02d}-{day:02d}'

    # Generate valid time (HH:MM)
    hour = draw(st.integers(min_value=0, max_value=23))
    minute = draw(st.integers(min_value=0, max_value=59))
    scheduled_time = f'{hour:02d}:{minute:02d}'

    strategy_color = draw(st.sampled_from([
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
        '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
    ]))

    strategy_label = draw(st.text(
        min_size=1,
        max_size=50,
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ).filter(lambda x: x.strip() != ''))

    return {
        'strategy_id': str(draw(st.uuids())),
        'copy_id': str(draw(st.uuids())),
        'user_id': str(draw(st.uuids())),
        'content': content,
        'platform': draw(st.sampled_from(platforms)),
        'hashtags': hashtags,
        'scheduled_date': scheduled_date,
        'scheduled_time': scheduled_time,
        'status': draw(st.sampled_from(VALID_STATUSES)),
        'strategy_color': strategy_color,
        'strategy_label': strategy_label,
    }


def create_mock_scheduler_repository():
    """Create a mock scheduler repository with in-memory storage for testing."""
    repo = SchedulerRepository.__new__(SchedulerRepository)
    repo.table_name = "test-scheduled-posts"
    repo.region = "us-east-1"
    repo._storage = {}
    repo.table = MagicMock()

    async def mock_create_post(record: ScheduledPostRecord) -> ScheduledPostRecord:
        item = repo._record_to_item(record)
        repo._storage[record.id] = item
        return record

    async def mock_get_post_by_id(post_id: str, user_id: str = None):
        if post_id not in repo._storage:
            return None
        item = repo._storage[post_id]
        if user_id is not None and item['userId'] != user_id:
            return None
        return repo._item_to_record(item)

    repo.create_post = mock_create_post
    repo.get_post_by_id = mock_get_post_by_id

    return repo


class TestSchedulerRecordCompletenessProperty:
    """
    Property-based tests for ScheduledPostRecord completeness.

    **Property 4: ScheduledPostRecord Completeness**
    **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**
    """

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(post_data=scheduled_post_record_strategy())
    async def test_property_scheduled_post_record_has_all_required_fields(self, post_data):
        """
        For any ScheduledPostRecord stored and retrieved, all required fields must be
        present, non-empty, and correctly typed.

        **Validates: Requirements 3.1-3.12**
        """
        record = ScheduledPostRecord(**post_data)
        repo = create_mock_scheduler_repository()

        stored = await repo.create_post(record)
        retrieved = await repo.get_post_by_id(stored.id, post_data['user_id'])

        assert retrieved is not None, "Record should be retrievable after storage"

        # Req 3.1: unique postId (partition key)
        assert isinstance(retrieved.id, str) and len(retrieved.id) > 0
        UUID(retrieved.id)  # validates UUID format

        # Req 3.2: strategyId linking to Strategy_Record
        assert isinstance(retrieved.strategy_id, str) and len(retrieved.strategy_id) > 0
        assert retrieved.strategy_id == post_data['strategy_id']

        # Req 3.3: copyId linking to Copy_Record
        assert isinstance(retrieved.copy_id, str) and len(retrieved.copy_id) > 0
        assert retrieved.copy_id == post_data['copy_id']

        # Req 3.4: userId from User_Context
        assert isinstance(retrieved.user_id, str) and len(retrieved.user_id) > 0
        assert retrieved.user_id == post_data['user_id']

        # Req 3.5: content field
        assert isinstance(retrieved.content, str) and len(retrieved.content) > 0
        assert retrieved.content == post_data['content']

        # Req 3.6: platform field
        assert isinstance(retrieved.platform, str) and len(retrieved.platform) > 0
        assert retrieved.platform == post_data['platform']

        # Req 3.7: hashtags list
        assert isinstance(retrieved.hashtags, list)
        assert retrieved.hashtags == post_data['hashtags']

        # Req 3.8: scheduledDate as ISO 8601 date string
        assert isinstance(retrieved.scheduled_date, str)
        assert DATE_PATTERN.match(retrieved.scheduled_date)
        datetime.strptime(retrieved.scheduled_date, '%Y-%m-%d')

        # Req 3.9: scheduledTime as HH:MM
        assert isinstance(retrieved.scheduled_time, str)
        assert TIME_PATTERN.match(retrieved.scheduled_time)
        datetime.strptime(retrieved.scheduled_time, '%H:%M')

        # Req 3.10: status is one of draft/scheduled/published
        assert retrieved.status in VALID_STATUSES

        # Req 3.11: createdAt timestamp
        assert isinstance(retrieved.created_at, datetime)
        now = datetime.now(UTC)
        assert retrieved.created_at <= now
        assert (now - retrieved.created_at).total_seconds() < 60

        # Req 3.12: updatedAt timestamp
        assert isinstance(retrieved.updated_at, datetime)
        assert retrieved.updated_at <= now
        assert (now - retrieved.updated_at).total_seconds() < 60

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(post_data=scheduled_post_record_strategy())
    async def test_property_strategy_color_and_label_present(self, post_data):
        """
        For any ScheduledPostRecord, strategyColor and strategyLabel fields must be
        present as strings matching the input data.

        **Validates: Requirements 3.1-3.12 (strategyColor/strategyLabel completeness)**
        """
        record = ScheduledPostRecord(**post_data)
        repo = create_mock_scheduler_repository()

        stored = await repo.create_post(record)
        retrieved = await repo.get_post_by_id(stored.id, post_data['user_id'])

        assert retrieved is not None
        assert isinstance(retrieved.strategy_color, str)
        assert retrieved.strategy_color == post_data['strategy_color']
        assert isinstance(retrieved.strategy_label, str)
        assert retrieved.strategy_label == post_data['strategy_label']

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        num_records=st.integers(min_value=2, max_value=5),
        post_data_list=st.lists(scheduled_post_record_strategy(), min_size=2, max_size=5)
    )
    async def test_property_multiple_records_all_complete(self, num_records, post_data_list):
        """
        For any set of ScheduledPostRecords, all records should have unique IDs and
        all required fields populated.

        **Validates: Requirements 3.1-3.12**
        """
        if len(post_data_list) < num_records:
            return

        repo = create_mock_scheduler_repository()
        stored_ids = []

        for i in range(num_records):
            record = ScheduledPostRecord(**post_data_list[i])
            stored = await repo.create_post(record)
            stored_ids.append((stored.id, post_data_list[i]['user_id']))

        # All IDs must be unique
        ids_only = [sid for sid, _ in stored_ids]
        assert len(set(ids_only)) == len(ids_only), "All record IDs must be unique"

        # Each record must be retrievable and complete
        for post_id, user_id in stored_ids:
            retrieved = await repo.get_post_by_id(post_id, user_id)
            assert retrieved is not None
            assert len(retrieved.id) > 0
            assert len(retrieved.strategy_id) > 0
            assert len(retrieved.copy_id) > 0
            assert len(retrieved.user_id) > 0
            assert len(retrieved.content) > 0
            assert len(retrieved.platform) > 0
            assert isinstance(retrieved.hashtags, list)
            assert DATE_PATTERN.match(retrieved.scheduled_date)
            assert TIME_PATTERN.match(retrieved.scheduled_time)
            assert retrieved.status in VALID_STATUSES
            assert isinstance(retrieved.created_at, datetime)
            assert isinstance(retrieved.updated_at, datetime)

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(post_data=scheduled_post_record_strategy())
    async def test_property_record_preserves_input_data_integrity(self, post_data):
        """
        For any ScheduledPostRecord, stored fields must exactly match the original
        input data without modification or data loss through the repository round-trip.

        **Validates: Requirements 3.1-3.12**
        """
        record = ScheduledPostRecord(**post_data)
        repo = create_mock_scheduler_repository()

        stored = await repo.create_post(record)
        retrieved = await repo.get_post_by_id(stored.id, post_data['user_id'])

        assert retrieved is not None
        assert retrieved.strategy_id == post_data['strategy_id']
        assert retrieved.copy_id == post_data['copy_id']
        assert retrieved.user_id == post_data['user_id']
        assert retrieved.content == post_data['content']
        assert retrieved.platform == post_data['platform']
        assert retrieved.hashtags == post_data['hashtags']
        assert retrieved.scheduled_date == post_data['scheduled_date']
        assert retrieved.scheduled_time == post_data['scheduled_time']
        assert retrieved.status == post_data['status']
        assert retrieved.strategy_color == post_data['strategy_color']
        assert retrieved.strategy_label == post_data['strategy_label']
