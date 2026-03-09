"""
Strategy API Routes

This module defines the REST API endpoints for strategy generation and retrieval.
Supports both real Strands Agent with Amazon Bedrock and mock agent for development.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from models.strategy import StrategyInput, StrategyOutput, StrategyRecord
from services.strategist_agent import StrategistAgent, StructuredOutputException
from services.mock_agent import MockStrategistAgent
from services.strategy_service import StrategyService
from repositories.strategy_repository import StrategyRepository
from middleware.auth import auth_middleware
from config import settings
import logging
import asyncio
from botocore.exceptions import BotoCoreError, ClientError
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/strategy", tags=["strategy"])

# Initialize agent based on configuration
if settings.use_mock_agent:
    logger.info("Using MOCK agent for strategy generation (no AWS required)")
    agent = MockStrategistAgent()
else:
    logger.info(f"Using REAL Strands agent with Bedrock (region: {settings.aws_region}, model: {settings.bedrock_model_id})")
    agent = StrategistAgent(
        aws_region=settings.aws_region,
        model_id=settings.bedrock_model_id,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key
    )

# Initialize repository and service
repository = StrategyRepository(
    table_name=settings.dynamodb_strategies_table,
    region=settings.aws_region
)
strategy_service = StrategyService(agent=agent, repository=repository)


@router.post("/generate", response_model=StrategyRecord, status_code=status.HTTP_200_OK)
async def generate_strategy(
    strategy_input: StrategyInput,
    user_id: str = Depends(auth_middleware.get_current_user)
):
    """
    Generate a new social media strategy and store it in the database.
    
    Uses either mock agent (for development) or real Strands Agent with Bedrock
    based on USE_MOCK_AGENT configuration.
    
    Accepts brand information and returns a comprehensive social media strategy
    including content pillars, posting schedule, platform recommendations,
    content themes, engagement tactics, and visual prompts.
    
    The generated strategy is automatically persisted to DynamoDB and associated
    with the authenticated user.
    
    Args:
        strategy_input: Brand information (brand_name, industry, target_audience, goals)
        user_id: Authenticated user ID from JWT token (injected by auth middleware)
        
    Returns:
        StrategyRecord: Complete strategy record including ID, timestamps, and generated strategy
        
    Raises:
        HTTPException: 
            - 401 for missing or invalid authentication
            - 400 for validation errors
            - 500 for agent/structured output errors
            - 503 for Bedrock service unavailability (real agent only)
            - 504 for timeout errors
    """
    
    try:
        logger.info(f"Generating strategy for brand: {strategy_input.brand_name} (mock={settings.use_mock_agent})")
        
        # Call service with timeout
        strategy_record = await asyncio.wait_for(
            strategy_service.generate_and_store_strategy(strategy_input, user_id),
            timeout=settings.agent_timeout_seconds
        )
        
        logger.info(f"Successfully generated and stored strategy for: {strategy_input.brand_name} (ID: {strategy_record.id})")
        return strategy_record
        
    except asyncio.TimeoutError:
        # Timeout after configured seconds
        logger.error(f"Strategy generation timed out after {settings.agent_timeout_seconds} seconds")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Strategy generation timed out after {settings.agent_timeout_seconds} seconds. Please try again."
        )
        
    except StructuredOutputException as e:
        # Agent failed to return structured output
        logger.error(f"Structured output error: {str(e)}", exc_info=True)
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


@router.get("/list", response_model=List[StrategyRecord], status_code=status.HTTP_200_OK)
async def list_strategies(user_id: str = Depends(auth_middleware.get_current_user)):
    """
    List all strategies for the authenticated user.
    
    Returns all strategy records associated with the user, ordered by creation date
    (newest first).
    
    Args:
        user_id: Authenticated user ID from JWT token (injected by auth middleware)
    
    Returns:
        List[StrategyRecord]: List of strategy records, sorted by created_at descending
        
    Raises:
        HTTPException: 
            - 401 for missing or invalid authentication
            - 500 for database errors
    """
    
    try:
        logger.info(f"Retrieving strategy list for user: {user_id}")
        strategies = await strategy_service.get_user_strategies(user_id)
        logger.info(f"Found {len(strategies)} strategies for user: {user_id}")
        return strategies
        
    except Exception as e:
        logger.error(f"Failed to retrieve strategies: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve strategies. Please try again."
        )


@router.get("/{strategy_id}", response_model=StrategyRecord, status_code=status.HTTP_200_OK)
async def get_strategy(
    strategy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user)
):
    """
    Get a specific strategy by ID.
    
    Retrieves a single strategy record by its unique identifier. Enforces user isolation
    to ensure users can only access their own strategies.
    
    Args:
        strategy_id: Unique identifier of the strategy to retrieve
        user_id: Authenticated user ID from JWT token (injected by auth middleware)
        
    Returns:
        StrategyRecord: The requested strategy record
        
    Raises:
        HTTPException:
            - 401 for missing or invalid authentication
            - 404 if strategy not found or belongs to another user
            - 500 for database errors
    """
    
    try:
        logger.info(f"Retrieving strategy {strategy_id} for user: {user_id}")
        strategy = await strategy_service.get_strategy(strategy_id, user_id)
        
        if strategy is None:
            logger.warning(f"Strategy {strategy_id} not found for user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found"
            )
        
        logger.info(f"Successfully retrieved strategy {strategy_id}")
        return strategy
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
        
    except Exception as e:
        logger.error(f"Failed to retrieve strategy {strategy_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve strategy. Please try again."
        )
