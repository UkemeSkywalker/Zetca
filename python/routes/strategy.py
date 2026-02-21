"""
Strategy API Routes

This module defines the REST API endpoints for strategy generation and retrieval.
Currently uses the mock agent for testing the complete data flow.
"""

from fastapi import APIRouter, HTTPException, status
from models.strategy import StrategyInput, StrategyOutput
from services.mock_agent import MockStrategistAgent
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/strategy", tags=["strategy"])

# Initialize mock agent
mock_agent = MockStrategistAgent()


@router.post("/generate", response_model=StrategyOutput, status_code=status.HTTP_200_OK)
async def generate_strategy(strategy_input: StrategyInput):
    """
    Generate a new social media strategy.
    
    Accepts brand information and returns a comprehensive social media strategy
    including content pillars, posting schedule, platform recommendations,
    content themes, engagement tactics, and visual prompts.
    
    Args:
        strategy_input: Brand information (brand_name, industry, target_audience, goals)
        
    Returns:
        StrategyOutput: Generated strategy with all components
        
    Raises:
        HTTPException: 400 for validation errors, 500 for generation failures
    """
    try:
        logger.info(f"Generating strategy for brand: {strategy_input.brand_name}")
        
        # Call mock agent to generate strategy
        strategy_output = await mock_agent.generate_strategy(strategy_input)
        
        logger.info(f"Successfully generated strategy for: {strategy_input.brand_name}")
        return strategy_output
        
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
