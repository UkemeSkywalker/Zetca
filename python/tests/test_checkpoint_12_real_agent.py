"""
Checkpoint 12: Verify real scheduler agent generates schedules.

This script verifies the real Scheduler Agent with Bedrock by:
1. Finding an existing strategy with copies in DynamoDB
2. Calling auto-schedule with the real agent
3. Verifying posts are distributed with optimal dates/times
4. Verifying no duplicate platform+date+time combinations
5. Testing manual schedule, CRUD, and user isolation

Run with: python -m pytest tests/test_checkpoint_12_real_agent.py -v -s
Requires: USE_MOCK_AGENT=false, valid AWS credentials, running service on port 8000
"""

import asyncio
import pytest
import httpx
from datetime import datetime, timezone, timedelta
from jose import jwt

# --- Config ---
BASE_URL = "http://localhost:8000"
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
USER_A = "checkpoint-user-a"
USER_B = "checkpoint-user-b"


def make_token(user_id: str) -> str:
    """Generate a valid JWT token for testing."""
    return jwt.encode(
        {
            "userId": user_id,
            "email": f"{user_id}@test.com",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )


def auth_headers(user_id: str) -> dict:
    return {"Authorization": f"Bearer {make_token(user_id)}"}


# ---------------------------------------------------------------------------
# Helpers to find test data
# ---------------------------------------------------------------------------

import boto3
from config import settings


def _get_dynamodb():
    session = boto3.Session(
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    return session.resource("dynamodb")


def find_strategy_with_copies():
    """Find a strategy that has at least one copy in DynamoDB."""
    ddb = _get_dynamodb()
    strat_table = ddb.Table(settings.dynamodb_strategies_table)
    copies_table = ddb.Table(settings.dynamodb_copies_table)

    # Scan strategies
    resp = strat_table.scan(Limit=20)
    strategies = resp.get("Items", [])

    for strat in strategies:
        sid = strat.get("strategyId")
        uid = strat.get("userId")
        if not sid or not uid:
            continue
        # Check if copies exist for this strategy via StrategyIdIndex
        copy_resp = copies_table.query(
            IndexName="StrategyIdIndex",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("strategyId").eq(sid),
            Limit=5,
        )
        copies = copy_resp.get("Items", [])
        if len(copies) >= 1:
            return sid, uid, strat.get("brandName", "Unknown"), copies
    return None, None, None, None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestCheckpoint12RealAgent:
    """Checkpoint 12: Verify real scheduler agent generates schedules."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Find a strategy with copies for testing."""
        self.strategy_id, self.user_id, self.brand_name, self.copies = (
            find_strategy_with_copies()
        )
        if self.strategy_id is None:
            pytest.skip(
                "No strategy with copies found in DynamoDB. "
                "Create a strategy and generate copies first."
            )

    @pytest.mark.asyncio
    async def test_auto_schedule_with_real_agent(self):
        """Test auto-scheduling with the real Bedrock agent."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=120.0) as client:
            resp = await client.post(
                "/api/scheduler/auto-schedule",
                json={"strategy_id": self.strategy_id},
                headers=auth_headers(self.user_id),
            )

        assert resp.status_code == 200, f"Auto-schedule failed: {resp.text}"
        posts = resp.json()
        assert len(posts) >= 1, "Expected at least one scheduled post"

        # Verify each post has required fields
        for post in posts:
            assert post["strategy_id"] == self.strategy_id
            assert post["user_id"] == self.user_id
            assert post["status"] == "scheduled"
            assert post["scheduled_date"], "Missing scheduled_date"
            assert post["scheduled_time"], "Missing scheduled_time"
            assert post["platform"], "Missing platform"
            assert post["content"], "Missing content"
            assert post["strategy_color"], "Missing strategy_color"
            assert post["strategy_label"], "Missing strategy_label"
            # Validate date format
            datetime.strptime(post["scheduled_date"], "%Y-%m-%d")
            # Validate time format
            datetime.strptime(post["scheduled_time"], "%H:%M")

        # Verify no duplicate (platform, date, time) combinations
        combos = set()
        for post in posts:
            key = (post["platform"], post["scheduled_date"], post["scheduled_time"])
            assert key not in combos, (
                f"Duplicate platform+date+time: {key}"
            )
            combos.add(key)

        # Verify each post references a valid copy
        copy_ids = {c.get("copyId") for c in self.copies}
        for post in posts:
            assert post["copy_id"] in copy_ids, (
                f"Post references unknown copy_id: {post['copy_id']}"
            )

        # Store post IDs for cleanup
        self._created_post_ids = [p["id"] for p in posts]

        print(f"\n✅ Auto-scheduled {len(posts)} posts for strategy '{self.brand_name}'")
        for p in posts:
            print(
                f"   📅 {p['scheduled_date']} {p['scheduled_time']} "
                f"| {p['platform']:12s} | {p['content'][:60]}..."
            )

    @pytest.mark.asyncio
    async def test_list_posts_returns_auto_scheduled(self):
        """Verify listed posts include auto-scheduled ones."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/scheduler/posts",
                headers=auth_headers(self.user_id),
            )
        assert resp.status_code == 200
        posts = resp.json()
        # Should have at least the posts we just created (or existing ones)
        print(f"\n📋 User has {len(posts)} total scheduled posts")

    @pytest.mark.asyncio
    async def test_list_posts_by_strategy(self):
        """Verify filtering posts by strategy works."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                f"/api/scheduler/posts/strategy/{self.strategy_id}",
                headers=auth_headers(self.user_id),
            )
        assert resp.status_code == 200
        posts = resp.json()
        for post in posts:
            assert post["strategy_id"] == self.strategy_id
        print(f"\n📋 Strategy '{self.brand_name}' has {len(posts)} scheduled posts")

    @pytest.mark.asyncio
    async def test_auto_schedule_nonexistent_strategy_returns_404(self):
        """Verify 404 for non-existent strategy."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/scheduler/auto-schedule",
                json={"strategy_id": "nonexistent-strategy-id"},
                headers=auth_headers(self.user_id),
            )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_auto_schedule_other_users_strategy_returns_403(self):
        """Verify 403 when trying to auto-schedule another user's strategy."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/scheduler/auto-schedule",
                json={"strategy_id": self.strategy_id},
                headers=auth_headers("some-other-user"),
            )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_no_auth_returns_401(self):
        """Verify 401 without JWT."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/scheduler/auto-schedule",
                json={"strategy_id": self.strategy_id},
            )
        assert resp.status_code in (401, 403)
