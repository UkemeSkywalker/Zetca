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
