"""
Checkpoint 9: Verify mock agent flow works end-to-end.

This integration test verifies all scheduler endpoints work correctly with the
mock agent, using mocked repositories to avoid DynamoDB dependencies. Tests cover:
- POST /api/scheduler/auto-schedule with a valid strategyId
- POST /api/scheduler/manual-schedule with a valid copyId, date, time, platform
- GET /api/scheduler/posts returns stored posts sorted ascending
- GET /api/scheduler/posts/strategy/{strategyId} returns filtered posts
- GET /api/scheduler/posts/{postId} returns a specific post
- PUT /api/scheduler/posts/{postId} updates a post
- DELETE /api/scheduler/posts/{postId} deletes a post
- User isolation (different user gets 403)
"""

import os

# Ensure mock agent is used so we don't need the real SchedulerAgent module
os.environ.setdefault("USE_MOCK_AGENT", "true")

import pytest
from datetime import datetime, UTC
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from jose import jwt

from main import app
from models.scheduler import ScheduledPostRecord
from models.strategy import StrategyRecord, StrategyOutput, PlatformRecommendation
from models.copy import CopyRecord


# ── Helpers ──────────────────────────────────────────────────────────────────

JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
USER_A = "user-a-checkpoint"
USER_B = "user-b-checkpoint"
STRATEGY_ID = "strat-checkpoint-001"
COPY_ID_1 = "copy-checkpoint-001"
COPY_ID_2 = "copy-checkpoint-002"


def _token(user_id: str) -> str:
    return jwt.encode({"userId": user_id}, JWT_SECRET, algorithm="HS256")


def _make_strategy(strategy_id=STRATEGY_ID, user_id=USER_A) -> StrategyRecord:
    return StrategyRecord(
        id=strategy_id,
        user_id=user_id,
        brand_name="CheckpointBrand",
        industry="Tech",
        target_audience="Developers",
        goals="Increase awareness",
        strategy_output=StrategyOutput(
            content_pillars=["Thought Leadership", "Product Innovation", "Customer Success"],
            posting_schedule="Post 3-4 times per week, Tuesday-Thursday 9-11 AM",
            platform_recommendations=[
                PlatformRecommendation(platform="Instagram", rationale="Visual content", priority="high"),
                PlatformRecommendation(platform="LinkedIn", rationale="B2B audience", priority="medium"),
            ],
            content_themes=["Industry trends", "Product tutorials", "Customer stories", "Behind the scenes", "Tips and tricks"],
            engagement_tactics=["Host Q&A sessions", "Respond to comments", "Run polls", "Share user content"],
            visual_prompts=["Modern tech workspace", "Team collaboration scene"],
        ),
    )


def _make_copy(copy_id, strategy_id=STRATEGY_ID, user_id=USER_A) -> CopyRecord:
    return CopyRecord(
        id=copy_id,
        strategy_id=strategy_id,
        user_id=user_id,
        text=f"Sample copy text for {copy_id}",
        platform="instagram",
        hashtags=["#test", "#checkpoint"],
    )


# ── In-memory repository for integration testing ─────────────────────────────

class InMemorySchedulerRepository:
    """In-memory scheduler repository that mimics DynamoDB behavior."""

    def __init__(self):
        self._store: dict[str, dict] = {}

    async def create_post(self, record: ScheduledPostRecord) -> ScheduledPostRecord:
        self._store[record.id] = record
        return record

    async def create_posts(self, records: list[ScheduledPostRecord]) -> list[ScheduledPostRecord]:
        for r in records:
            self._store[r.id] = r
        return records

    async def get_post_by_id(self, post_id: str, user_id: str = None) -> ScheduledPostRecord | None:
        record = self._store.get(post_id)
        if record is None:
            return None
        if user_id is not None and record.user_id != user_id:
            return None
        return record

    async def post_exists(self, post_id: str) -> bool:
        return post_id in self._store

    async def list_posts_by_user(self, user_id: str) -> list[ScheduledPostRecord]:
        posts = [r for r in self._store.values() if r.user_id == user_id]
        return sorted(posts, key=lambda p: p.scheduled_date)

    async def list_posts_by_strategy(self, strategy_id: str) -> list[ScheduledPostRecord]:
        posts = [r for r in self._store.values() if r.strategy_id == strategy_id]
        return sorted(posts, key=lambda p: p.scheduled_date)

    async def update_post(self, post_id: str, updates: dict) -> ScheduledPostRecord:
        record = self._store[post_id]
        now = datetime.now(UTC)
        field_map = {
            "scheduled_date": "scheduled_date",
            "scheduled_time": "scheduled_time",
            "content": "content",
            "platform": "platform",
            "hashtags": "hashtags",
            "status": "status",
        }
        data = record.model_dump()
        for py_field, attr in field_map.items():
            if py_field in updates and updates[py_field] is not None:
                data[attr] = updates[py_field]
        data["updated_at"] = now
        updated = ScheduledPostRecord(**data)
        self._store[post_id] = updated
        return updated

    async def delete_post(self, post_id: str) -> bool:
        if post_id in self._store:
            del self._store[post_id]
            return True
        return False


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def in_memory_repo():
    return InMemorySchedulerRepository()


@pytest.fixture
def mock_strategy_repo():
    repo = AsyncMock()
    strategy_a = _make_strategy(STRATEGY_ID, USER_A)

    async def get_strategy(sid, uid=None):
        if sid != STRATEGY_ID:
            return None
        if uid is not None and uid != USER_A:
            return None
        return strategy_a

    async def strategy_exists(sid):
        return sid == STRATEGY_ID

    repo.get_strategy_by_id = AsyncMock(side_effect=get_strategy)
    repo.strategy_exists = AsyncMock(side_effect=strategy_exists)
    return repo


@pytest.fixture
def mock_copy_repo():
    repo = AsyncMock()
    copies = [_make_copy(COPY_ID_1), _make_copy(COPY_ID_2)]

    async def get_copy(cid, uid=None):
        for c in copies:
            if c.id == cid:
                if uid is not None and c.user_id != uid:
                    return None
                return c
        return None

    async def copy_exists(cid):
        return any(c.id == cid for c in copies)

    repo.get_copy_by_id = AsyncMock(side_effect=get_copy)
    repo.copy_exists = AsyncMock(side_effect=copy_exists)
    repo.list_copies_by_strategy = AsyncMock(return_value=copies)
    return repo


@pytest.fixture
def patched_client(in_memory_repo, mock_strategy_repo, mock_copy_repo):
    """
    Patch the scheduler routes to use in-memory repo and mock repos,
    while keeping the real mock scheduler agent and real service logic.
    """
    from services.mock_scheduler_agent import MockSchedulerAgent
    from services.scheduler_service import SchedulerService

    mock_agent = MockSchedulerAgent()
    service = SchedulerService(
        agent=mock_agent,
        scheduler_repository=in_memory_repo,
        copy_repository=mock_copy_repo,
        strategy_repository=mock_strategy_repo,
    )

    with patch("routes.scheduler.scheduler_service", service):
        yield TestClient(app)


# ── Tests ────────────────────────────────────────────────────────────────────

class TestCheckpoint9MockAgentFlow:
    """Checkpoint 9: End-to-end verification of mock agent flow."""

    # ── Auto-schedule ────────────────────────────────────────────────────

    def test_auto_schedule_returns_posts_with_metadata(self, patched_client):
        """POST /api/scheduler/auto-schedule returns posts with dates, times, platforms, strategy color/label."""
        resp = patched_client.post(
            "/api/scheduler/auto-schedule",
            json={"strategy_id": STRATEGY_ID},
            headers={"Authorization": f"Bearer {_token(USER_A)}"},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        posts = resp.json()
        assert len(posts) >= 1, "Expected at least 1 scheduled post"

        for post in posts:
            assert post["scheduled_date"], "Missing scheduled_date"
            assert post["scheduled_time"], "Missing scheduled_time"
            assert post["platform"], "Missing platform"
            assert post["strategy_color"], "Missing strategy_color"
            assert post["strategy_label"] == "CheckpointBrand", f"Expected 'CheckpointBrand', got '{post['strategy_label']}'"
            assert post["status"] == "scheduled"
            assert post["strategy_id"] == STRATEGY_ID
            assert post["user_id"] == USER_A

    def test_auto_schedule_nonexistent_strategy_returns_404(self, patched_client):
        """POST /api/scheduler/auto-schedule with unknown strategyId returns 404."""
        resp = patched_client.post(
            "/api/scheduler/auto-schedule",
            json={"strategy_id": "nonexistent-strategy"},
            headers={"Authorization": f"Bearer {_token(USER_A)}"},
        )
        assert resp.status_code == 404

    def test_auto_schedule_other_users_strategy_returns_403(self, patched_client):
        """POST /api/scheduler/auto-schedule with another user's strategy returns 403."""
        resp = patched_client.post(
            "/api/scheduler/auto-schedule",
            json={"strategy_id": STRATEGY_ID},
            headers={"Authorization": f"Bearer {_token(USER_B)}"},
        )
        assert resp.status_code == 403

    # ── Manual schedule ──────────────────────────────────────────────────

    def test_manual_schedule_creates_post(self, patched_client):
        """POST /api/scheduler/manual-schedule creates a scheduled post."""
        resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-04-15",
                "scheduled_time": "10:30",
                "platform": "instagram",
            },
            headers={"Authorization": f"Bearer {_token(USER_A)}"},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        post = resp.json()
        assert post["status"] == "scheduled"
        assert post["scheduled_date"] == "2026-04-15"
        assert post["scheduled_time"] == "10:30"
        assert post["platform"] == "instagram"
        assert post["copy_id"] == COPY_ID_1
        assert post["strategy_color"], "Missing strategy_color"
        assert post["strategy_label"] == "CheckpointBrand"

    def test_manual_schedule_nonexistent_copy_returns_404(self, patched_client):
        """POST /api/scheduler/manual-schedule with unknown copyId returns 404."""
        resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": "nonexistent-copy",
                "scheduled_date": "2026-04-15",
                "scheduled_time": "10:30",
                "platform": "instagram",
            },
            headers={"Authorization": f"Bearer {_token(USER_A)}"},
        )
        assert resp.status_code == 404

    def test_manual_schedule_invalid_date_returns_422(self, patched_client):
        """POST /api/scheduler/manual-schedule with invalid date returns 422."""
        resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "not-a-date",
                "scheduled_time": "10:30",
                "platform": "instagram",
            },
            headers={"Authorization": f"Bearer {_token(USER_A)}"},
        )
        assert resp.status_code == 422

    # ── List posts ───────────────────────────────────────────────────────

    def test_list_posts_returns_sorted_ascending(self, patched_client):
        """GET /api/scheduler/posts returns stored posts sorted by scheduledDate ascending."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}

        # Create posts with different dates via manual schedule
        for date in ["2026-05-03", "2026-05-01", "2026-05-02"]:
            patched_client.post(
                "/api/scheduler/manual-schedule",
                json={
                    "copy_id": COPY_ID_1,
                    "scheduled_date": date,
                    "scheduled_time": "09:00",
                    "platform": "instagram",
                },
                headers=headers,
            )

        resp = patched_client.get("/api/scheduler/posts", headers=headers)
        assert resp.status_code == 200
        posts = resp.json()
        assert len(posts) >= 3
        dates = [p["scheduled_date"] for p in posts]
        assert dates == sorted(dates), f"Posts not sorted ascending: {dates}"

    # ── List posts by strategy ───────────────────────────────────────────

    def test_list_posts_by_strategy_returns_filtered(self, patched_client):
        """GET /api/scheduler/posts/strategy/{strategyId} returns filtered posts."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}

        # Auto-schedule to create posts for the strategy
        patched_client.post(
            "/api/scheduler/auto-schedule",
            json={"strategy_id": STRATEGY_ID},
            headers=headers,
        )

        resp = patched_client.get(
            f"/api/scheduler/posts/strategy/{STRATEGY_ID}",
            headers=headers,
        )
        assert resp.status_code == 200
        posts = resp.json()
        assert len(posts) >= 1
        for post in posts:
            assert post["strategy_id"] == STRATEGY_ID

    # ── Get single post ──────────────────────────────────────────────────

    def test_get_post_by_id(self, patched_client):
        """GET /api/scheduler/posts/{postId} returns a specific post."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}

        # Create a post first
        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-06-01",
                "scheduled_time": "14:00",
                "platform": "twitter",
            },
            headers=headers,
        )
        post_id = create_resp.json()["id"]

        resp = patched_client.get(f"/api/scheduler/posts/{post_id}", headers=headers)
        assert resp.status_code == 200
        post = resp.json()
        assert post["id"] == post_id
        assert post["scheduled_date"] == "2026-06-01"
        assert post["platform"] == "twitter"

    def test_get_nonexistent_post_returns_404(self, patched_client):
        """GET /api/scheduler/posts/{postId} with unknown ID returns 404."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}
        resp = patched_client.get("/api/scheduler/posts/nonexistent-id", headers=headers)
        assert resp.status_code == 404

    # ── Update post ──────────────────────────────────────────────────────

    def test_update_post(self, patched_client):
        """PUT /api/scheduler/posts/{postId} updates a post."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}

        # Create a post
        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-07-01",
                "scheduled_time": "08:00",
                "platform": "instagram",
            },
            headers=headers,
        )
        post_id = create_resp.json()["id"]

        # Update it
        resp = patched_client.put(
            f"/api/scheduler/posts/{post_id}",
            json={
                "scheduled_date": "2026-07-15",
                "scheduled_time": "16:00",
                "status": "published",
            },
            headers=headers,
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["scheduled_date"] == "2026-07-15"
        assert updated["scheduled_time"] == "16:00"
        assert updated["status"] == "published"

    # ── Delete post ──────────────────────────────────────────────────────

    def test_delete_post(self, patched_client):
        """DELETE /api/scheduler/posts/{postId} deletes a post."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}

        # Create a post
        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_2,
                "scheduled_date": "2026-08-01",
                "scheduled_time": "12:00",
                "platform": "linkedin",
            },
            headers=headers,
        )
        post_id = create_resp.json()["id"]

        # Delete it
        resp = patched_client.delete(f"/api/scheduler/posts/{post_id}", headers=headers)
        assert resp.status_code == 204

        # Verify it's gone
        get_resp = patched_client.get(f"/api/scheduler/posts/{post_id}", headers=headers)
        assert get_resp.status_code == 404

    def test_delete_nonexistent_post_returns_404(self, patched_client):
        """DELETE /api/scheduler/posts/{postId} with unknown ID returns 404."""
        headers = {"Authorization": f"Bearer {_token(USER_A)}"}
        resp = patched_client.delete("/api/scheduler/posts/nonexistent-id", headers=headers)
        assert resp.status_code == 404

    # ── User isolation ───────────────────────────────────────────────────

    def test_user_isolation_get_returns_403(self, patched_client):
        """User B cannot access User A's post (GET returns 403)."""
        headers_a = {"Authorization": f"Bearer {_token(USER_A)}"}
        headers_b = {"Authorization": f"Bearer {_token(USER_B)}"}

        # User A creates a post
        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-09-01",
                "scheduled_time": "10:00",
                "platform": "instagram",
            },
            headers=headers_a,
        )
        post_id = create_resp.json()["id"]

        # User B tries to access it
        resp = patched_client.get(f"/api/scheduler/posts/{post_id}", headers=headers_b)
        assert resp.status_code == 403

    def test_user_isolation_update_returns_403(self, patched_client):
        """User B cannot update User A's post (PUT returns 403)."""
        headers_a = {"Authorization": f"Bearer {_token(USER_A)}"}
        headers_b = {"Authorization": f"Bearer {_token(USER_B)}"}

        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-09-02",
                "scheduled_time": "11:00",
                "platform": "instagram",
            },
            headers=headers_a,
        )
        post_id = create_resp.json()["id"]

        resp = patched_client.put(
            f"/api/scheduler/posts/{post_id}",
            json={"status": "published"},
            headers=headers_b,
        )
        assert resp.status_code == 403

    def test_user_isolation_delete_returns_403(self, patched_client):
        """User B cannot delete User A's post (DELETE returns 403)."""
        headers_a = {"Authorization": f"Bearer {_token(USER_A)}"}
        headers_b = {"Authorization": f"Bearer {_token(USER_B)}"}

        create_resp = patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-09-03",
                "scheduled_time": "12:00",
                "platform": "instagram",
            },
            headers=headers_a,
        )
        post_id = create_resp.json()["id"]

        resp = patched_client.delete(f"/api/scheduler/posts/{post_id}", headers=headers_b)
        assert resp.status_code == 403

    def test_user_isolation_list_only_own_posts(self, patched_client):
        """User B's list returns empty when only User A has posts."""
        headers_a = {"Authorization": f"Bearer {_token(USER_A)}"}
        headers_b = {"Authorization": f"Bearer {_token(USER_B)}"}

        # User A creates a post
        patched_client.post(
            "/api/scheduler/manual-schedule",
            json={
                "copy_id": COPY_ID_1,
                "scheduled_date": "2026-09-04",
                "scheduled_time": "13:00",
                "platform": "instagram",
            },
            headers=headers_a,
        )

        # User B lists posts — should be empty
        resp = patched_client.get("/api/scheduler/posts", headers=headers_b)
        assert resp.status_code == 200
        assert resp.json() == []

    # ── No auth ──────────────────────────────────────────────────────────

    def test_no_auth_returns_401_or_403(self, patched_client):
        """All endpoints reject requests without auth."""
        endpoints = [
            ("POST", "/api/scheduler/auto-schedule", {"strategy_id": STRATEGY_ID}),
            ("POST", "/api/scheduler/manual-schedule", {"copy_id": COPY_ID_1, "scheduled_date": "2026-01-01", "scheduled_time": "10:00", "platform": "x"}),
            ("GET", "/api/scheduler/posts", None),
            ("GET", f"/api/scheduler/posts/strategy/{STRATEGY_ID}", None),
            ("GET", "/api/scheduler/posts/some-id", None),
            ("PUT", "/api/scheduler/posts/some-id", {"status": "draft"}),
            ("DELETE", "/api/scheduler/posts/some-id", None),
        ]
        for method, path, body in endpoints:
            if method == "POST":
                resp = patched_client.post(path, json=body)
            elif method == "GET":
                resp = patched_client.get(path)
            elif method == "PUT":
                resp = patched_client.put(path, json=body)
            elif method == "DELETE":
                resp = patched_client.delete(path)
            assert resp.status_code in [401, 403], f"{method} {path} should require auth, got {resp.status_code}"
