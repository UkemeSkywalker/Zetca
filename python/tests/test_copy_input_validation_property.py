"""
Property-based tests for copy input validation.

Feature: copywriter-agent-backend, Property 1: Input Validation Rejects Whitespace
Validates: Requirements 10.1, 10.5

For any string composed entirely of whitespace (or empty), submitting it as
strategy_id in CopyGenerateInput or as message in ChatRequest should be
rejected with a validation error, and no side effects should occur.
"""

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st
from pydantic import ValidationError

from models.copy import CopyGenerateInput, ChatRequest


# Strategy: generate strings that are empty or whitespace-only
whitespace_strings = st.from_regex(r"^\s*$", fullmatch=True)


class TestInputValidationRejectsWhitespace:
    """Property 1: Input Validation Rejects Whitespace."""

    @hypothesis_settings(max_examples=100)
    @given(ws=whitespace_strings)
    def test_property_strategy_id_rejects_whitespace(self, ws: str):
        """CopyGenerateInput rejects any whitespace-only or empty strategy_id."""
        with pytest.raises(ValidationError):
            CopyGenerateInput(strategy_id=ws)

    @hypothesis_settings(max_examples=100)
    @given(ws=whitespace_strings)
    def test_property_message_rejects_whitespace(self, ws: str):
        """ChatRequest rejects any whitespace-only or empty message."""
        with pytest.raises(ValidationError):
            ChatRequest(message=ws)

    @hypothesis_settings(max_examples=100)
    @given(
        valid_text=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != "")
    )
    def test_property_valid_strategy_id_accepted(self, valid_text: str):
        """CopyGenerateInput accepts any non-whitespace-only string and strips it."""
        result = CopyGenerateInput(strategy_id=valid_text)
        assert result.strategy_id == valid_text.strip()

    @hypothesis_settings(max_examples=100)
    @given(
        valid_text=st.text(min_size=1, max_size=200).filter(lambda x: x.strip() != "")
    )
    def test_property_valid_message_accepted(self, valid_text: str):
        """ChatRequest accepts any non-whitespace-only string and strips it."""
        result = ChatRequest(message=valid_text)
        assert result.message == valid_text.strip()
