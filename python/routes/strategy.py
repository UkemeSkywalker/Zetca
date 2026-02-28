"""
Strategy API Routes

This module defines the REST API endpoints for strategy generation and retrieval.
Uses the real Strands Agent with Amazon Bedrock for production strategy generation.
"""

from fastapi import APIRouter, HTTPException, status
from models.strategy import StrategyInput, StrategyOutput
from services.strategist_agent import StrategistAgent, StructuredOutputException
from config import settings
import logging
import asyncio
from botocore.exceptions import BotoCoreError, ClientError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/strategy", tags=["strategy"])

# Initialize real Strands agent with Bedrock
agent = StrategistAgent(
    aws_region=settings.aws_region,
    model_id=settings.bedrock_model_id
)


@router.post("/generate", response_model=StrategyOutput, status_code=status.HTTP_200_OK)
async def generate_strategy(strategy_input: StrategyInput):
    """
    Generate a new social media strategy using the Strands Agent.
    
    Accepts brand information and returns a comprehensive social media strategy
    including content pillars, posting schedule, platform recommendations,
    content themes, engagement tactics, and visual prompts.
    
    Args:
        strategy_input: Brand information (brand_name, industry, target_audience, goals)
        
    Returns:
        StrategyOutput: Generated strategy with all components
        
    Raises:
        HTTPException: 
            - 400 for validation errors
            - 500 for agent/structured output errors
            - 503 for Bedrock service unavailability
            - 504 for timeout errors
    """
    try:
        logger.info(f"Generating strategy for brand: {strategy_input.brand_name}")
        
        # Call real Strands agent with timeout
        strategy_output = await asyncio.wait_for(
            agent.generate_strategy(strategy_input),
            timeout=settings.agent_timeout_seconds
        )
        
        logger.info(f"Successfully generated strategy for: {strategy_input.brand_name}")
        return strategy_output
        
    except asyncio.TimeoutError:
        # Timeout after configured seconds
        logger.error(f"Strategy generation timed out after {settings.agent_timeout_seconds} seconds")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Strategy generation timed out after {settings.agent_timeout_seconds} seconds. Please try again."
        )
        
    except StructuredOutputException as e:
        # Agent failed to return structured output
        logger.error(f"Structured output error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate structured strategy output. Please try again."
        )
        
    except (BotoCoreError, ClientError) as e:
        # AWS Bedrock service errors
        logger.error(f"Bedrock service error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again later."
        )
        
    except ValueError as e:
        # Pydantic validation errors
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
        
    except Exception as e:
        # Unexpected errors
        logger.error(f"Strategy generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Strategy generation failed. Please try again."
        )
