"""
Mock Copywriter Agent for testing and development.

Returns realistic sample copies without calling external AI services.
Follows the same interface as the real CopywriterAgent so they can be
swapped via the USE_MOCK_AGENT flag.
"""

import asyncio
from typing import List, AsyncIterator

from models.copy import CopyItem, CopyOutput, ChatResponse


# Platform-specific mock copy templates keyed by lowercase platform name.
_PLATFORM_COPIES: dict[str, dict] = {
    "linkedin": {
        "text": (
            "Great strategies start with understanding your audience. "
            "We've been refining our approach to deliver real value — "
            "here's what we've learned about building meaningful connections "
            "in the B2B space. What's your top engagement tip?"
        ),
        "hashtags": ["#Leadership", "#B2BMarketing", "#Strategy", "#GrowthMindset"],
    },
    "twitter": {
        "text": (
            "Your audience is talking — are you listening? 🎯\n\n"
            "3 things we changed this quarter:\n"
            "✅ More community polls\n"
            "✅ Faster reply times\n"
            "✅ Real customer stories\n\n"
            "Results? 2x engagement. Try it."
        ),
        "hashtags": ["#SocialMediaTips", "#MarketingStrategy", "#Engagement"],
    },
    "instagram": {
        "text": (
            "Behind every great brand is a story worth sharing. ✨\n\n"
            "We believe in showing up authentically — not just with polished posts, "
            "but with real moments that connect. Swipe to see how we bring our "
            "strategy to life every day. 👉"
        ),
        "hashtags": [
            "#BrandStorytelling", "#AuthenticMarketing", "#ContentCreation",
            "#SocialMediaMarketing", "#InstaStrategy",
        ],
    },
    "facebook": {
        "text": (
            "We asked our community what content they want to see more of — "
            "and you delivered! 🙌\n\n"
            "Based on your feedback, we're rolling out weekly tips, live Q&As, "
            "and behind-the-scenes looks at our process. Stay tuned and let us "
            "know what topics matter most to you!"
        ),
        "hashtags": ["#CommunityFirst", "#SocialMedia", "#BrandBuilding"],
    },
    "youtube": {
        "text": (
            "NEW VIDEO: How to build a content strategy that actually works 📹\n\n"
            "In this episode we break down the exact framework we use to plan, "
            "create, and measure content across platforms. Timestamps in the "
            "description — skip to what matters most to you."
        ),
        "hashtags": ["#ContentStrategy", "#MarketingTips", "#YouTubeMarketing"],
    },
    "tiktok": {
        "text": (
            "POV: You finally nailed your content strategy 🎬✨\n\n"
            "Here are 3 quick wins you can steal today. "
            "Save this for later and follow for more marketing tips!"
        ),
        "hashtags": [
            "#MarketingTok", "#ContentTips", "#SocialMediaGrowth",
            "#SmallBusinessTips",
        ],
    },
}

_DEFAULT_COPY = {
    "text": (
        "Exciting things are happening! We're putting our strategy into action "
        "with fresh content designed just for you. Stay tuned for updates, tips, "
        "and stories that matter. Let us know what you'd like to see next!"
    ),
    "hashtags": ["#ContentMarketing", "#DigitalStrategy", "#BrandGrowth"],
}


class MockCopywriterAgent:
    """
    Mock implementation of the Copywriter Agent.

    Returns realistic platform-specific copies with a simulated delay
    to mimic real agent latency. Supports the same generate and chat
    interfaces as the real CopywriterAgent.
    """

    async def generate_copies(self, strategy_data: dict) -> CopyOutput:
        """
        Generate mock copies for each platform in the strategy's
        platform_recommendations.

        Args:
            strategy_data: Dict representation of a StrategyRecord/StrategyOutput
                           containing platform_recommendations.

        Returns:
            CopyOutput with one CopyItem per recommended platform.
        """
        await asyncio.sleep(1)

        platform_recs: List[dict] = strategy_data.get("platform_recommendations", [])

        copies: List[CopyItem] = []
        for rec in platform_recs:
            platform_name: str = rec.get("platform", "General")
            template = _PLATFORM_COPIES.get(platform_name.lower(), _DEFAULT_COPY)
            copies.append(
                CopyItem(
                    text=template["text"],
                    platform=platform_name,
                    hashtags=list(template["hashtags"]),
                )
            )

        # Fallback: if no platform_recommendations, return a single generic copy
        if not copies:
            copies.append(
                CopyItem(
                    text=_DEFAULT_COPY["text"],
                    platform="General",
                    hashtags=list(_DEFAULT_COPY["hashtags"]),
                )
            )

        return CopyOutput(copies=copies)

    async def generate_copies_stream(self, strategy_data: dict) -> AsyncIterator[dict]:
        """
        Mock streaming version of generate_copies.

        Simulates the real agent's streaming events with delays so the
        frontend can be tested without Bedrock.
        """
        yield {"event": "lifecycle", "phase": "Connecting to mock model..."}
        await asyncio.sleep(0.3)

        yield {"event": "lifecycle", "phase": "Agent loop initialized"}
        await asyncio.sleep(0.2)

        yield {"event": "lifecycle", "phase": "Processing strategy data..."}
        await asyncio.sleep(0.3)

        # Simulate text generation thinking
        thinking_chunks = [
            "Analyzing brand strategy for ",
            strategy_data.get("brand_name", "your brand"),
            "... ",
            "Identifying key content pillars... ",
            "Crafting platform-specific copies for Twitter/X... ",
            "Generating Instagram variations... ",
            "Building LinkedIn thought leadership angles... ",
            "Creating Facebook community-focused content... ",
            "Finalizing 28 copy variations with hashtags...",
        ]
        for chunk in thinking_chunks:
            yield {"event": "thinking", "text": chunk}
            await asyncio.sleep(0.4)

        # Generate the actual mock copies
        output = await self.generate_copies(strategy_data)
        copies_data = [
            {"text": c.text, "platform": c.platform, "hashtags": c.hashtags}
            for c in output.copies
        ]
        yield {"event": "result", "copies": copies_data}

    async def chat_refine(
        self,
        copy_text: str,
        platform: str,
        hashtags: List[str],
        strategy_data: dict,
        user_message: str,
    ) -> ChatResponse:
        """
        Return a mock chat refinement response.

        Simulates the AI adjusting the copy based on the user's message
        while keeping the same platform context.

        Args:
            copy_text: Current copy text.
            platform: Target platform.
            hashtags: Current hashtags.
            strategy_data: Associated strategy data for brand context.
            user_message: The user's refinement request.

        Returns:
            ChatResponse with updated text, hashtags, and an explanation.
        """
        await asyncio.sleep(1)

        updated_text = (
            f"{copy_text}\n\n"
            f"[Refined based on your feedback: \"{user_message}\"]"
        )

        updated_hashtags = list(hashtags) + ["#Refined"]

        ai_message = (
            f"I've updated the {platform} copy based on your request. "
            f"The changes incorporate your feedback while keeping the tone "
            f"consistent with the brand strategy."
        )

        return ChatResponse(
            updated_text=updated_text,
            updated_hashtags=updated_hashtags,
            ai_message=ai_message,
        )
