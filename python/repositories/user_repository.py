"""
DynamoDB repository for user data access (read-only).

This module provides read-only access to user records from the users DynamoDB table,
specifically for retrieving LinkedIn credentials needed by the publisher service.
User management (create, update, delete) remains in the Next.js service.
"""

import boto3
from typing import Optional
from config import settings


class UserRepository:
    """Read-only repository for accessing user records from the users DynamoDB table."""

    def __init__(self, table_name: str = None, region: str = None):
        self.table_name = table_name or settings.dynamodb_users_table
        self.region = region or settings.aws_region
        session = boto3.Session(profile_name='default', region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)

    async def get_user_linkedin_credentials(self, user_id: str) -> Optional[dict]:
        """
        Retrieve LinkedIn credentials for a user.

        Returns dict with keys: linkedinAccessToken, linkedinSub, linkedinName
        Returns None if user not found.
        """
        response = self.table.get_item(Key={'userId': user_id})
        if 'Item' not in response:
            return None
        item = response['Item']
        return {
            'linkedinAccessToken': item.get('linkedinAccessToken'),
            'linkedinSub': item.get('linkedinSub'),
            'linkedinName': item.get('linkedinName'),
        }
