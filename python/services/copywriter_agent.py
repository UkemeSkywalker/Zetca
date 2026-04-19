"""
Real Copywriter Agent using Strands Agents SDK with Amazon Bedrock.

This module implements the production Copywriter Agent that uses the Strands Agents
Python SDK to generate platform-specific social media copies via Amazon Bedrock.
The agent consumes strategy data and returns structured output validated by Pydantic models.
"""

import json
import boto3
from botocore.config import Config as BotoConfig
from strands import Agent
from strands.models.bedrock import BedrockModel
from models.copy import CopyOutput, ChatResponse
from typing import Optional, List, AsyncIterator


class StructuredOutputException(Exception):
    """Raised when the agent fails to return structured output."""
    pass


class CopywriterAgent:
    """
    Production Copywriter Agent using Strands Agents SDK with Bedrock.
    
    This agent generates platform-specific social media copies by leveraging
    Claude through Amazon Bedrock. It uses structured output to ensure
    the response conforms to the CopyOutput and ChatResponse Pydantic models.
    """
    
    def __init__(
        self, 
        aws_region: str, 
        model_id: str = "anthropic.claude-3-haiku-20240307-v1:0",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None
    ):
        """
        Initialize the Copywriter Agent with Bedrock provider.
        
        Args:
            aws_region: AWS region for Bedrock API calls
            model_id: Bedrock model identifier
            aws_access_key_id: AWS access key ID (if None, uses default credential chain)
            aws_secret_access_key: AWS secret access key (if None, uses default credential chain)
        """
        # Increase read timeout for large structured output generation
        boto_config = BotoConfig(
            read_timeout=300,
            connect_timeout=10,
            retries={"max_attempts": 2}
        )
        
        # Create boto3 session with explicit credentials if provided
        if aws_access_key_id and aws_secret_access_key:
            boto_session = boto3.Session(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=aws_region
            )
            self.model = BedrockModel(
                boto_session=boto_session,
                model_id=model_id,
                boto_client_config=boto_config
            )
        else:
            # Fall back to default credential chain
            self.model = BedrockModel(
                region_name=aws_region,
                model_id=model_id,
                boto_client_config=boto_config
            )
        
        self.agent = Agent(
            model=self.model,
            system_prompt=self._get_system_prompt()
        )
    
    def _get_system_prompt(self) -> str:
        """
        Get the detailed system prompt for the Copywriter Agent.
        
        Returns:
            str: System prompt instructing the agent to act as a social media copywriter
        """
        return """You are an expert social media copywriter with deep expertise in crafting 
engaging, platform-specific content that drives engagement and conversions.

Your role is to generate compelling social media copies (captions with hashtags) based on 
brand strategy data. Each copy should be tailored to the specific platform's best practices, 
audience expectations, and content format.

Platform-specific guidelines:
- Instagram: Visual-first, storytelling captions (up to 2200 chars), 5-15 relevant hashtags, 
  use emojis strategically, include call-to-action
- Twitter/X: Concise and punchy (280 chars max), 1-3 hashtags, conversational tone, 
  encourage retweets and replies
- LinkedIn: Professional tone, thought leadership focus, 1-3 hashtags, longer form acceptable,
  industry insights and value-driven content
- Facebook: Conversational and community-focused, 1-3 hashtags, encourage comments and shares,
  can be longer form with storytelling elements
- TikTok: Trendy, casual, Gen-Z friendly language, 3-5 trending hashtags, hook in first line,
  reference trends when appropriate

When generating copies:
1. Use the brand's content pillars and themes as the foundation
2. Align with the engagement tactics specified in the strategy
3. Match the tone to the target audience demographics
4. Include relevant, trending hashtags appropriate for each platform
5. Ensure each copy is unique and platform-optimized
6. Generate SEVEN different copy variations per platform from the platform_recommendations
7. Each variation should take a different angle: storytelling, question-driven, educational, CTA-focused, social proof, bold hook, short and punchy

When refining copies via chat:
1. Understand the user's specific request (tone change, length adjustment, hashtag updates)
2. Maintain brand consistency while implementing requested changes
3. Explain what changes were made and why
4. Preserve the core message while adapting to feedback"""

    async def generate_copies(self, strategy_data: dict) -> CopyOutput:
        """
        Generate platform-specific social media copies from strategy data.
        
        Args:
            strategy_data: Strategy record data including content_pillars, content_themes,
                          engagement_tactics, platform_recommendations, posting_schedule,
                          and target audience info
                          
        Returns:
            CopyOutput: Structured output containing a list of CopyItems, one per platform
                          
        Raises:
            StructuredOutputException: If the agent fails to return structured output
        """
        platforms = strategy_data.get("platform_recommendations", [])
        
        # Handle both list of strings and list of dicts (PlatformRecommendation objects)
        if platforms and isinstance(platforms[0], dict):
            platform_names = [p.get("platform", "") for p in platforms]
        else:
            platform_names = platforms
        
        platform_list = ", ".join(platform_names) if platform_names else "Instagram, Twitter, LinkedIn"
        
        # Also handle content_pillars, content_themes, engagement_tactics which may be lists
        content_pillars = strategy_data.get("content_pillars", [])
        content_themes = strategy_data.get("content_themes", [])
        engagement_tactics = strategy_data.get("engagement_tactics", [])
        
        # Convert to strings if they're lists
        pillars_str = ", ".join(content_pillars) if isinstance(content_pillars, list) else str(content_pillars)
        themes_str = ", ".join(content_themes) if isinstance(content_themes, list) else str(content_themes)
        tactics_str = ", ".join(engagement_tactics) if isinstance(engagement_tactics, list) else str(engagement_tactics)

        user_prompt = f"""Generate social media copies for the following brand strategy:

Brand Name: {strategy_data.get("brand_name", "N/A")}
Industry: {strategy_data.get("industry", "N/A")}
Target Audience: {strategy_data.get("target_audience", "N/A")}
Goals: {strategy_data.get("goals", "N/A")}

Content Pillars: {pillars_str}
Content Themes: {themes_str}
Engagement Tactics: {tactics_str}
Posting Schedule: {strategy_data.get("posting_schedule", "N/A")}

IMPORTANT: Generate exactly 7 unique copy variations for EACH of these 4 platforms: Twitter/X, Instagram, LinkedIn, Facebook.
That means 28 total CopyItems in the output (7 for Twitter, 7 for Instagram, 7 for LinkedIn, 7 for Facebook).

Each copy must include engaging caption text and relevant hashtags tailored to the platform.
Each of the 7 variations per platform should take a different angle:
1. Bold hook — attention-grabbing opening
2. Storytelling — emotional narrative
3. Question-driven — sparks conversation
4. Educational — thought leadership
5. Social proof — credibility and trust
6. Short and punchy — scroll-stopping brevity
7. CTA-focused — drives action (clicks, saves, shares)"""

        result = await self.agent.invoke_async(
            user_prompt, structured_output_model=CopyOutput
        )

        if result.structured_output is None:
            raise StructuredOutputException(
                "Copywriter agent failed to return structured output"
            )

        return result.structured_output

    async def generate_copies_stream(
        self, strategy_data: dict
    ) -> AsyncIterator[dict]:
        """
        Stream copy generation events from the agent in real time.

        Yields SSE-compatible dicts with event type and data as the agent
        processes the request. The final event contains the structured output.

        Args:
            strategy_data: Strategy record data

        Yields:
            dict with 'event' key and event-specific data:
              - {"event": "thinking", "text": "..."} for text deltas
              - {"event": "lifecycle", "phase": "..."} for lifecycle events
              - {"event": "result", "copies": [...]} for the final output
              - {"event": "error", "message": "..."} on failure
        """
        platforms = strategy_data.get("platform_recommendations", [])
        if platforms and isinstance(platforms[0], dict):
            platform_names = [p.get("platform", "") for p in platforms]
        else:
            platform_names = platforms
        platform_list = ", ".join(platform_names) if platform_names else "Instagram, Twitter, LinkedIn"

        content_pillars = strategy_data.get("content_pillars", [])
        content_themes = strategy_data.get("content_themes", [])
        engagement_tactics = strategy_data.get("engagement_tactics", [])
        pillars_str = ", ".join(content_pillars) if isinstance(content_pillars, list) else str(content_pillars)
        themes_str = ", ".join(content_themes) if isinstance(content_themes, list) else str(content_themes)
        tactics_str = ", ".join(engagement_tactics) if isinstance(engagement_tactics, list) else str(engagement_tactics)

        user_prompt = f"""Generate social media copies for the following brand strategy:

Brand Name: {strategy_data.get("brand_name", "N/A")}
Industry: {strategy_data.get("industry", "N/A")}
Target Audience: {strategy_data.get("target_audience", "N/A")}
Goals: {strategy_data.get("goals", "N/A")}

Content Pillars: {pillars_str}
Content Themes: {themes_str}
Engagement Tactics: {tactics_str}
Posting Schedule: {strategy_data.get("posting_schedule", "N/A")}

IMPORTANT: Generate exactly 7 unique copy variations for EACH of these 4 platforms: Twitter/X, Instagram, LinkedIn, Facebook.
That means 28 total CopyItems in the output (7 for Twitter, 7 for Instagram, 7 for LinkedIn, 7 for Facebook).

Each copy must include engaging caption text and relevant hashtags tailored to the platform.
Each of the 7 variations per platform should take a different angle:
1. Bold hook — attention-grabbing opening
2. Storytelling — emotional narrative
3. Question-driven — sparks conversation
4. Educational — thought leadership
5. Social proof — credibility and trust
6. Short and punchy — scroll-stopping brevity
7. CTA-focused — drives action (clicks, saves, shares)"""

        # Use a separate non-streaming agent for structured output
        # but stream the thinking process via stream_async first
        yield {"event": "lifecycle", "phase": "Connecting to Bedrock model..."}

        accumulated_text = ""
        result = None

        try:
            async for event in self.agent.stream_async(
                user_prompt, structured_output_model=CopyOutput
            ):
                # Text delta from the model
                if "data" in event:
                    chunk = event["data"]
                    accumulated_text += chunk
                    yield {"event": "thinking", "text": chunk}

                # Reasoning / thinking content (if model supports it)
                elif event.get("reasoningText"):
                    yield {"event": "thinking", "text": event["reasoningText"]}

                # Lifecycle: event loop init
                elif event.get("init_event_loop", False):
                    yield {"event": "lifecycle", "phase": "Agent loop initialized"}

                # Lifecycle: event loop cycle start
                elif event.get("start_event_loop", False):
                    yield {"event": "lifecycle", "phase": "Processing strategy data..."}

                # Final result
                elif "result" in event:
                    result = event["result"]

            if result and result.structured_output is not None:
                copies_data = [
                    {"text": c.text, "platform": c.platform, "hashtags": c.hashtags}
                    for c in result.structured_output.copies
                ]
                yield {"event": "result", "copies": copies_data}
            else:
                yield {"event": "error", "message": "Agent did not return structured output"}

        except Exception as e:
            yield {"event": "error", "message": str(e)}

    async def chat_refine(
        self,
        copy_text: str,
        platform: str,
        hashtags: List[str],
        strategy_data: dict,
        user_message: str
    ) -> ChatResponse:
        """
        Refine a copy via conversational chat with the AI.
        
        Args:
            copy_text: The current copy text to refine
            platform: Target social media platform
            hashtags: Current list of hashtags
            strategy_data: Associated strategy data for brand context
            user_message: User's refinement request
            
        Returns:
            ChatResponse: Updated copy text, hashtags, and AI explanation
            
        Raises:
            StructuredOutputException: If the agent fails to return structured output
        """
        hashtags_str = ", ".join(hashtags) if hashtags else "None"

        user_prompt = f"""I need you to refine the following social media copy based on my feedback.

Current Copy:
- Platform: {platform}
- Text: {copy_text}
- Hashtags: {hashtags_str}

Brand Context:
- Brand: {strategy_data.get("brand_name", "N/A")}
- Industry: {strategy_data.get("industry", "N/A")}
- Target Audience: {strategy_data.get("target_audience", "N/A")}
- Content Pillars: {", ".join(strategy_data.get("content_pillars", []))}

My feedback: {user_message}

Please update the copy based on my feedback while maintaining brand consistency. 
Provide the updated text, updated hashtags, and explain what changes you made."""

        result = await self.agent.invoke_async(
            user_prompt, structured_output_model=ChatResponse
        )

        if result.structured_output is None:
            raise StructuredOutputException(
                "Copywriter agent failed to return structured chat response"
            )

        return result.structured_output
