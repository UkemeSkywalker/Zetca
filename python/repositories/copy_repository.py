"""
DynamoDB repository for copy data access.

This module provides data access methods for storing and retrieving copy records
from DynamoDB with user isolation enforcement and strategy-based querying.
"""

import boto3
from boto3.dynamodb.conditions import Key
from typing import Optional, List
from datetime import datetime, UTC
from models.copy import CopyRecord
from config import settings


class CopyRepository:
    """Repository for copy data access in DynamoDB."""

    def __init__(self, table_name: str = None, region: str = None):
        self.table_name = table_name or settings.dynamodb_copies_table
        self.region = region or settings.aws_region
        # Initialize DynamoDB resource using default profile from ~/.aws/credentials
        # (explicitly using profile_name to avoid env var credentials meant for Bedrock)
        session = boto3.Session(profile_name='default', region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)

    async def create_copy(self, record: CopyRecord) -> CopyRecord:
        """Store a single copy record."""
        self.table.put_item(Item=self._record_to_item(record))
        return record

    async def create_copies(self, records: List[CopyRecord]) -> List[CopyRecord]:
        """Batch store multiple copy records."""
        with self.table.batch_writer() as batch:
            for record in records:
                batch.put_item(Item=self._record_to_item(record))
        return records

    async def get_copy_by_id(self, copy_id: str, user_id: str = None) -> Optional[CopyRecord]:
        """Retrieve a copy by ID with optional user isolation."""
        response = self.table.get_item(Key={'copyId': copy_id})
        if 'Item' not in response:
            return None
        item = response['Item']
        if user_id is not None and item['userId'] != user_id:
            return None
        return self._item_to_record(item)

    async def copy_exists(self, copy_id: str) -> bool:
        """Check if a copy exists regardless of owner."""
        response = self.table.get_item(Key={'copyId': copy_id})
        return 'Item' in response

    async def list_copies_by_strategy(self, strategy_id: str) -> List[CopyRecord]:
        """List all copies for a strategy, sorted by createdAt descending."""
        response = self.table.query(
            IndexName='StrategyIdIndex',
            KeyConditionExpression=Key('strategyId').eq(strategy_id),
            ScanIndexForward=False
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def list_copies_by_user(self, user_id: str) -> List[CopyRecord]:
        """List all copies for a user, sorted by createdAt descending."""
        response = self.table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False
        )
        return [self._item_to_record(item) for item in response.get('Items', [])]

    async def update_copy(self, copy_id: str, text: str, hashtags: List[str]) -> CopyRecord:
        """Update copy text and hashtags, setting updatedAt."""
        now = datetime.now(UTC).isoformat()
        response = self.table.update_item(
            Key={'copyId': copy_id},
            UpdateExpression='SET #txt = :text, hashtags = :hashtags, updatedAt = :updated_at',
            ExpressionAttributeNames={'#txt': 'text'},
            ExpressionAttributeValues={
                ':text': text,
                ':hashtags': hashtags,
                ':updated_at': now
            },
            ReturnValues='ALL_NEW'
        )
        return self._item_to_record(response['Attributes'])

    async def delete_copy(self, copy_id: str) -> bool:
        """Delete a copy record. Returns True if deleted."""
        response = self.table.delete_item(
            Key={'copyId': copy_id},
            ReturnValues='ALL_OLD'
        )
        return 'Attributes' in response

    def _record_to_item(self, record: CopyRecord) -> dict:
        """Convert CopyRecord to DynamoDB item."""
        return {
            'copyId': record.id,
            'strategyId': record.strategy_id,
            'userId': record.user_id,
            'text': record.text,
            'platform': record.platform,
            'hashtags': record.hashtags,
            'createdAt': record.created_at.isoformat(),
            'updatedAt': record.updated_at.isoformat()
        }

    def _item_to_record(self, item: dict) -> CopyRecord:
        """Convert DynamoDB item to CopyRecord."""
        return CopyRecord(
            id=item['copyId'],
            strategy_id=item['strategyId'],
            user_id=item['userId'],
            text=item['text'],
            platform=item['platform'],
            hashtags=item.get('hashtags', []),
            created_at=datetime.fromisoformat(item['createdAt']),
            updated_at=datetime.fromisoformat(item['updatedAt'])
        )
