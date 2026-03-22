"""
Scheduler API Routes

This module defines the REST API endpoints for scheduler operations including
auto-scheduling copies via the AI agent, manual scheduling of individual posts,
and full CRUD operations on scheduled posts. Supports both real Strands Agent
with Amazon Bedrock and mock agent for development.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Response
from models.scheduler import (
    AutoScheduleInput,
    ManualScheduleInput,
    ScheduledPostRecord,
    ScheduledPostUpdate,
)
from services.mock_scheduler_agent import MockSchedulerAgent
from services.scheduler_service import SchedulerService
from repositories.scheduler_repository import SchedulerRepository
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
router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])

# Initialize agent based on configuration
if settings.use_mock_agent:
    logger.info("Using MOCK agent for scheduling (no AWS required)")
    agent = MockSchedulerAgent()
else:
    logger.info(f"Using REAL Scheduler agent with Bedrock (region: {settings.aws_region}, model: {settings.bedrock_model_id})")
    from services.scheduler_agent import SchedulerAgent, StructuredOutputException
    agent = SchedulerAgent(
        aws_region=settings.aws_region,
        model_id=settings.bedrock_model_id,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

# Import StructuredOutputException for mock mode too (from copywriter as fallback)
if settings.use_mock_agent:
    from services.copywriter_agent import StructuredOutputException

# Initialize repositories and service
scheduler_repository = SchedulerRepository(
    table_name=settings.dynamodb_scheduled_posts_table,
    region=settings.aws_region,
)
copy_repository = CopyRepository(
    table_name=settings.dynamodb_copies_table,
    region=settings.aws_region,
)
strategy_repository = StrategyRepository(
    table_name=settings.dynamodb_strategies_table,
    region=settings.aws_region,
)
scheduler_service = SchedulerService(
    agent=agent,
    scheduler_repository=scheduler_repository,
    copy_repository=copy_repository,
    strategy_repository=strategy_repository,
)


@router.post("/auto-schedule", response_model=List[ScheduledPostRecord], status_code=status.HTTP_200_OK)
async def auto_schedule(
    input: AutoScheduleInput,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Auto-schedule all copies for a strategy using the AI agent.

    The Scheduler Agent analyzes the strategy's posting schedule, platform
    recommendations, and content themes to determine optimal dates and times
    for each copy. All resulting posts are stored with status "scheduled".

    Args:
        input: Contains strategy_id to auto-schedule copies from
        user_id: Authenticated user ID from JWT token

    Returns:
        List[ScheduledPostRecord]: Created scheduled post records

    Raises:
        HTTPException: 400, 401, 403, 404, 500, 503, 504
    """
    try:
        logger.info(f"Auto-scheduling copies for strategy: {input.strategy_id} (mock={settings.use_mock_agent})")

        records = await asyncio.wait_for(
            scheduler_service.auto_schedule(input.strategy_id, user_id),
            timeout=settings.agent_timeout_seconds,
        )

        logger.info(f"Auto-scheduled {len(records)} posts for strategy: {input.strategy_id}")
        return records

    except asyncio.TimeoutError:
        logger.error(f"Auto-scheduling timed out after {settings.agent_timeout_seconds}s")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Auto-scheduling timed out. Please try again.",
        )
    except StructuredOutputException as e:
        logger.error(f"Structured output error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate structured scheduling output. Please try again.",
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
        logger.error(f"Auto-scheduling failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auto-scheduling failed. Please try again.",
        )


@router.post("/manual-schedule", response_model=ScheduledPostRecord, status_code=status.HTTP_200_OK)
async def manual_schedule(
    input: ManualScheduleInput,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Manually schedule a single copy to a specific date and time.

    Creates a scheduled post record with the provided date, time, and platform.
    The copy must exist and belong to the authenticated user.

    Args:
        input: Contains copyId, scheduledDate, scheduledTime, platform
        user_id: Authenticated user ID from JWT token

    Returns:
        ScheduledPostRecord: The created scheduled post record

    Raises:
        HTTPException: 400, 401, 403, 404, 500
    """
    try:
        logger.info(f"Manual scheduling copy: {input.copy_id}")

        record = await scheduler_service.manual_schedule(input, user_id)

        logger.info(f"Manually scheduled post {record.id} for copy: {input.copy_id}")
        return record

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual scheduling failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Manual scheduling failed. Please try again.",
        )


@router.get("/posts", response_model=List[ScheduledPostRecord], status_code=status.HTTP_200_OK)
async def list_posts(
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    List all scheduled posts for the authenticated user.

    Returns posts sorted by scheduledDate ascending.

    Args:
        user_id: Authenticated user ID from JWT token

    Returns:
        List[ScheduledPostRecord]: User's scheduled posts

    Raises:
        HTTPException: 401, 500
    """
    try:
        logger.info(f"Listing scheduled posts for user: {user_id}")
        posts = await scheduler_service.list_posts_by_user(user_id)
        logger.info(f"Found {len(posts)} scheduled posts for user: {user_id}")
        return posts

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list scheduled posts: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scheduled posts. Please try again.",
        )


@router.get("/posts/strategy/{strategy_id}", response_model=List[ScheduledPostRecord], status_code=status.HTTP_200_OK)
async def list_posts_by_strategy(
    strategy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    List scheduled posts filtered by strategy.

    Verifies strategy ownership before returning posts sorted by
    scheduledDate ascending.

    Args:
        strategy_id: Strategy to filter posts by
        user_id: Authenticated user ID from JWT token

    Returns:
        List[ScheduledPostRecord]: Posts for the strategy

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Listing scheduled posts for strategy: {strategy_id}")
        posts = await scheduler_service.list_posts_by_strategy(strategy_id, user_id)
        logger.info(f"Found {len(posts)} scheduled posts for strategy: {strategy_id}")
        return posts

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list posts by strategy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scheduled posts. Please try again.",
        )


@router.get("/posts/{post_id}", response_model=ScheduledPostRecord, status_code=status.HTTP_200_OK)
async def get_post(
    post_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Get a specific scheduled post by ID.

    Enforces user isolation — returns 403 if the post belongs to
    another user, 404 if it doesn't exist.

    Args:
        post_id: Unique identifier of the scheduled post
        user_id: Authenticated user ID from JWT token

    Returns:
        ScheduledPostRecord: The requested scheduled post

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Retrieving scheduled post: {post_id}")
        record, belongs_to_other = await scheduler_service.get_post(post_id, user_id)

        if belongs_to_other:
            logger.warning(f"User {user_id} attempted to access post {post_id} belonging to another user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheduled post not found",
            )

        return record

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve post {post_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scheduled post. Please try again.",
        )


@router.put("/posts/{post_id}", response_model=ScheduledPostRecord, status_code=status.HTTP_200_OK)
async def update_post(
    post_id: str,
    updates: ScheduledPostUpdate,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Update a scheduled post.

    Enforces user isolation — returns 403 if the post belongs to
    another user, 404 if it doesn't exist.

    Args:
        post_id: ID of the post to update
        updates: Fields to update (all optional)
        user_id: Authenticated user ID from JWT token

    Returns:
        ScheduledPostRecord: The updated scheduled post

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Updating scheduled post: {post_id}")
        record = await scheduler_service.update_post(post_id, updates, user_id)
        logger.info(f"Successfully updated post: {post_id}")
        return record

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update post {post_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update scheduled post. Please try again.",
        )


@router.delete("/posts/clear-all", status_code=status.HTTP_200_OK)
async def delete_all_posts(
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Delete all scheduled posts for the authenticated user.

    Args:
        user_id: Authenticated user ID from JWT token

    Returns:
        JSON with count of deleted posts

    Raises:
        HTTPException: 401, 500
    """
    try:
        logger.info(f"Deleting all scheduled posts for user: {user_id}")
        count = await scheduler_service.delete_all_posts(user_id)
        logger.info(f"Deleted {count} scheduled posts for user: {user_id}")
        return {"deleted": count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete all posts: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete scheduled posts. Please try again.",
        )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Delete a scheduled post.

    Enforces user isolation — returns 403 if the post belongs to
    another user, 404 if it doesn't exist.

    Args:
        post_id: ID of the post to delete
        user_id: Authenticated user ID from JWT token

    Returns:
        204 No Content on success

    Raises:
        HTTPException: 401, 403, 404, 500
    """
    try:
        logger.info(f"Deleting scheduled post: {post_id}")
        deleted, belongs_to_other = await scheduler_service.delete_post(post_id, user_id)

        if belongs_to_other:
            logger.warning(f"User {user_id} attempted to delete post {post_id} belonging to another user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to delete this resource",
            )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheduled post not found",
            )

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete post {post_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete scheduled post. Please try again.",
        )
