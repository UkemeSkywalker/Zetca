"""
Publisher API Routes

This module defines the REST API endpoints for publisher operations including
listing publish logs, querying logs by post, and triggering on-demand manual
publishing to LinkedIn.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from models.publisher import PublishLogRecord
from repositories.publisher_repository import PublisherRepository
from repositories.scheduler_repository import SchedulerRepository
from repositories.user_repository import UserRepository
from repositories.media_repository import MediaRepository
from services.linkedin_client import LinkedInClient
from services.publisher_service import PublisherService
from middleware.auth import auth_middleware
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/publisher", tags=["publisher"])

# Initialize repositories
publisher_repository = PublisherRepository(
    table_name=settings.dynamodb_publish_log_table,
    region=settings.aws_region,
)
scheduler_repository = SchedulerRepository(
    table_name=settings.dynamodb_scheduled_posts_table,
    region=settings.aws_region,
)
user_repository = UserRepository(
    table_name=settings.dynamodb_users_table,
    region=settings.aws_region,
)
media_repository = MediaRepository(
    table_name=settings.dynamodb_media_table,
    region=settings.aws_region,
)
linkedin_client = LinkedInClient(timeout_seconds=settings.linkedin_api_timeout_seconds)

publisher_service = PublisherService(
    linkedin_client=linkedin_client,
    publisher_repository=publisher_repository,
    scheduler_repository=scheduler_repository,
    user_repository=user_repository,
    media_repository=media_repository,
)


@router.get("/logs", response_model=List[PublishLogRecord])
async def list_logs(user_id: str = Depends(auth_middleware.get_current_user)):
    """
    List all publish log records for the authenticated user,
    ordered by attemptedAt descending.
    """
    try:
        records = await publisher_repository.list_logs_by_user(user_id)
        logger.info(f"Retrieved {len(records)} publish logs for user: {user_id}")
        return records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list publish logs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve publish logs. Please try again.",
        )


@router.get("/logs/{post_id}", response_model=List[PublishLogRecord])
async def list_logs_by_post(
    post_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    List all publish log records for a specific post.
    Returns 403 if the post belongs to a different user.
    """
    try:
        # Verify post ownership
        post_owner = await publisher_repository.get_post_owner(post_id)
        if post_owner is not None and post_owner != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )

        records = await publisher_repository.list_logs_by_post(post_id)
        logger.info(f"Retrieved {len(records)} publish logs for post: {post_id}")
        return records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list publish logs for post {post_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve publish logs. Please try again.",
        )


@router.post("/publish/{post_id}", response_model=PublishLogRecord)
async def publish_post(
    post_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
):
    """
    Immediately publish a specific post to LinkedIn (on-demand manual publish).

    Verifies post exists, belongs to user, platform is linkedin, and not already published.
    Then publishes via the LinkedIn API and returns the resulting log record.
    """
    try:
        # Retrieve the post (without user filter to distinguish 404 vs 403)
        post = await scheduler_repository.get_post_by_id(post_id)
        if post is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to publish this post",
            )

        if post.platform != "linkedin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only LinkedIn publishing is currently supported",
            )

        if post.status == "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post is already published",
            )

        # Fetch user LinkedIn credentials
        credentials = await user_repository.get_user_linkedin_credentials(user_id)
        if credentials is None or not credentials.get('linkedinAccessToken'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LinkedIn account not connected. Please connect your LinkedIn account first.",
            )

        if not credentials.get('linkedinSub'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LinkedIn profile information is incomplete. Please reconnect your LinkedIn account.",
            )

        # Publish via PublisherService
        log_record = await publisher_service.publish_post(post, credentials)

        if log_record.status == "failed":
            logger.warning(f"Manual publish failed for post {post_id}: {log_record.error_code}")
        else:
            logger.info(f"Manual publish succeeded for post {post_id}")

        return log_record

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual publish failed for post {post_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Publishing failed. Please try again.",
        )
