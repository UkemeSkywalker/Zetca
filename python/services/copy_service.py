"""
Service layer for copy generation, retrieval, and chat refinement.

This module provides business logic for generating social media copies from strategies,
managing copy records, and handling conversational refinement. It coordinates between
the Copywriter Agent, Copy Repository, and Strategy Repository while ensuring proper
error handling, user isolation, and data integrity.
"""

import logging
from typing import List, Optional
from fastapi import HTTPException, status

from models.copy import CopyItem, CopyOutput, CopyRecord, ChatResponse
from repositories.copy_repository import CopyRepository
from repositories.strategy_repository import StrategyRepository

logger = logging.getLogger(__name__)


class CopyService:
    """
    Business logic for copy generation, retrieval, and chat refinement.

    Coordinates between the Copywriter Agent (for generation/refinement),
    Copy Repository (for persistence), and Strategy Repository (for context).
    Ensures that errors during agent calls do not result in incomplete or
    corrupted database records.
    """

    def __init__(self, agent, copy_repository: CopyRepository, strategy_repository: StrategyRepository):
        self.agent = agent
        self.copy_repository = copy_repository
        self.strategy_repository = strategy_repository

    async def _get_strategy_with_ownership(self, strategy_id: str, user_id: str):
        """Fetch a strategy and verify ownership. Raises 404/403 on failure."""
        exists = await self.strategy_repository.strategy_exists(strategy_id)
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found",
            )

        strategy = await self.strategy_repository.get_strategy_by_id(strategy_id, user_id)
        if strategy is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )
        return strategy

    async def generate_copies(self, strategy_id: str, user_id: str) -> List[CopyRecord]:
        """
        Generate copies from a strategy using the Copywriter Agent.

        1. Fetch strategy (verify ownership → 404/403)
        2. Call agent.generate_copies() with strategy data
        3. Store each CopyItem as a CopyRecord in the database

        If the agent fails, no copies are stored (error integrity).

        Args:
            strategy_id: ID of the strategy to generate copies from
            user_id: Authenticated user's ID from JWT

        Returns:
            List of stored CopyRecord objects

        Raises:
            HTTPException: 404 if strategy not found, 403 if not owner
        """
        strategy = await self._get_strategy_with_ownership(strategy_id, user_id)

        # Build strategy data dict for the agent
        strategy_data = {
            "brand_name": strategy.brand_name,
            "industry": strategy.industry,
            "target_audience": strategy.target_audience,
            "goals": strategy.goals,
        }
        if strategy.strategy_output:
            strategy_data.update(strategy.strategy_output.model_dump())

        # Call agent — if this raises, no copies are written
        copy_output: CopyOutput = await self.agent.generate_copies(strategy_data)

        # Convert CopyItems to CopyRecords
        records = [
            CopyRecord(
                strategy_id=strategy_id,
                user_id=user_id,
                text=item.text,
                platform=item.platform,
                hashtags=item.hashtags,
            )
            for item in copy_output.copies
        ]

        # Persist all at once
        return await self.copy_repository.create_copies(records)

    async def get_copies_by_strategy(self, strategy_id: str, user_id: str) -> List[CopyRecord]:
        """
        Retrieve all copies for a strategy after verifying ownership.

        Args:
            strategy_id: Strategy to list copies for
            user_id: Authenticated user's ID

        Returns:
            List of CopyRecord sorted by createdAt descending, or empty list

        Raises:
            HTTPException: 404 if strategy not found, 403 if not owner
        """
        await self._get_strategy_with_ownership(strategy_id, user_id)
        return await self.copy_repository.list_copies_by_strategy(strategy_id)

    async def get_copy(self, copy_id: str, user_id: str) -> tuple[Optional[CopyRecord], bool]:
        """
        Retrieve a single copy with user isolation.

        Returns:
            (record, False)  — found and owned by user
            (None, True)     — exists but belongs to another user
            (None, False)    — does not exist
        """
        exists = await self.copy_repository.copy_exists(copy_id)
        if not exists:
            return (None, False)

        record = await self.copy_repository.get_copy_by_id(copy_id, user_id)
        if record is None:
            return (None, True)

        return (record, False)

    async def chat_refine_copy(
        self, copy_id: str, message: str, user_id: str
    ) -> tuple[ChatResponse, CopyRecord]:
        """
        Refine a copy via conversational chat with the AI.

        1. Fetch copy (verify ownership → 404/403)
        2. Fetch associated strategy for brand context
        3. Call agent.chat_refine()
        4. Update copy in DB with new text/hashtags/updatedAt

        If the agent fails, the existing copy remains unchanged.

        Args:
            copy_id: ID of the copy to refine
            message: User's refinement request
            user_id: Authenticated user's ID

        Returns:
            Tuple of (ChatResponse, updated CopyRecord)

        Raises:
            HTTPException: 404 if copy/strategy not found, 403 if not owner
        """
        # Fetch copy with ownership check
        record, belongs_to_other = await self.get_copy(copy_id, user_id)
        if belongs_to_other:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource",
            )
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Copy not found",
            )

        # Fetch strategy for brand context
        strategy = await self.strategy_repository.get_strategy_by_id(record.strategy_id)
        strategy_data = {}
        if strategy:
            strategy_data = {
                "brand_name": strategy.brand_name,
                "industry": strategy.industry,
                "target_audience": strategy.target_audience,
                "goals": strategy.goals,
            }
            if strategy.strategy_output:
                strategy_data.update(strategy.strategy_output.model_dump())

        # Call agent — if this raises, copy stays unchanged
        chat_response: ChatResponse = await self.agent.chat_refine(
            copy_text=record.text,
            platform=record.platform,
            hashtags=record.hashtags,
            strategy_data=strategy_data,
            user_message=message,
        )

        # Update copy in DB
        updated_record = await self.copy_repository.update_copy(
            copy_id=copy_id,
            text=chat_response.updated_text,
            hashtags=chat_response.updated_hashtags,
        )

        return (chat_response, updated_record)

    async def delete_copy(self, copy_id: str, user_id: str) -> tuple[bool, bool]:
        """
        Delete a copy with user isolation.

        Returns:
            (True, False)  — deleted successfully
            (False, True)  — exists but belongs to another user
            (False, False) — does not exist
        """
        record, belongs_to_other = await self.get_copy(copy_id, user_id)
        if belongs_to_other:
            return (False, True)
        if record is None:
            return (False, False)

        await self.copy_repository.delete_copy(copy_id)
        return (True, False)
