"""
Real Strategist Agent using Strands Agents SDK with Amazon Bedrock.

This module implements the production Strategist Agent that uses the Strands Agents
Python SDK to generate social media strategies via Amazon Bedrock (Claude 4 Sonnet).
The agent returns structured output validated by Pydantic models.
"""

from strands import Agent
from strands.models.bedrock import BedrockModel
from models.strategy import StrategyInput, StrategyOutput


class StructuredOutputException(Exception):
    """Raised when the agent fails to return structured output."""
    pass


class StrategistAgent:
    """
    Production Strategist Agent using Strands Agents SDK with Bedrock.
    
    This agent generates comprehensive social media strategies by leveraging
    Claude 4 Sonnet through Amazon Bedrock. It uses structured output to ensure
    the response conforms to the StrategyOutput Pydantic model.
    """
    
    def __init__(self, aws_region: str, model_id: str = "anthropic.claude-4-sonnet-20250514-v1:0"):
        """
        Initialize the Strategist Agent with Bedrock provider.
        
        Args:
            aws_region: AWS region for Bedrock API calls
            model_id: Bedrock model identifier (default: Claude 4 Sonnet)
        """
        self.model = BedrockModel(
            region_name=aws_region,
            model_id=model_id
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

        response = await self.agent.invoke_async(
            user_prompt,
            structured_output_model=StrategyOutput
        )
        
        # Extract structured output from agent response
        if not response.structured_output:
            raise StructuredOutputException("Agent did not return structured output")
        
        return response.structured_output
