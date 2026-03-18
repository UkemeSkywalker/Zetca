"""
Property-based tests for CopyRecord completeness.

Feature: copywriter-agent-backend, Property 4: CopyRecord Completeness
Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

For any CopyRecord stored in the database, it should contain all required fields:
a non-empty copyId (unique), a non-empty strategyId, a non-empty userId, non-empty text,
non-empty platform, a hashtags list, a valid createdAt timestamp, and a valid updatedAt timestamp.
"""

import pytest
from hypothesis import given, settings, strategies as st, assume
from uuid import UUID
from datetime import datetime, UTC
from unittest.mock import MagicMock

from models.copy import CopyRecord
from repositories.copy_repository import CopyRepository


# --- Hypothesis strategies for generating CopyRecord test data ---

platforms = st.sampled_from(["instagram", "twitter", "linkedin", "facebook"])

hashtag_strategy = st.lists(
    st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))),
    min_size=0,
    max_size=10,
)

copy_text_strategy = st.text(
    min_size=1,
    max_size=500,
    alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
).filter(lambda x: x.strip() != '')


def create_mock_repository():
    """Create a mock repository with in-memory storage for testing."""
    repo = CopyRepository.__new__(CopyRepository)
    repo.table_name = "test-copies"
    repo.region = "us-east-1"

    # In-memory storage
    repo._storage = {}

    # Mock the DynamoDB table
    repo.table = MagicMock()

    async def mock_create_copy(record: CopyRecord) -> CopyRecord:
        item = {
            'copyId': record.id,
            'strategyId': record.strategy_id,
            'userId': record.user_id,
            'text': record.text,
            'platform': record.platform,
            'hashtags': record.hashtags,
            'createdAt': record.created_at.isoformat(),
            'updatedAt': record.updated_at.isoformat(),
        }
        repo._storage[record.id] = item
        return record

    async def mock_create_copies(records: list[CopyRecord]) -> list[CopyRecord]:
        for record in records:
            await mock_create_copy(record)
        return records

    async def mock_get_copy_by_id(copy_id: str, user_id: str = None):
        if copy_id not in repo._storage:
            return None
        item = repo._storage[copy_id]
        if user_id is not None and item['userId'] != user_id:
            return None
        return CopyRecord(
            id=item['copyId'],
            strategy_id=item['strategyId'],
            user_id=item['userId'],
            text=item['text'],
            platform=item['platform'],
            hashtags=item.get('hashtags', []),
            created_at=datetime.fromisoformat(item['createdAt']),
            updated_at=datetime.fromisoformat(item['updatedAt']),
        )

    repo.create_copy = mock_create_copy
    repo.create_copies = mock_create_copies
    repo.get_copy_by_id = mock_get_copy_by_id

    return repo


class TestCopyRecordCompletenessProperty:
    """
    Property-based tests for CopyRecord completeness.

    **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
    """

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_id=st.uuids().map(str),
        strategy_id=st.uuids().map(str),
        text=copy_text_strategy,
        platform=platforms,
        hashtags=hashtag_strategy,
    )
    async def test_property_copy_record_has_all_required_fields(
        self,
        user_id: str,
        strategy_id: str,
        text: str,
        platform: str,
        hashtags: list,
    ):
        """
        **Property 4: CopyRecord Completeness**

        For any CopyRecord stored in the database, it should contain all required fields:
        non-empty copyId (valid UUID), non-empty strategyId, non-empty userId,
        non-empty text, non-empty platform, a hashtags list, valid createdAt, valid updatedAt.

        **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
        """
        # Create a CopyRecord
        record = CopyRecord(
            strategy_id=strategy_id,
            user_id=user_id,
            text=text,
            platform=platform,
            hashtags=hashtags,
        )

        # Store and retrieve via mock repository
        mock_repo = create_mock_repository()
        await mock_repo.create_copy(record)
        retrieved = await mock_repo.get_copy_by_id(record.id, user_id)

        assert retrieved is not None, "Record should be retrievable after storage"

        # Requirement 2.2: unique copyId
        assert isinstance(retrieved.id, str), "id must be a string"
        assert len(retrieved.id) > 0, "id must be non-empty"
        UUID(retrieved.id)  # raises ValueError if not valid UUID

        # Requirement 2.3: strategyId
        assert isinstance(retrieved.strategy_id, str), "strategy_id must be a string"
        assert len(retrieved.strategy_id) > 0, "strategy_id must be non-empty"

        # Requirement 2.4: userId matches input
        assert isinstance(retrieved.user_id, str), "user_id must be a string"
        assert len(retrieved.user_id) > 0, "user_id must be non-empty"
        assert retrieved.user_id == user_id, "user_id must match the authenticated user"

        # Requirement 2.5: text, platform, hashtags
        assert isinstance(retrieved.text, str), "text must be a string"
        assert len(retrieved.text) > 0, "text must be non-empty"

        assert isinstance(retrieved.platform, str), "platform must be a string"
        assert len(retrieved.platform) > 0, "platform must be non-empty"

        assert isinstance(retrieved.hashtags, list), "hashtags must be a list"

        # Requirement 2.6: valid createdAt
        assert isinstance(retrieved.created_at, datetime), "created_at must be a datetime"
        now = datetime.now(UTC)
        assert retrieved.created_at <= now, "created_at should not be in the future"
        diff = (now - retrieved.created_at).total_seconds()
        assert diff < 60, "created_at should be recent (within 60 seconds)"

        # Requirement 2.7: valid updatedAt
        assert isinstance(retrieved.updated_at, datetime), "updated_at must be a datetime"
        assert retrieved.updated_at <= now, "updated_at should not be in the future"
        diff_upd = (now - retrieved.updated_at).total_seconds()
        assert diff_upd < 60, "updated_at should be recent (within 60 seconds)"

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids().map(str),
        strategy_id=st.uuids().map(str),
        num_copies=st.integers(min_value=2, max_value=5),
        texts=st.lists(copy_text_strategy, min_size=5, max_size=5),
        plats=st.lists(platforms, min_size=5, max_size=5),
        hash_lists=st.lists(hashtag_strategy, min_size=5, max_size=5),
    )
    async def test_property_multiple_records_unique_ids_and_complete(
        self,
        user_id: str,
        strategy_id: str,
        num_copies: int,
        texts: list,
        plats: list,
        hash_lists: list,
    ):
        """
        **Property 4: CopyRecord Completeness (Multiple Records)**

        For any set of CopyRecords, all records should have unique IDs and
        all required fields properly populated.

        **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
        """
        mock_repo = create_mock_repository()
        records = []

        for i in range(num_copies):
            record = CopyRecord(
                strategy_id=strategy_id,
                user_id=user_id,
                text=texts[i],
                platform=plats[i],
                hashtags=hash_lists[i],
            )
            await mock_repo.create_copy(record)
            records.append(record)

        # All IDs must be unique
        ids = [r.id for r in records]
        assert len(set(ids)) == len(ids), "All CopyRecord IDs must be unique"

        # Verify each record is complete after retrieval
        for record in records:
            retrieved = await mock_repo.get_copy_by_id(record.id, user_id)
            assert retrieved is not None
            assert len(retrieved.id) > 0
            UUID(retrieved.id)
            assert len(retrieved.strategy_id) > 0
            assert len(retrieved.user_id) > 0
            assert retrieved.user_id == user_id
            assert len(retrieved.text) > 0
            assert len(retrieved.platform) > 0
            assert isinstance(retrieved.hashtags, list)
            assert isinstance(retrieved.created_at, datetime)
            assert isinstance(retrieved.updated_at, datetime)
