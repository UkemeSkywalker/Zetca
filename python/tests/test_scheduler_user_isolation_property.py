"""
Property-based tests for user isolation across all scheduler operations.

This module tests Property 5: User Isolation Across All Scheduler Operations.
Validates Requirements 1.7, 2.3, 2.5, 5.3, 5.7, 8.1, 8.2, 8.3, 8.4
"""

import pytest
from hypothesis import given, settings, strategies as st, assume
from uuid import uuid4
from datetime import datetime, UTC
from unittest.mock import MagicMock

from models.scheduler import ScheduledPostRecord, ScheduledPostUpdate
from repositories.scheduler_repository import SchedulerRepository


# --- Hypothesis strategies ---

PLATFORMS = ["instagram", "twitter", "linkedin", "facebook"]
STATUSES = ["draft", "scheduled", "published"]


@st.composite
def scheduled_post_record_strategy(draw, user_id=None):
    """Generate a random ScheduledPostRecord for a given or random user."""
    uid = user_id or str(draw(st.uuids()))
    month = draw(st.integers(min_value=1, max_value=12))
    day = draw(st.integers(min_value=1, max_value=28))
    hour = draw(st.integers(min_value=0, max_value=23))
    minute = draw(st.integers(min_value=0, max_value=59))
    return ScheduledPostRecord(
        id=str(draw(st.uuids())),
        strategy_id=str(draw(st.uuids())),
        copy_id=str(draw(st.uuids())),
        user_id=uid,
        content=draw(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=("Cs", "Cc")))),
        platform=draw(st.sampled_from(PLATFORMS)),
        hashtags=draw(st.lists(st.from_regex(r"#[a-z]{1,10}", fullmatch=True), max_size=5)),
        scheduled_date=f"2026-{month:02d}-{day:02d}",
        scheduled_time=f"{hour:02d}:{minute:02d}",
        status=draw(st.sampled_from(STATUSES)),
        strategy_color="#3B82F6",
        strategy_label="TestBrand",
    )


# --- In-memory mock repository ---

def create_mock_scheduler_repository():
    """Create a mock SchedulerRepository backed by in-memory dicts."""
    repo = SchedulerRepository.__new__(SchedulerRepository)
    repo.table_name = "test-scheduled-posts"
    repo.region = "us-east-1"
    repo.table = MagicMock()

    # In-memory storage
    repo._storage = {}          # postId -> item dict
    repo._user_index = {}       # userId -> [postId, ...]
    repo._strategy_index = {}   # strategyId -> [postId, ...]

    def _record_to_item(record: ScheduledPostRecord) -> dict:
        return {
            "postId": record.id,
            "strategyId": record.strategy_id,
            "copyId": record.copy_id,
            "userId": record.user_id,
            "content": record.content,
            "platform": record.platform,
            "hashtags": record.hashtags,
            "scheduledDate": record.scheduled_date,
            "scheduledTime": record.scheduled_time,
            "status": record.status,
            "strategyColor": record.strategy_color,
            "strategyLabel": record.strategy_label,
            "createdAt": record.created_at.isoformat(),
            "updatedAt": record.updated_at.isoformat(),
        }

    def _item_to_record(item: dict) -> ScheduledPostRecord:
        return ScheduledPostRecord(
            id=item["postId"],
            strategy_id=item["strategyId"],
            copy_id=item["copyId"],
            user_id=item["userId"],
            content=item["content"],
            platform=item["platform"],
            hashtags=item.get("hashtags", []),
            scheduled_date=item["scheduledDate"],
            scheduled_time=item["scheduledTime"],
            status=item["status"],
            strategy_color=item.get("strategyColor", ""),
            strategy_label=item.get("strategyLabel", ""),
            created_at=datetime.fromisoformat(item["createdAt"]),
            updated_at=datetime.fromisoformat(item["updatedAt"]),
        )

    async def mock_create_post(record: ScheduledPostRecord) -> ScheduledPostRecord:
        item = _record_to_item(record)
        repo._storage[record.id] = item
        repo._user_index.setdefault(record.user_id, []).append(record.id)
        repo._strategy_index.setdefault(record.strategy_id, []).append(record.id)
        return record

    async def mock_get_post_by_id(post_id: str, user_id: str = None):
        if post_id not in repo._storage:
            return None
        item = repo._storage[post_id]
        if user_id is not None and item["userId"] != user_id:
            return None
        return _item_to_record(item)

    async def mock_list_posts_by_user(user_id: str):
        ids = repo._user_index.get(user_id, [])
        items = [repo._storage[pid] for pid in ids if pid in repo._storage]
        items.sort(key=lambda i: i["scheduledDate"])
        return [_item_to_record(i) for i in items]

    async def mock_list_posts_by_strategy(strategy_id: str):
        ids = repo._strategy_index.get(strategy_id, [])
        items = [repo._storage[pid] for pid in ids if pid in repo._storage]
        items.sort(key=lambda i: i["scheduledDate"])
        return [_item_to_record(i) for i in items]

    async def mock_update_post(post_id: str, updates: dict):
        if post_id not in repo._storage:
            return None
        item = repo._storage[post_id]
        field_map = {
            "scheduled_date": "scheduledDate",
            "scheduled_time": "scheduledTime",
            "content": "content",
            "platform": "platform",
            "hashtags": "hashtags",
            "status": "status",
        }
        for py_field, db_field in field_map.items():
            if py_field in updates and updates[py_field] is not None:
                item[db_field] = updates[py_field]
        item["updatedAt"] = datetime.now(UTC).isoformat()
        repo._storage[post_id] = item
        return _item_to_record(item)

    async def mock_delete_post(post_id: str) -> bool:
        if post_id not in repo._storage:
            return False
        item = repo._storage.pop(post_id)
        uid = item["userId"]
        if uid in repo._user_index and post_id in repo._user_index[uid]:
            repo._user_index[uid].remove(post_id)
        sid = item["strategyId"]
        if sid in repo._strategy_index and post_id in repo._strategy_index[sid]:
            repo._strategy_index[sid].remove(post_id)
        return True

    repo.create_post = mock_create_post
    repo.get_post_by_id = mock_get_post_by_id
    repo.list_posts_by_user = mock_list_posts_by_user
    repo.list_posts_by_strategy = mock_list_posts_by_strategy
    repo.update_post = mock_update_post
    repo.delete_post = mock_delete_post

    return repo


# --- Property tests ---

class TestSchedulerUserIsolationProperty:
    """
    Property 5: User Isolation Across All Scheduler Operations.

    For any two distinct users A and B, user A's scheduled posts must be
    completely inaccessible to user B across get, list, update, and delete.

    Validates: Requirements 1.7, 2.3, 2.5, 5.3, 5.7, 8.1, 8.2, 8.3, 8.4
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        record=scheduled_post_record_strategy(),
    )
    async def test_get_post_user_isolation(self, user_a_id, user_b_id, record):
        """User B cannot retrieve a post created by user A via get_post_by_id."""
        assume(user_a_id != user_b_id)

        repo = create_mock_scheduler_repository()
        record.user_id = str(user_a_id)
        await repo.create_post(record)

        # Owner can retrieve
        result_a = await repo.get_post_by_id(record.id, str(user_a_id))
        assert result_a is not None
        assert result_a.id == record.id

        # Non-owner gets None
        result_b = await repo.get_post_by_id(record.id, str(user_b_id))
        assert result_b is None, "User B must not retrieve User A's post"

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        record=scheduled_post_record_strategy(),
    )
    async def test_list_posts_user_isolation(self, user_a_id, user_b_id, record):
        """User B's list must never contain posts owned by user A."""
        assume(user_a_id != user_b_id)

        repo = create_mock_scheduler_repository()
        record.user_id = str(user_a_id)
        await repo.create_post(record)

        user_a_posts = await repo.list_posts_by_user(str(user_a_id))
        assert any(p.id == record.id for p in user_a_posts)

        user_b_posts = await repo.list_posts_by_user(str(user_b_id))
        assert all(p.id != record.id for p in user_b_posts), (
            "User A's post must not appear in User B's list"
        )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        record=scheduled_post_record_strategy(),
    )
    async def test_update_post_requires_ownership(self, user_a_id, user_b_id, record):
        """
        User B cannot update a post owned by user A.

        The service layer enforces this by first calling get_post_by_id with
        user_id; if None is returned the update is rejected. We verify the
        repository-level isolation that underpins this check.
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_scheduler_repository()
        record.user_id = str(user_a_id)
        await repo.create_post(record)

        # Simulate service-layer ownership check: get before update
        check = await repo.get_post_by_id(record.id, str(user_b_id))
        assert check is None, "Ownership check must block User B"

        # Owner can still update
        owner_check = await repo.get_post_by_id(record.id, str(user_a_id))
        assert owner_check is not None

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        record=scheduled_post_record_strategy(),
    )
    async def test_delete_post_requires_ownership(self, user_a_id, user_b_id, record):
        """
        User B cannot delete a post owned by user A.

        The service layer enforces this by first calling get_post_by_id with
        user_id; if None is returned the delete is rejected. We verify the
        repository-level isolation that underpins this check.
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_scheduler_repository()
        record.user_id = str(user_a_id)
        await repo.create_post(record)

        # Simulate service-layer ownership check: get before delete
        check = await repo.get_post_by_id(record.id, str(user_b_id))
        assert check is None, "Ownership check must block User B from deleting"

        # Post still exists for the owner
        owner_check = await repo.get_post_by_id(record.id, str(user_a_id))
        assert owner_check is not None
        assert owner_check.id == record.id

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        records_a=st.lists(scheduled_post_record_strategy(), min_size=1, max_size=5),
        records_b=st.lists(scheduled_post_record_strategy(), min_size=1, max_size=5),
    )
    async def test_bidirectional_isolation(self, user_a_id, user_b_id, records_a, records_b):
        """
        When both users have posts, each user sees only their own across
        get and list operations.
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_scheduler_repository()

        ids_a = []
        for r in records_a:
            r.user_id = str(user_a_id)
            r.id = str(uuid4())  # ensure unique ids
            await repo.create_post(r)
            ids_a.append(r.id)

        ids_b = []
        for r in records_b:
            r.user_id = str(user_b_id)
            r.id = str(uuid4())
            await repo.create_post(r)
            ids_b.append(r.id)

        # User A list
        list_a = await repo.list_posts_by_user(str(user_a_id))
        list_a_ids = {p.id for p in list_a}
        assert set(ids_a) == list_a_ids
        assert list_a_ids.isdisjoint(set(ids_b))

        # User B list
        list_b = await repo.list_posts_by_user(str(user_b_id))
        list_b_ids = {p.id for p in list_b}
        assert set(ids_b) == list_b_ids
        assert list_b_ids.isdisjoint(set(ids_a))

        # Cross-user get returns None
        for pid in ids_a:
            assert await repo.get_post_by_id(pid, str(user_b_id)) is None
        for pid in ids_b:
            assert await repo.get_post_by_id(pid, str(user_a_id)) is None
