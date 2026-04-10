"""
Publisher service orchestrating the LinkedIn publishing workflow.

This module coordinates scanning for due posts, retrieving user credentials,
downloading media from S3, calling the LinkedIn API, updating post statuses,
and logging all publish attempts. It handles text-only and image posts,
rate limiting, credential validation, and fault isolation across posts.
"""

import logging
import boto3
from collections import defaultdict
from typing import List, Optional, Set
from datetime import datetime, UTC

from models.publisher import PublishLogRecord, LinkedInPostResponse
from models.scheduler import ScheduledPostRecord
from services.linkedin_client import LinkedInClient
from repositories.publisher_repository import PublisherRepository
from repositories.scheduler_repository import SchedulerRepository
from repositories.user_repository import UserRepository
from repositories.media_repository import MediaRepository
from config import settings

logger = logging.getLogger(__name__)


class PublisherService:
    """Orchestrates the publishing workflow for scheduled posts."""

    def __init__(
        self,
        linkedin_client: LinkedInClient,
        publisher_repository: PublisherRepository,
        scheduler_repository: SchedulerRepository,
        user_repository: UserRepository,
        media_repository: MediaRepository,
        s3_bucket: str = None,
    ):
        self.linkedin_client = linkedin_client
        self.publisher_repository = publisher_repository
        self.scheduler_repository = scheduler_repository
        self.user_repository = user_repository
        self.media_repository = media_repository
        self.s3_bucket = s3_bucket or settings.s3_media_bucket
        session = boto3.Session(profile_name='default', region_name=settings.aws_region)
        self.s3_client = session.client('s3')

    async def get_due_posts(self) -> List[ScheduledPostRecord]:
        """
        Query scheduled-posts table for posts where:
        - status = "scheduled"
        - platform = "linkedin"
        - scheduledDate + scheduledTime <= now (UTC)

        Uses a table scan with filter expression since we need to check
        across all users.
        """
        now = datetime.now(UTC)
        all_posts = await self._scan_scheduled_posts()

        due_posts = []
        for post in all_posts:
            if post.status != "scheduled":
                continue
            if post.platform != "linkedin":
                continue
            try:
                post_dt = datetime.strptime(
                    f"{post.scheduled_date} {post.scheduled_time}",
                    "%Y-%m-%d %H:%M",
                ).replace(tzinfo=UTC)
                if post_dt <= now:
                    due_posts.append(post)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid date/time for post {post.id}: {e}")
                continue

        logger.info(f"Found {len(due_posts)} due posts out of {len(all_posts)} total")
        return due_posts

    async def _scan_scheduled_posts(self) -> List[ScheduledPostRecord]:
        """Scan the scheduled-posts table and return all records."""
        items = []
        response = self.scheduler_repository.table.scan()
        items.extend(response.get('Items', []))

        while 'LastEvaluatedKey' in response:
            response = self.scheduler_repository.table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        return [self.scheduler_repository._item_to_record(item) for item in items]

    async def publish_post(
        self, post: ScheduledPostRecord, user_credentials: dict
    ) -> PublishLogRecord:
        """
        Publish a single post to LinkedIn.

        1. Format commentary (content + hashtags)
        2. If post has mediaId → download from S3, upload to LinkedIn, create image post
        3. Else → create text-only post
        4. On success (201) → update post status to "published", create success log
        5. On failure → create failure log, leave post status unchanged
        """
        access_token = user_credentials['linkedinAccessToken']
        linkedin_sub = user_credentials['linkedinSub']
        person_urn = f"urn:li:person:{linkedin_sub}"

        commentary = self.linkedin_client.format_commentary(
            post.content, post.hashtags
        )

        # Determine text-only vs image post
        if post.media_id:
            response = await self._handle_image_post(
                post, access_token, person_urn, commentary
            )
            if response is None:
                # _handle_image_post returns None only on S3 download failure (skip post)
                return await self._create_failure_log(
                    post, "s3_download_error", "Failed to download image from S3"
                )
        else:
            response = await self.linkedin_client.create_text_post(
                access_token, person_urn, commentary
            )

        # Process the LinkedIn API response
        if response.status_code == 201:
            # Success: update post status and create success log
            await self.scheduler_repository.update_post(
                post.id, {'status': 'published'}
            )
            log_record = PublishLogRecord(
                post_id=post.id,
                user_id=post.user_id,
                platform="linkedin",
                status="published",
                linkedin_post_id=response.post_id,
            )
            await self.publisher_repository.create_log(log_record)
            logger.info(
                f"Published post {post.id} to LinkedIn (post_id={response.post_id})"
            )
            return log_record
        else:
            # Failure: create failure log, leave post status unchanged
            return await self._create_failure_log(
                post, response.error_code, response.error_message
            )

    async def _handle_image_post(
        self,
        post: ScheduledPostRecord,
        access_token: str,
        person_urn: str,
        commentary: str,
    ) -> Optional[LinkedInPostResponse]:
        """
        Handle the image post flow: retrieve media record, download from S3,
        upload to LinkedIn, create image post.

        Returns LinkedInPostResponse on success/API error, or None on S3 download failure.
        Falls back to text-only if media record not found.
        """
        # Retrieve media record
        media_record = await self.media_repository.get_media_by_id(post.media_id)
        if media_record is None:
            logger.warning(
                f"Media record not found for mediaId={post.media_id} on post {post.id}. "
                "Publishing as text-only."
            )
            return await self.linkedin_client.create_text_post(
                access_token, person_urn, commentary
            )

        s3_key = media_record.get('s3Key')
        content_type = media_record.get('contentType', 'image/jpeg')

        # Download image from S3
        image_data = await self._download_from_s3(s3_key)
        if image_data is None:
            logger.error(
                f"S3 download failed for s3Key={s3_key} on post {post.id}. Skipping post."
            )
            return None

        # Upload image to LinkedIn
        try:
            upload_response = await self.linkedin_client.initialize_image_upload(
                access_token, person_urn
            )
        except Exception as e:
            logger.error(f"Image upload init failed for post {post.id}: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="image_upload_init_error",
                error_message=str(e)[:500],
            )

        try:
            await self.linkedin_client.upload_image_binary(
                upload_response.upload_url, image_data, content_type
            )
        except Exception as e:
            logger.error(f"Image binary upload failed for post {post.id}: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="image_upload_error",
                error_message=str(e)[:500],
            )

        # Create image post
        return await self.linkedin_client.create_image_post(
            access_token, person_urn, commentary, upload_response.image_urn
        )

    async def run_scan_cycle(self, processing_post_ids: Set[str]) -> None:
        """
        Execute one full scan cycle:

        1. Query due posts
        2. Filter out posts already being processed (concurrency guard)
        3. Group by userId
        4. For each user:
           a. Fetch LinkedIn credentials
           b. If no credentials → skip all user's posts with "skipped" log
           c. Process each post sequentially
           d. On 429 → skip remaining posts for this user
        5. Remove processed post IDs from the processing set
        """
        due_posts = await self.get_due_posts()
        if not due_posts:
            return

        # Filter out already-processing posts (concurrency guard)
        posts_to_process = [
            p for p in due_posts if p.id not in processing_post_ids
        ]
        if not posts_to_process:
            logger.debug("All due posts are already being processed")
            return

        # Track which post IDs we're processing this cycle
        cycle_post_ids = {p.id for p in posts_to_process}
        processing_post_ids.update(cycle_post_ids)

        # Group posts by userId for sequential per-user processing
        posts_by_user: dict[str, list[ScheduledPostRecord]] = defaultdict(list)
        for post in posts_to_process:
            posts_by_user[post.user_id].append(post)

        try:
            for user_id, user_posts in posts_by_user.items():
                await self._process_user_posts(user_id, user_posts)
        finally:
            # Always clean up processing set
            processing_post_ids -= cycle_post_ids

    async def _process_user_posts(
        self, user_id: str, posts: List[ScheduledPostRecord]
    ) -> None:
        """Process all due posts for a single user sequentially."""
        # Fetch LinkedIn credentials
        credentials = await self.user_repository.get_user_linkedin_credentials(user_id)

        if credentials is None:
            logger.warning(f"User {user_id} not found. Skipping all posts.")
            for post in posts:
                await self._create_skipped_log(
                    post, "linkedin_not_connected", "User not found"
                )
            return

        access_token = credentials.get('linkedinAccessToken')
        linkedin_sub = credentials.get('linkedinSub')

        if not access_token:
            logger.warning(f"User {user_id} has no LinkedIn access token. Skipping.")
            for post in posts:
                await self._create_skipped_log(
                    post, "linkedin_not_connected",
                    "LinkedIn account not connected"
                )
            return

        if not linkedin_sub:
            logger.warning(f"User {user_id} has no linkedinSub. Skipping.")
            for post in posts:
                await self._create_skipped_log(
                    post, "linkedin_sub_missing",
                    "LinkedIn person URN (linkedinSub) is missing"
                )
            return

        # Process each post sequentially
        for post in posts:
            try:
                log_record = await self.publish_post(post, credentials)
                # On 429 rate limit, skip remaining posts for this user
                if (
                    log_record.status == "failed"
                    and log_record.error_code == "rate_limited"
                ):
                    logger.warning(
                        f"Rate limited for user {user_id}. "
                        f"Skipping remaining {len(posts) - posts.index(post) - 1} posts."
                    )
                    break
            except Exception as e:
                logger.error(
                    f"Unexpected error publishing post {post.id}: {e}",
                    exc_info=True,
                )
                await self._create_failure_log(
                    post, "internal_error", str(e)[:500]
                )

    async def _download_from_s3(self, s3_key: str) -> Optional[bytes]:
        """Download file from S3. Returns bytes or None on failure."""
        try:
            response = self.s3_client.get_object(
                Bucket=self.s3_bucket, Key=s3_key
            )
            return response['Body'].read()
        except Exception as e:
            logger.error(f"S3 download failed for key={s3_key}: {e}")
            return None

    async def _create_failure_log(
        self, post: ScheduledPostRecord, error_code: str, error_message: str
    ) -> PublishLogRecord:
        """Create and store a failure log record."""
        log_record = PublishLogRecord(
            post_id=post.id,
            user_id=post.user_id,
            platform="linkedin",
            status="failed",
            error_code=error_code,
            error_message=error_message,
        )
        await self.publisher_repository.create_log(log_record)
        logger.warning(
            f"Publish failed for post {post.id}: {error_code} - {error_message}"
        )
        return log_record

    async def _create_skipped_log(
        self, post: ScheduledPostRecord, error_code: str, error_message: str
    ) -> PublishLogRecord:
        """Create and store a skipped log record."""
        log_record = PublishLogRecord(
            post_id=post.id,
            user_id=post.user_id,
            platform="linkedin",
            status="skipped",
            error_code=error_code,
            error_message=error_message,
        )
        await self.publisher_repository.create_log(log_record)
        logger.info(
            f"Skipped post {post.id}: {error_code} - {error_message}"
        )
        return log_record
