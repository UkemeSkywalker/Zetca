"""
DynamoDB repository for scheduled post data access.

This module provides data access methods for storing and retrieving scheduled post
records from DynamoDB with user isolation enforcement, strategy-based querying,
and full CRUD operations.
"""

import boto3
from boto3.dynamodb.conditions import Key
from typing import Optional, List
from datetime import datetime, UTC
from models.scheduler import ScheduledPostRecord
from config import settings


class SchedulerRepository:
    """Repository for scheduled post data access in DynamoDB."""

    def __init__(self, table_name: str = None, region: str = None):
        self.table_name = table_name or settings.dynamodb_scheduled_posts_table
        self.region = region or settings.aws_region
        # Initialize DynamoDB resource using default profile from ~/.aws/credentials
        # (explicitly using profile_name to avoid env var credentials meant for Bedrock)
        session = boto3.Session(profile_name='default', region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)

    async def create_post(self, record: ScheduledPostRecord) -> ScheduledPostRecord:
        """Store a single scheduled post record."""
        self.table.put_item(Item=self._record_to_item(record))
        return record

    async def create_posts(self, records: List[ScheduledPostRecord]) -> List[ScheduledPostRecord]:
        """Batch store multiple scheduled post records."""
        with self.table.batch_writer() as batch:
            for record in records:
                batch.put_item(Item=self._record_to_item(record))
        return records

    async def get_post_by_id(self, post_id: str, user_id: str = None) -> Optional[ScheduledPostRecord]:
        """Retrieve a post by ID with optional user isolation."""
        response = self.table.get_item(Key={'postId': post_id})
        if 'Item' not in response:
            return None
        item = response['Item']
        if user_id is not None and item['userId'] != user_id:
            return None
        return self._item_to_record(item)

    async def post_exists(self, post_id: str) -> bool:
        """Check if a post exists regardless of owner."""
        response = self.table.get_item(Key={'postId': post_id})
        return 'Item' in response

    async def list_posts_by_user(self, user_id: str) -> List[ScheduledPostRecord]:
        """List all posts for a user via UserIdIndex, sorted by scheduledDate ascending."""
        response = self.table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=True  # Sort by scheduledDate ascending
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def list_posts_by_strategy(self, strategy_id: str) -> List[ScheduledPostRecord]:
        """List all posts for a strategy via StrategyIdIndex, sorted by scheduledDate ascending."""
        response = self.table.query(
            IndexName='StrategyIdIndex',
            KeyConditionExpression=Key('strategyId').eq(strategy_id),
            ScanIndexForward=True  # Sort by scheduledDate ascending
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def update_post(self, post_id: str, updates: dict) -> ScheduledPostRecord:
        """Update post fields and set updatedAt. Returns updated record."""
        now = datetime.now(UTC).isoformat()

        # Build update expression dynamically from provided fields
        update_parts = []
        attr_names = {}
        attr_values = {':updated_at': now}

        field_mapping = {
            'scheduled_date': 'scheduledDate',
            'scheduled_time': 'scheduledTime',
            'content': 'content',
            'platform': 'platform',
            'hashtags': 'hashtags',
            'status': 'status',
        }

        for py_field, db_field in field_mapping.items():
            if py_field in updates and updates[py_field] is not None:
                placeholder = f':{py_field}'
                name_placeholder = f'#{py_field}'
                update_parts.append(f'{name_placeholder} = {placeholder}')
                attr_names[name_placeholder] = db_field
                attr_values[placeholder] = updates[py_field]

        update_parts.append('#updatedAt = :updated_at')
        attr_names['#updatedAt'] = 'updatedAt'

        update_expr = 'SET ' + ', '.join(update_parts)

        response = self.table.update_item(
            Key={'postId': post_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values,
            ReturnValues='ALL_NEW'
        )
        return self._item_to_record(response['Attributes'])

    async def delete_all_by_user(self, user_id: str) -> int:
        """Delete all posts for a user. Returns the number of deleted records."""
        posts = await self.list_posts_by_user(user_id)
        with self.table.batch_writer() as batch:
            for post in posts:
                batch.delete_item(Key={'postId': post.id})
        return len(posts)

    async def delete_post(self, post_id: str) -> bool:
        """Delete a post record. Returns True if deleted."""
        response = self.table.delete_item(
            Key={'postId': post_id},
            ReturnValues='ALL_OLD'
        )
        return 'Attributes' in response

    def _record_to_item(self, record: ScheduledPostRecord) -> dict:
        """Convert ScheduledPostRecord to DynamoDB item."""
        return {
            'postId': record.id,
            'strategyId': record.strategy_id,
            'copyId': record.copy_id,
            'userId': record.user_id,
            'content': record.content,
            'platform': record.platform,
            'hashtags': record.hashtags,
            'scheduledDate': record.scheduled_date,
            'scheduledTime': record.scheduled_time,
            'status': record.status,
            'strategyColor': record.strategy_color,
            'strategyLabel': record.strategy_label,
            'createdAt': record.created_at.isoformat(),
            'updatedAt': record.updated_at.isoformat(),
        }

    def _item_to_record(self, item: dict) -> ScheduledPostRecord:
        """Convert DynamoDB item to ScheduledPostRecord."""
        return ScheduledPostRecord(
            id=item['postId'],
            strategy_id=item['strategyId'],
            copy_id=item['copyId'],
            user_id=item['userId'],
            content=item['content'],
            platform=item['platform'],
            hashtags=item.get('hashtags', []),
            scheduled_date=item['scheduledDate'],
            scheduled_time=item['scheduledTime'],
            status=item['status'],
            strategy_color=item.get('strategyColor', ''),
            strategy_label=item.get('strategyLabel', ''),
            created_at=datetime.fromisoformat(item['createdAt']),
            updated_at=datetime.fromisoformat(item['updatedAt']),
        )
