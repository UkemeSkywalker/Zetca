"""
DynamoDB repository for media data access (read-only).

This module provides read-only access to media records from the post-media DynamoDB table,
used by the publisher service to retrieve S3 keys and content types for image posts.
"""

import boto3
from typing import Optional
from config import settings


class MediaRepository:
    """Read-only repository for accessing media records from the post-media DynamoDB table."""

    def __init__(self, table_name: str = None, region: str = None):
        self.table_name = table_name or settings.dynamodb_media_table
        self.region = region or settings.aws_region
        session = boto3.Session(profile_name='default', region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)

    async def get_media_by_id(self, media_id: str) -> Optional[dict]:
        """
        Retrieve media record by ID.

        Returns dict with s3Key, contentType, mediaType, etc.
        Returns None if not found.
        """
        response = self.table.get_item(Key={'mediaId': media_id})
        if 'Item' not in response:
            return None
        return response['Item']
