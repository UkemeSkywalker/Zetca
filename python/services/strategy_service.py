"""
Service layer for strategy generation and management.

This module provides business logic for generating and persisting social media strategies.
It orchestrates the Strands Agent and DynamoDB repository while ensuring proper error
handling and data consistency.
"""

from typing import List, Optional
from models.strategy import StrategyInput, StrategyOutput, StrategyRecord
from services.strategist_agent import StrategistAgent, StructuredOutputException
from repositories.strategy_repository import StrategyRepository


class StrategyService:
    """
    Business logic for strategy generation and management.
    
    This service coordinates between the Strands Agent (for generation) and the
    Strategy Repository (for persistence), ensuring that errors during generation
    do not result in incomplete database records.
    """
    
    def __init__(self, agent: StrategistAgent, repository: StrategyRepository):
        """
        Initialize the strategy service with dependencies.
        
        Args:
            agent: StrategistAgent instance for generating strategies
            repository: StrategyRepository instance for database operations
        """
        self.agent = agent
        self.repository = repository
    
    async def generate_and_store_strategy(
        self, 
        strategy_input: StrategyInput, 
        user_id: str
    ) -> StrategyRecord:
        """
        Generate a strategy using the Strands agent and store it in the database.
        
        This method ensures atomicity: if strategy generation fails, no database
        record is created. Only successful generations are persisted.
        
        Args:
            strategy_input: Brand information for strategy generation
            user_id: Authenticated user's ID from JWT token
            
        Returns:
            StrategyRecord: The complete strategy record with generated content
            
        Raises:
            StructuredOutputException: If agent fails to return structured output
            Exception: If agent generation fails for any reason
            
        Note:
            Errors during generation prevent database writes, ensuring no incomplete
            records are stored (Requirement 7.4).
        """
        # Step 1: Generate strategy using Strands agent
        # If this fails, no database record will be created
        strategy_output: StrategyOutput = await self.agent.generate_strategy(strategy_input)
        
        # Step 2: Create strategy record with generated output
        record = StrategyRecord(
            user_id=user_id,
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        # Step 3: Persist to database (only reached if generation succeeded)
        return await self.repository.create_strategy(record)
    
    async def get_user_strategies(self, user_id: str) -> List[StrategyRecord]:
        """
        Retrieve all strategies for a specific user.
        
        Results are automatically sorted by creation date in descending order
        (newest first) by the repository layer.
        
        Args:
            user_id: Authenticated user's ID from JWT token
            
        Returns:
            List[StrategyRecord]: All strategies belonging to the user,
                                 sorted by created_at descending
        """
        return await self.repository.list_strategies_by_user(user_id)
    
    async def get_strategy(
        self, 
        strategy_id: str, 
        user_id: str
    ) -> tuple[Optional[StrategyRecord], bool]:
        """
        Retrieve a specific strategy by ID with user isolation enforcement.
        
        This method ensures that users can only access their own strategies.
        Returns information about whether the strategy exists but belongs to another user.
        
        Args:
            strategy_id: The strategy ID to retrieve
            user_id: Authenticated user's ID from JWT token
            
        Returns:
            Tuple of (StrategyRecord or None, exists_for_other_user: bool)
            - (record, False) if strategy found and belongs to user
            - (None, True) if strategy exists but belongs to another user
            - (None, False) if strategy does not exist
            
        Note:
            User isolation is enforced at the repository level (Requirements 4.7, 5.2, 6.6).
        """
        # First check if strategy exists at all
        exists = await self.repository.strategy_exists(strategy_id)
        
        # Try to get strategy with user isolation
        strategy = await self.repository.get_strategy_by_id(strategy_id, user_id)
        
        # If exists but we got None, it belongs to another user
        if exists and strategy is None:
            return (None, True)
        
        # Either found (strategy is not None) or doesn't exist (strategy is None, exists is False)
        return (strategy, False)
