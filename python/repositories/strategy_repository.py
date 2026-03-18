"""
DynamoDB repository for strategy data access.

This module provides data access methods for storing and retrieving strategy records
from DynamoDB with user isolation enforcement.
"""

import boto3
from boto3.dynamodb.conditions import Key
from typing import Optional, List
from datetime import datetime
from models.strategy import StrategyRecord, StrategyOutput
from config import settings


class StrategyRepository:
    """Repository for strategy data access in DynamoDB.
    
    This class handles all database operations for strategy records, including
    creation, retrieval, and listing with proper user isolation.
    """
    
    def __init__(self, table_name: str = None, region: str = None):
        """Initialize the repository with DynamoDB connection.
        
        Args:
            table_name: DynamoDB table name (defaults to settings.dynamodb_strategies_table)
            region: AWS region (defaults to settings.aws_region)
        """
        self.table_name = table_name or settings.dynamodb_strategies_table
        self.region = region or settings.aws_region
        
        # Initialize DynamoDB resource using default profile from ~/.aws/credentials
        # (explicitly using profile_name to avoid env var credentials meant for Bedrock)
        session = boto3.Session(profile_name='default', region_name=self.region)
        dynamodb = session.resource('dynamodb')
        self.table = dynamodb.Table(self.table_name)
    
    async def create_strategy(self, record: StrategyRecord) -> StrategyRecord:
        """Store a new strategy record in DynamoDB.
        
        Args:
            record: StrategyRecord to store
            
        Returns:
            The stored StrategyRecord
        """
        # Convert StrategyRecord to DynamoDB item format
        item = {
            'strategyId': record.id,
            'userId': record.user_id,
            'brandName': record.brand_name,
            'industry': record.industry,
            'targetAudience': record.target_audience,
            'goals': record.goals,
            'strategyOutput': record.strategy_output.model_dump(),
            'createdAt': record.created_at.isoformat()
        }
        
        # Store in DynamoDB
        self.table.put_item(Item=item)
        
        return record
    
    async def get_strategy_by_id(
        self, 
        strategy_id: str, 
        user_id: str = None
    ) -> Optional[StrategyRecord]:
        """Retrieve a strategy by ID with optional user isolation enforcement.
        
        Args:
            strategy_id: The strategy ID to retrieve
            user_id: The authenticated user's ID (optional for existence check)
            
        Returns:
            StrategyRecord if found and belongs to user, None otherwise
        """
        # Get item from DynamoDB
        response = self.table.get_item(
            Key={'strategyId': strategy_id}
        )
        
        # Check if item exists
        if 'Item' not in response:
            return None
        
        item = response['Item']
        
        # Enforce user isolation if user_id is provided
        if user_id is not None and item['userId'] != user_id:
            return None
        
        # Convert DynamoDB item to StrategyRecord
        return self._item_to_record(item)
    
    async def strategy_exists(self, strategy_id: str) -> bool:
        """Check if a strategy exists regardless of owner.
        
        Args:
            strategy_id: The strategy ID to check
            
        Returns:
            True if strategy exists, False otherwise
        """
        response = self.table.get_item(
            Key={'strategyId': strategy_id}
        )
        return 'Item' in response
    
    async def list_strategies_by_user(self, user_id: str) -> List[StrategyRecord]:
        """List all strategies for a specific user, sorted by creation date descending.
        
        Args:
            user_id: The user ID to retrieve strategies for
            
        Returns:
            List of StrategyRecord objects sorted by created_at (newest first)
        """
        # Query using UserIdIndex GSI
        response = self.table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False  # Sort by createdAt descending (newest first)
        )
        
        # Convert all items to StrategyRecord objects
        return [self._item_to_record(item) for item in response.get('Items', [])]
    
    def _item_to_record(self, item: dict) -> StrategyRecord:
        """Convert DynamoDB item to StrategyRecord.
        
        Args:
            item: DynamoDB item dictionary
            
        Returns:
            StrategyRecord object
        """
        return StrategyRecord(
            id=item['strategyId'],
            user_id=item['userId'],
            brand_name=item['brandName'],
            industry=item['industry'],
            target_audience=item['targetAudience'],
            goals=item['goals'],
            strategy_output=StrategyOutput(**item['strategyOutput']),
            created_at=datetime.fromisoformat(item['createdAt'])
        )
