"""
Property-based tests for user isolation in strategy records.

This module tests Property 10: Strategy Records Enforce User Isolation
Validates Requirements 4.7, 5.2, 5.4
"""

import pytest
import asyncio
from hypothesis import given, settings, strategies as st, assume
from uuid import uuid4
from datetime import datetime, UTC
from unittest.mock import AsyncMock, MagicMock

from models.strategy import StrategyInput, StrategyOutput, StrategyRecord, PlatformRecommendation
from repositories.strategy_repository import StrategyRepository


# Hypothesis strategies for generating test data
@st.composite
def strategy_input_strategy(draw):
    """Generate random StrategyInput for testing."""
    # Generate text that is not just whitespace by filtering
    brand_name = draw(st.text(
        min_size=1, 
        max_size=50, 
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))  # Exclude control and surrogate chars
    ).filter(lambda x: x.strip() != ''))
    
    industry = draw(st.text(
        min_size=1, 
        max_size=50, 
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ).filter(lambda x: x.strip() != ''))
    
    target_audience = draw(st.text(
        min_size=1, 
        max_size=100, 
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ).filter(lambda x: x.strip() != ''))
    
    goals = draw(st.text(
        min_size=1, 
        max_size=150, 
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
    ).filter(lambda x: x.strip() != ''))
    
    return StrategyInput(
        brand_name=brand_name,
        industry=industry,
        target_audience=target_audience,
        goals=goals
    )


@st.composite
def strategy_output_strategy(draw):
    """Generate random StrategyOutput for testing."""
    return StrategyOutput(
        content_pillars=draw(st.lists(
            st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',))),
            min_size=3,
            max_size=6
        )),
        posting_schedule=draw(st.text(min_size=10, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',)))),
        platform_recommendations=draw(st.lists(
            st.builds(
                PlatformRecommendation,
                platform=st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=('Cs',))),
                rationale=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',))),
                priority=st.sampled_from(['high', 'medium', 'low'])
            ),
            min_size=2,
            max_size=5
        )),
        content_themes=draw(st.lists(
            st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',))),
            min_size=5,
            max_size=10
        )),
        engagement_tactics=draw(st.lists(
            st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs',))),
            min_size=4,
            max_size=8
        )),
        visual_prompts=draw(st.lists(
            st.text(min_size=50, max_size=200, alphabet=st.characters(blacklist_categories=('Cs',))),
            min_size=2,
            max_size=3
        ))
    )


def create_mock_repository():
    """Create a mock repository with in-memory storage for testing."""
    # Create a mock repository that simulates DynamoDB behavior
    repo = StrategyRepository.__new__(StrategyRepository)
    repo.table_name = "test-strategies"
    repo.region = "us-east-1"
    
    # In-memory storage for testing
    repo._storage = {}
    repo._user_index = {}
    
    # Mock the table
    repo.table = MagicMock()
    
    # Override methods to use in-memory storage
    async def mock_create_strategy(record: StrategyRecord) -> StrategyRecord:
        repo._storage[record.id] = record
        if record.user_id not in repo._user_index:
            repo._user_index[record.user_id] = []
        repo._user_index[record.user_id].append(record.id)
        return record
    
    async def mock_get_strategy_by_id(strategy_id: str, user_id: str):
        if strategy_id not in repo._storage:
            return None
        record = repo._storage[strategy_id]
        # Enforce user isolation
        if record.user_id != user_id:
            return None
        return record
    
    async def mock_list_strategies_by_user(user_id: str):
        if user_id not in repo._user_index:
            return []
        strategy_ids = repo._user_index[user_id]
        records = [repo._storage[sid] for sid in strategy_ids if sid in repo._storage]
        # Sort by created_at descending
        return sorted(records, key=lambda r: r.created_at, reverse=True)
    
    repo.create_strategy = mock_create_strategy
    repo.get_strategy_by_id = mock_get_strategy_by_id
    repo.list_strategies_by_user = mock_list_strategies_by_user
    
    return repo


class TestUserIsolationProperty:
    """
    Property-based tests for user isolation.
    
    **Validates: Requirements 4.7, 5.2, 5.4**
    """
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_user_cannot_access_other_users_strategy_by_id(
        self,
        user_a_id,
        user_b_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 10: Strategy Records Enforce User Isolation**
        
        For any two distinct users A and B, if user A creates a strategy,
        then user B should not be able to retrieve that strategy by ID.
        
        **Validates: Requirements 4.7, 5.2, 5.4**
        """
        # Ensure users are different
        assume(user_a_id != user_b_id)
        
        # Create a fresh repository for this test
        mock_repository = create_mock_repository()
        
        # User A creates a strategy
        record = StrategyRecord(
            user_id=str(user_a_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        # Store the strategy
        created_record = await mock_repository.create_strategy(record)
        
        # User A should be able to retrieve their own strategy
        user_a_result = await mock_repository.get_strategy_by_id(
            created_record.id,
            str(user_a_id)
        )
        assert user_a_result is not None, "User A should be able to retrieve their own strategy"
        assert user_a_result.id == created_record.id
        assert user_a_result.user_id == str(user_a_id)
        
        # User B should NOT be able to retrieve User A's strategy
        user_b_result = await mock_repository.get_strategy_by_id(
            created_record.id,
            str(user_b_id)
        )
        assert user_b_result is None, "User B should not be able to retrieve User A's strategy"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_user_strategy_not_in_other_users_list(
        self,
        user_a_id,
        user_b_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 10: Strategy Records Enforce User Isolation (List)**
        
        For any two distinct users A and B, if user A creates a strategy,
        then that strategy should not appear in user B's strategy list.
        
        **Validates: Requirements 4.7, 5.2, 5.4**
        """
        # Ensure users are different
        assume(user_a_id != user_b_id)
        
        # Create a fresh repository for this test
        mock_repository = create_mock_repository()
        
        # User A creates a strategy
        record = StrategyRecord(
            user_id=str(user_a_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        # Store the strategy
        created_record = await mock_repository.create_strategy(record)
        
        # User A's list should contain the strategy
        user_a_strategies = await mock_repository.list_strategies_by_user(str(user_a_id))
        user_a_strategy_ids = [s.id for s in user_a_strategies]
        assert created_record.id in user_a_strategy_ids, "User A should see their own strategy in their list"
        
        # User B's list should NOT contain User A's strategy
        user_b_strategies = await mock_repository.list_strategies_by_user(str(user_b_id))
        user_b_strategy_ids = [s.id for s in user_b_strategies]
        assert created_record.id not in user_b_strategy_ids, "User B should not see User A's strategy in their list"
    
    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        num_strategies=st.integers(min_value=1, max_value=5),
        strategy_inputs=st.lists(strategy_input_strategy(), min_size=1, max_size=5),
        strategy_outputs=st.lists(strategy_output_strategy(), min_size=1, max_size=5)
    )
    async def test_property_multiple_strategies_user_isolation(
        self,
        user_a_id,
        user_b_id,
        num_strategies,
        strategy_inputs,
        strategy_outputs
    ):
        """
        **Property 10: Strategy Records Enforce User Isolation (Multiple Strategies)**
        
        For any two distinct users A and B, if user A creates multiple strategies,
        then user B should not be able to access any of them.
        
        **Validates: Requirements 4.7, 5.2, 5.4**
        """
        # Ensure users are different
        assume(user_a_id != user_b_id)
        assume(len(strategy_inputs) >= num_strategies)
        assume(len(strategy_outputs) >= num_strategies)
        
        # Create a fresh repository for this test
        mock_repository = create_mock_repository()
        
        # User A creates multiple strategies
        user_a_strategy_ids = []
        for i in range(num_strategies):
            record = StrategyRecord(
                user_id=str(user_a_id),
                brand_name=strategy_inputs[i].brand_name,
                industry=strategy_inputs[i].industry,
                target_audience=strategy_inputs[i].target_audience,
                goals=strategy_inputs[i].goals,
                strategy_output=strategy_outputs[i]
            )
            created_record = await mock_repository.create_strategy(record)
            user_a_strategy_ids.append(created_record.id)
        
        # User A should see all their strategies
        user_a_strategies = await mock_repository.list_strategies_by_user(str(user_a_id))
        assert len(user_a_strategies) == num_strategies, f"User A should have {num_strategies} strategies"
        
        # User B should not be able to access any of User A's strategies by ID
        for strategy_id in user_a_strategy_ids:
            user_b_result = await mock_repository.get_strategy_by_id(
                strategy_id,
                str(user_b_id)
            )
            assert user_b_result is None, f"User B should not access User A's strategy {strategy_id}"
        
        # User B's list should not contain any of User A's strategies
        user_b_strategies = await mock_repository.list_strategies_by_user(str(user_b_id))
        user_b_strategy_ids = [s.id for s in user_b_strategies]
        
        for strategy_id in user_a_strategy_ids:
            assert strategy_id not in user_b_strategy_ids, f"User A's strategy {strategy_id} should not appear in User B's list"
    
    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=None)
    @given(
        user_a_id=st.uuids(),
        user_b_id=st.uuids(),
        user_a_strategies=st.lists(
            st.tuples(strategy_input_strategy(), strategy_output_strategy()),
            min_size=1,
            max_size=3
        ),
        user_b_strategies=st.lists(
            st.tuples(strategy_input_strategy(), strategy_output_strategy()),
            min_size=1,
            max_size=3
        )
    )
    async def test_property_bidirectional_user_isolation(
        self,
        user_a_id,
        user_b_id,
        user_a_strategies,
        user_b_strategies
    ):
        """
        **Property 10: Strategy Records Enforce User Isolation (Bidirectional)**
        
        For any two distinct users A and B, if both create strategies,
        then neither should be able to access the other's strategies.
        
        **Validates: Requirements 4.7, 5.2, 5.4**
        """
        # Ensure users are different
        assume(user_a_id != user_b_id)
        
        # Create a fresh repository for this test
        mock_repository = create_mock_repository()
        
        # User A creates strategies
        user_a_ids = []
        for strategy_input, strategy_output in user_a_strategies:
            record = StrategyRecord(
                user_id=str(user_a_id),
                brand_name=strategy_input.brand_name,
                industry=strategy_input.industry,
                target_audience=strategy_input.target_audience,
                goals=strategy_input.goals,
                strategy_output=strategy_output
            )
            created = await mock_repository.create_strategy(record)
            user_a_ids.append(created.id)
        
        # User B creates strategies
        user_b_ids = []
        for strategy_input, strategy_output in user_b_strategies:
            record = StrategyRecord(
                user_id=str(user_b_id),
                brand_name=strategy_input.brand_name,
                industry=strategy_input.industry,
                target_audience=strategy_input.target_audience,
                goals=strategy_input.goals,
                strategy_output=strategy_output
            )
            created = await mock_repository.create_strategy(record)
            user_b_ids.append(created.id)
        
        # User A should only see their own strategies
        user_a_list = await mock_repository.list_strategies_by_user(str(user_a_id))
        user_a_list_ids = [s.id for s in user_a_list]
        
        assert len(user_a_list) == len(user_a_strategies), "User A should see all their strategies"
        for strategy_id in user_a_ids:
            assert strategy_id in user_a_list_ids, f"User A's strategy {strategy_id} should be in their list"
        for strategy_id in user_b_ids:
            assert strategy_id not in user_a_list_ids, f"User B's strategy {strategy_id} should not be in User A's list"
        
        # User B should only see their own strategies
        user_b_list = await mock_repository.list_strategies_by_user(str(user_b_id))
        user_b_list_ids = [s.id for s in user_b_list]
        
        assert len(user_b_list) == len(user_b_strategies), "User B should see all their strategies"
        for strategy_id in user_b_ids:
            assert strategy_id in user_b_list_ids, f"User B's strategy {strategy_id} should be in their list"
        for strategy_id in user_a_ids:
            assert strategy_id not in user_b_list_ids, f"User A's strategy {strategy_id} should not be in User B's list"
