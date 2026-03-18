"""
Property-based tests for mock agent interface compatibility.

Feature: copywriter-agent-backend, Property 10: Mock Agent Interface Compatibility
Validates: Requirements 9.4

For any valid input accepted by the CopywriterAgent's generate_copies and
chat_refine methods, the MockCopywriterAgent should also accept the same
input and return the same Pydantic model types (CopyOutput and ChatResponse
respectively).
"""

import asyncio
from unittest.mock import patch

import pytest
from hypothesis import given, settings as hypothesis_settings, strategies as st

from models.copy import CopyOutput, CopyItem, ChatResponse
from services.mock_copywriter_agent import MockCopywriterAgent


# --- Strategies ---

platform_strategy = st.sampled_from(
    ["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "other"]
)

platform_rec_strategy = st.fixed_dictionaries(
    {"platform": platform_strategy}
)

strategy_data_strategy = st.fixed_dictionaries(
    {
        "platform_recommendations": st.lists(
            platform_rec_strategy, min_size=0, max_size=6
        ),
    }
)

non_empty_text = st.text(min_size=1, max_size=300).filter(lambda x: x.strip() != "")

hashtag_strategy = st.lists(
    st.text(min_size=1, max_size=30).map(lambda t: f"#{t}"),
    min_size=0,
    max_size=10,
)


def _make_agent() -> MockCopywriterAgent:
    """Create a MockCopywriterAgent instance."""
    return MockCopywriterAgent()


class TestMockAgentInterfaceCompatibility:
    """Property 10: Mock Agent Interface Compatibility."""

    @hypothesis_settings(max_examples=100)
    @given(data=strategy_data_strategy)
    @pytest.mark.asyncio
    async def test_property_generate_copies_returns_copy_output(self, data: dict):
        """
        For any valid strategy_data dict, MockCopywriterAgent.generate_copies
        should return a CopyOutput containing at least one CopyItem.
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.generate_copies(data)

        assert isinstance(result, CopyOutput)
        assert len(result.copies) >= 1
        for copy in result.copies:
            assert isinstance(copy, CopyItem)
            assert isinstance(copy.text, str) and len(copy.text) > 0
            assert isinstance(copy.platform, str) and len(copy.platform) > 0
            assert isinstance(copy.hashtags, list)

    @hypothesis_settings(max_examples=100)
    @given(
        copy_text=non_empty_text,
        platform=platform_strategy,
        hashtags=hashtag_strategy,
        strategy_data=strategy_data_strategy,
        user_message=non_empty_text,
    )
    @pytest.mark.asyncio
    async def test_property_chat_refine_returns_chat_response(
        self,
        copy_text: str,
        platform: str,
        hashtags: list,
        strategy_data: dict,
        user_message: str,
    ):
        """
        For any valid copy context and user message,
        MockCopywriterAgent.chat_refine should return a ChatResponse
        with non-empty updated_text and ai_message, plus a hashtags list.
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.chat_refine(
                copy_text, platform, hashtags, strategy_data, user_message
            )

        assert isinstance(result, ChatResponse)
        assert isinstance(result.updated_text, str) and len(result.updated_text) > 0
        assert isinstance(result.updated_hashtags, list)
        assert isinstance(result.ai_message, str) and len(result.ai_message) > 0

    @hypothesis_settings(max_examples=100)
    @given(data=strategy_data_strategy)
    @pytest.mark.asyncio
    async def test_property_generate_copies_platform_count_matches(
        self, data: dict
    ):
        """
        When platform_recommendations is non-empty, the number of returned
        copies should equal the number of recommendations. When empty, a
        single fallback copy should be returned.
        """
        agent = _make_agent()
        with patch("asyncio.sleep", return_value=None):
            result = await agent.generate_copies(data)

        recs = data.get("platform_recommendations", [])
        if recs:
            assert len(result.copies) == len(recs)
        else:
            assert len(result.copies) == 1
