"""
Real Strategist Agent using Strands Agents SDK with Amazon Bedrock.

This module implements the production Strategist Agent that uses the Strands Agents
Python SDK to generate social media strategies via Amazon Bedrock (Claude 4 Sonnet).
The agent returns structured output validated by Pydantic models.
"""

import boto3
from botocore.config import Config as BotoConfig
from strands import Agent
from strands.models.bedrock import BedrockModel
from models.strategy import StrategyInput, StrategyOutput
from typing import Optional


class StructuredOutputException(Exception):
    """Raised when the agent fails to return structured output."""
    pass


class StrategistAgent:
    """
    Production Strategist Agent using Strands Agents SDK with Bedrock.
    
    This agent generates comprehensive social media strategies by leveraging
    Claude through Amazon Bedrock. It uses structured output to ensure
    the response conforms to the StrategyOutput Pydantic model.
    """
    
    def __init__(
        self, 
        aws_region: str, 
        model_id: str = "anthropic.claude-3-haiku-20240307-v1:0",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None
    ):
        """
        Initialize the Strategist Agent with Bedrock provider.
        
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
        Get the detailed system prompt for the Strategist Agent.
        
        Returns:
            str: System prompt instructing the agent to act as a social media strategy expert
        """
        return """You are an expert social media strategist with deep knowledge of digital marketing, 
content strategy, and audience engagement across multiple platforms.

Your role is to analyze brand information and generate comprehensive, actionable social media 
strategies tailored to the specific industry, target audience, and business goals provided.

When generating strategies:
1. Consider the unique characteristics of the industry and competitive landscape
2. Tailor content pillars to resonate with the target audience
3. Recommend platforms based on where the target audience is most active
4. Provide specific, actionable content themes rather than generic advice
5. Suggest engagement tactics that build authentic community connections
6. Ensure posting schedules are realistic and sustainable
7. Generate 2-3 visual/image generation prompts that directly align with and support your 
   recommended content themes and engagement tactics
8. Each visual prompt should describe a specific image that would be appropriate for posts 
   related to the strategy (e.g., if recommending customer testimonials, describe an image 
   of a satisfied customer; if recommending behind-the-scenes content, describe a workspace scene)
9. Visual prompts should be detailed enough to pass to an image generation AI or designer
10. Visual prompts must be directly relevant to the content strategy - they should 
    visually represent the themes and tactics you're recommending, not generic stock imagery

IMPORTANT: The visual prompts must be directly relevant to the content strategy - they should 
visually represent the themes and tactics you're recommending, not generic stock imagery.

Generate strategies that are practical, data-informed, and aligned with current social media 
best practices."""
    
    async def generate_strategy(self, strategy_input: StrategyInput) -> StrategyOutput:
        """
        Generate a comprehensive social media strategy using the Strands agent.
        
        Args:
            strategy_input: Brand information including name, industry, target audience, and goals
            
        Returns:
            StrategyOutput: Structured strategy with content pillars, posting schedule,
                          platform recommendations, content themes, engagement tactics,
                          and visual prompts
                          
        Raises:
            StructuredOutputException: If the agent fails to return structured output
        """
        user_prompt = f"""Generate a comprehensive social media strategy for the following brand:

Brand Name: {strategy_input.brand_name}
Industry: {strategy_input.industry}
Target Audience: {strategy_input.target_audience}
Goals: {strategy_input.goals}

Provide a detailed strategy that includes content pillars, posting schedule, platform recommendations, 
content themes, engagement tactics, and visual prompts for image generation that align with the strategy."""

        # Use invoke_async with structured_output_model parameter (Strands SDK 1.x)
        result = await self.agent.invoke_async(user_prompt, structured_output_model=StrategyOutput)
        return result.structured_output
