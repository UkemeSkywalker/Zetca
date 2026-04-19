"""
DynamoDB repository for publish log data access.

This module provides data access methods for storing and retrieving publish log
records from the publish-log DynamoDB table. It supports querying by user (via
UserIdIndex) and by post (via PostIdIndex), and includes access control helpers
for verifying post ownership.
"""

import boto3
from boto3.dynamodb.conditions import Key
from typing import List, Optional
from datetime import datetime, UTC
from models.publisher import PublishLogRecord
from config import settings


class PublisherRepository:
    """Repository for publish log data access in DynamoDB."""

    def __init__(self, table_name: str = None, region: str = None):
        self.table_name = table_name or settings.dynamodb_publish_log_table
        self.region = region or settings.aws_region
        session = boto3.Session(region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)
        # Separate reference to scheduled-posts table for ownership checks
        self.scheduled_posts_table = dynamodb.Table(
            settings.dynamodb_scheduled_posts_table
        )

    async def create_log(self, record: PublishLogRecord) -> PublishLogRecord:
        """Store a publish log record."""
        self.table.put_item(Item=self._record_to_item(record))
        return record

    async def list_logs_by_user(self, user_id: str) -> List[PublishLogRecord]:
        """Query UserIdIndex for all logs belonging to a user, sorted by attemptedAt descending."""
        response = self.table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False  # Sort by attemptedAt descending
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def list_logs_by_post(self, post_id: str) -> List[PublishLogRecord]:
        """Query PostIdIndex for all publish attempts on a specific post."""
        response = self.table.query(
            IndexName='PostIdIndex',
            KeyConditionExpression=Key('postId').eq(post_id),
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def get_post_owner(self, post_id: str) -> Optional[str]:
        """Retrieve the userId for a post from the scheduled-posts table (for access control)."""
        response = self.scheduled_posts_table.get_item(Key={'postId': post_id})
        if 'Item' not in response:
            return None
        return response['Item'].get('userId')

    def _record_to_item(self, record: PublishLogRecord) -> dict:
        """Convert PublishLogRecord to DynamoDB item."""
        item = {
            'logId': record.log_id,
            'postId': record.post_id,
            'userId': record.user_id,
            'platform': record.platform,
            'status': record.status,
            'attemptedAt': record.attempted_at.isoformat(),
        }
        if record.linkedin_post_id is not None:
            item['linkedinPostId'] = record.linkedin_post_id
        if record.error_code is not None:
            item['errorCode'] = record.error_code
        if record.error_message is not None:
            item['errorMessage'] = record.error_message
        return item

    def _item_to_record(self, item: dict) -> PublishLogRecord:
        """Convert DynamoDB item to PublishLogRecord."""
        return PublishLogRecord(
            log_id=item['logId'],
            post_id=item['postId'],
            user_id=item['userId'],
            platform=item.get('platform', 'linkedin'),
            status=item['status'],
            linkedin_post_id=item.get('linkedinPostId'),
            error_code=item.get('errorCode'),
            error_message=item.get('errorMessage'),
            attempted_at=datetime.fromisoformat(item['attemptedAt']),
        )
