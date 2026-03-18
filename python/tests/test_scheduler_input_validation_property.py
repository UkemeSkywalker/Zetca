"""
Property-based tests for scheduler input validation.

Property 1: Input Validation Rejects Invalid Data
Validates: Requirements 2.6, 12.1, 12.2

Tests that:
- Whitespace-only or empty strings are rejected for strategy_id in AutoScheduleInput
- Invalid date formats, time formats, empty copy_id, and empty platform are rejected in ManualScheduleInput
"""

import pytest
from hypothesis import given, settings, strategies as st
from pydantic import ValidationError

from models.scheduler import AutoScheduleInput, ManualScheduleInput


# --- Hypothesis strategies for generating invalid data ---

whitespace_only_strings = st.text(
    alphabet=" \t\n\r",
    min_size=1,
    max_size=20,
)

empty_or_whitespace = st.one_of(
    st.just(""),
    whitespace_only_strings,
)

invalid_date_formats = st.one_of(
    st.just("2025/01/15"),
    st.just("15-01-2025"),
    st.just("01-15-2025"),
    st.just("Jan 15, 2025"),
    st.just("not-a-date"),
    st.just("2025-13-01"),
    st.just("2025-01-32"),
    st.just("20250115"),
    st.just(""),
    st.just("   "),
)

invalid_time_formats = st.one_of(
    st.just("25:00"),
    st.just("09:60"),
    st.just("9AM"),
    st.just("not-a-time"),
    st.just("0930"),
    st.just(""),
    st.just("   "),
)


class TestAutoScheduleInputValidation:
    """Property tests for AutoScheduleInput validation."""

    @given(value=empty_or_whitespace)
    @settings(max_examples=30)
    def test_rejects_empty_or_whitespace_strategy_id(self, value: str):
        """AutoScheduleInput must reject empty or whitespace-only strategy_id."""
        with pytest.raises(ValidationError):
            AutoScheduleInput(strategy_id=value)

    @given(
        value=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
        ).filter(lambda x: x.strip() != "")
    )
    @settings(max_examples=30)
    def test_accepts_valid_strategy_id(self, value: str):
        """AutoScheduleInput must accept any non-empty, non-whitespace-only string."""
        result = AutoScheduleInput(strategy_id=value)
        assert result.strategy_id == value.strip()


class TestManualScheduleInputValidation:
    """Property tests for ManualScheduleInput validation."""

    @given(value=empty_or_whitespace)
    @settings(max_examples=30)
    def test_rejects_empty_or_whitespace_copy_id(self, value: str):
        """ManualScheduleInput must reject empty or whitespace-only copy_id."""
        with pytest.raises(ValidationError):
            ManualScheduleInput(
                copy_id=value,
                scheduled_date="2025-06-15",
                scheduled_time="09:30",
                platform="instagram",
            )

    @given(value=empty_or_whitespace)
    @settings(max_examples=30)
    def test_rejects_empty_or_whitespace_platform(self, value: str):
        """ManualScheduleInput must reject empty or whitespace-only platform."""
        with pytest.raises(ValidationError):
            ManualScheduleInput(
                copy_id="valid-copy-id",
                scheduled_date="2025-06-15",
                scheduled_time="09:30",
                platform=value,
            )

    @given(bad_date=invalid_date_formats)
    @settings(max_examples=30)
    def test_rejects_invalid_date_formats(self, bad_date: str):
        """ManualScheduleInput must reject dates not in YYYY-MM-DD format."""
        with pytest.raises(ValidationError):
            ManualScheduleInput(
                copy_id="valid-copy-id",
                scheduled_date=bad_date,
                scheduled_time="09:30",
                platform="instagram",
            )

    @given(bad_time=invalid_time_formats)
    @settings(max_examples=30)
    def test_rejects_invalid_time_formats(self, bad_time: str):
        """ManualScheduleInput must reject times not in HH:MM format."""
        with pytest.raises(ValidationError):
            ManualScheduleInput(
                copy_id="valid-copy-id",
                scheduled_date="2025-06-15",
                scheduled_time=bad_time,
                platform="instagram",
            )

    @given(
        copy_id=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=("Cs", "Cc"))).filter(lambda x: x.strip() != ""),
        platform=st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=("Cs", "Cc"))).filter(lambda x: x.strip() != ""),
        date=st.dates().map(lambda d: d.strftime("%Y-%m-%d")),
        time=st.times().map(lambda t: t.strftime("%H:%M")),
    )
    @settings(max_examples=30)
    def test_accepts_valid_manual_schedule_input(self, copy_id, platform, date, time):
        """ManualScheduleInput must accept valid combinations of fields."""
        result = ManualScheduleInput(
            copy_id=copy_id,
            scheduled_date=date,
            scheduled_time=time,
            platform=platform,
        )
        assert result.copy_id == copy_id.strip()
        assert result.platform == platform.strip()
        assert result.scheduled_date == date
        assert result.scheduled_time == time
