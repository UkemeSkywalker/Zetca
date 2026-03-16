"""
Copy API Routes

This module defines the REST API endpoints for copy generation, retrieval,
chat refinement, and deletion. Supports both real Strands Agent with Amazon
Bedrock and mock agent for development.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Response
from models.copy import CopyGenerateInput, CopyRecord, ChatRequest, ChatResponse
from services.mock_copywriter_agent import MockCopywriterAgent
from services.copy_service import CopyService
from repositories.copy_repository import CopyRepository
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
router = APIRouter(prefix="/api/copy", tags=["copy"])

# Initialize agent based on configuration
if settings.use_mock_agent:
    logger.info("Using MOCK agent for copy generation (no AWS required)")
    agent = MockCopywriterAgent()
else:
    logger.info(f"Using REAL Copywriter agent with Bedrock (region: {settings.aws_region}, model: {settings.bedrock_model_id})")
    from services.copywriter_agent import CopywriterAgent
    agent = CopywriterAgent(
        aws_region=settings.aws_region,
        model_id=settings.bedrock_model_id,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

# Initialize repositories and service
copy_repository = CopyRepository(
    table_name=settings.dynamodb_copies_table,
    region=settings.aws_region,
)
strategy_repository = StrategyRepository(
    table_name=settings.dynamodb_strategies_table,
    region=settings.aws_region,
)
copy_service = CopyService(
    agent=agent,
    copy_repository=copy_repository,
    strategy_repository=strategy_repository,
)


@router.post("/generate", response_model=List[CopyRecord], status_code=status.HTTP_200_OK)
async def generate_copies(
    copy_input: CopyGenerateInput,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Generate social media copies from an existing strategy.

    Uses the Copywriter Agent (mock or real) to produce platform-specific
    copies based on the strategy's content pillars, themes, and audience.
    Generated copies are persisted to DynamoDB.

    Args:
        copy_input: Contains strategy_id to generate copies from
        user_id: Authenticated user ID from JWT token

    Returns:
        List[CopyRecord]: Generated and stored copy records

    Raises:
        HTTPException: 401, 403, 404, 500, 503, 504
    """
    try:
        logger.info(f"Generating copies for strategy: {copy_input.strategy_id} (mock={settings.use_mock_agent})")

        records = await asyncio.wait_for(
            copy_service.generate_copies(copy_input.strategy_id, user_id),
            timeout=settings.agent_timeout_seconds,
        )

        logger.info(f"Generated {len(records)} copies for strategy: {copy_input.strategy_id}")
        return records

    except asyncio.TimeoutError:
        logger.error(f"Copy generation timed out after {settings.agent_timeout_seconds}s")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Copy generation timed out. Please try again.",
        )
    except HTTPException:
        raise
    except (BotoCoreError, ClientError) as e:
        logger.error(f"Bedrock service error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again later.",
        )
    except Exception as e:
        logger.error(f"Copy generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Copy generation failed. Please try again.",
        )


@router.get("/list/{strategy_id}", response_model=List[CopyRecord], status_code=status.HTTP_200_OK)
async def list_copies(
    strategy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    List all copies for a given strategy.

    Verifies strategy ownership before returning copies sorted by
    createdAt descending (newest first). Returns an empty list if
    no copies exist.

    Args:
        strategy_id: Strategy to list copies for
        user_id: Authenticated user ID from JWT token

    Returns:
        List[CopyRecord]: Copies for the strategy, newest first

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Listing copies for strategy: {strategy_id}")
        copies = await copy_service.get_copies_by_strategy(strategy_id, user_id)
        logger.info(f"Found {len(copies)} copies for strategy: {strategy_id}")
        return copies

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list copies: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve copies. Please try again.",
        )


@router.get("/{copy_id}", response_model=CopyRecord, status_code=status.HTTP_200_OK)
async def get_copy(
    copy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Get a specific copy by ID.

    Enforces user isolation — returns 403 if the copy belongs to
    another user, 404 if it doesn't exist.

    Args:
        copy_id: Unique identifier of the copy
        user_id: Authenticated user ID from JWT token

    Returns:
        CopyRecord: The requested copy record

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Retrieving copy {copy_id}")
        record, belongs_to_other = await copy_service.get_copy(copy_id, user_id)

        if belongs_to_other:
            logger.warning(f"User {user_id} attempted to access copy {copy_id} belonging to another user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Copy not found",
            )

        return record

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve copy {copy_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve copy. Please try again.",
        )


@router.post("/{copy_id}/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_refine(
    copy_id: str,
    chat_request: ChatRequest,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Chat with the AI to refine a specific copy.

    Sends the user's message along with the existing copy and strategy
    context to the Copywriter Agent. The agent returns updated text,
    hashtags, and an explanation. The copy record is updated in the DB.

    Args:
        copy_id: ID of the copy to refine
        chat_request: Contains the user's refinement message
        user_id: Authenticated user ID from JWT token

    Returns:
        ChatResponse: Updated text, hashtags, and AI explanation

    Raises:
        HTTPException: 401, 403, 404, 500, 503, 504
    """
    try:
        logger.info(f"Chat refinement for copy {copy_id}")

        chat_response, _ = await asyncio.wait_for(
            copy_service.chat_refine_copy(copy_id, chat_request.message, user_id),
            timeout=settings.agent_timeout_seconds,
        )

        logger.info(f"Successfully refined copy {copy_id}")
        return chat_response

    except asyncio.TimeoutError:
        logger.error(f"Chat refinement timed out after {settings.agent_timeout_seconds}s")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Chat refinement timed out. Please try again.",
        )
    except HTTPException:
        raise
    except (BotoCoreError, ClientError) as e:
        logger.error(f"Bedrock service error during chat: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again later.",
        )
    except Exception as e:
        logger.error(f"Chat refinement failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat refinement failed. Please try again.",
        )


@router.delete("/{copy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_copy(
    copy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Delete a specific copy.

    Enforces user isolation — returns 403 if the copy belongs to
    another user, 404 if it doesn't exist.

    Args:
        copy_id: ID of the copy to delete
        user_id: Authenticated user ID from JWT token

    Returns:
        204 No Content on success

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Deleting copy {copy_id}")
        deleted, belongs_to_other = await copy_service.delete_copy(copy_id, user_id)

        if belongs_to_other:
            logger.warning(f"User {user_id} attempted to delete copy {copy_id} belonging to another user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to delete this resource",
            )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Copy not found",
            )

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete copy {copy_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete copy. Please try again.",
        )
