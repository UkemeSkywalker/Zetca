"""
Property-based tests for strategy persistence.

This module tests Property 8: Generated Strategies Are Persisted
Validates Requirements 4.1
"""

import pytest
from hypothesis import given, settings, strategies as st
from uuid import uuid4
from datetime import datetime, UTC
from unittest.mock import MagicMock, AsyncMock

from models.strategy import StrategyInput, StrategyOutput, StrategyRecord, PlatformRecommendation
from services.strategy_service import StrategyService
from services.strategist_agent import StrategistAgent
from repositories.strategy_repository import StrategyRepository


# Hypothesis strategies for generating test data
@st.composite
def strategy_input_strategy(draw):
    """Generate random StrategyInput for testing."""
    brand_name = draw(st.text(
        min_size=1, 
        max_size=50, 
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))
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


def create_mock_agent(strategy_output: StrategyOutput):
    """Create a mock agent that returns a predefined strategy output."""
    mock_agent = MagicMock(spec=StrategistAgent)
    
    async def mock_generate_strategy(strategy_input: StrategyInput) -> StrategyOutput:
        """Mock strategy generation that returns the predefined output."""
        return strategy_output
    
    mock_agent.generate_strategy = mock_generate_strategy
    return mock_agent


def create_mock_repository():
    """Create a mock repository with in-memory storage for testing."""
    repo = StrategyRepository.__new__(StrategyRepository)
    repo.table_name = "test-strategies"
    repo.region = "us-east-1"
    
    # In-memory storage for testing
    repo._storage = {}
    
    # Mock the table
    repo.table = MagicMock()
    
    # Override methods to use in-memory storage
    async def mock_create_strategy(record: StrategyRecord) -> StrategyRecord:
        repo._storage[record.id] = record
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
        records = [r for r in repo._storage.values() if r.user_id == user_id]
        return sorted(records, key=lambda r: r.created_at, reverse=True)
    
    repo.create_strategy = mock_create_strategy
    repo.get_strategy_by_id = mock_get_strategy_by_id
    repo.list_strategies_by_user = mock_list_strategies_by_user
    
    return repo


class TestPersistenceProperty:
    """
    Property-based tests for strategy persistence.
    
    **Validates: Requirement 4.1**
    """
    
    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_generated_strategies_are_persisted(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 8: Generated Strategies Are Persisted**
        
        For any successfully generated strategy, querying the database immediately
        after generation should return a Strategy_Record with matching content.
        
        This property ensures that:
        1. The strategy is stored in the database after generation
        2. The stored record contains all the generated content
        3. The stored record can be retrieved by ID
        4. The retrieved content matches the generated content exactly
        
        **Validates: Requirement 4.1**
        """
        # Create mock agent that returns the predefined strategy output
        mock_agent = create_mock_agent(strategy_output)
        
        # Create mock repository with in-memory storage
        mock_repository = create_mock_repository()
        
        # Create strategy service with mocked dependencies
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Generate and store strategy
        stored_record = await strategy_service.generate_and_store_strategy(
            strategy_input=strategy_input,
            user_id=str(user_id)
        )
        
        # **Verify the strategy was persisted**
        assert stored_record is not None, "Strategy service should return a stored record"
        assert stored_record.id is not None, "Stored record should have an ID"
        
        # **Verify the strategy can be retrieved from the database**
        retrieved_record = await mock_repository.get_strategy_by_id(
            strategy_id=stored_record.id,
            user_id=str(user_id)
        )
        
        assert retrieved_record is not None, \
            "Strategy should be retrievable from database immediately after generation"
        
        # **Verify the retrieved record matches the stored record**
        assert retrieved_record.id == stored_record.id, \
            "Retrieved record ID should match stored record ID"
        assert retrieved_record.user_id == stored_record.user_id, \
            "Retrieved record user_id should match stored record user_id"
        
        # **Verify input fields are persisted correctly**
        assert retrieved_record.brand_name == strategy_input.brand_name, \
            "Retrieved brand_name should match input"
        assert retrieved_record.industry == strategy_input.industry, \
            "Retrieved industry should match input"
        assert retrieved_record.target_audience == strategy_input.target_audience, \
            "Retrieved target_audience should match input"
        assert retrieved_record.goals == strategy_input.goals, \
            "Retrieved goals should match input"
        
        # **Verify generated output is persisted correctly**
        assert retrieved_record.strategy_output is not None, \
            "Retrieved record should have strategy_output"
        
        output = retrieved_record.strategy_output
        
        assert output.content_pillars == strategy_output.content_pillars, \
            "Retrieved content_pillars should match generated output"
        assert output.posting_schedule == strategy_output.posting_schedule, \
            "Retrieved posting_schedule should match generated output"
        assert output.platform_recommendations == strategy_output.platform_recommendations, \
            "Retrieved platform_recommendations should match generated output"
        assert output.content_themes == strategy_output.content_themes, \
            "Retrieved content_themes should match generated output"
        assert output.engagement_tactics == strategy_output.engagement_tactics, \
            "Retrieved engagement_tactics should match generated output"
        assert output.visual_prompts == strategy_output.visual_prompts, \
            "Retrieved visual_prompts should match generated output"
        
        # **Verify timestamp is persisted**
        assert retrieved_record.created_at is not None, \
            "Retrieved record should have created_at timestamp"
        assert isinstance(retrieved_record.created_at, datetime), \
            "created_at should be a datetime object"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        num_strategies=st.integers(min_value=2, max_value=5),
        strategy_inputs=st.lists(strategy_input_strategy(), min_size=2, max_size=5),
        strategy_outputs=st.lists(strategy_output_strategy(), min_size=2, max_size=5)
    )
    async def test_property_multiple_strategies_all_persisted(
        self,
        user_id,
        num_strategies,
        strategy_inputs,
        strategy_outputs
    ):
        """
        **Property 8: Multiple Generated Strategies Are All Persisted**
        
        For any sequence of strategy generations, all successfully generated
        strategies should be persisted and retrievable from the database.
        
        This ensures that:
        1. Multiple strategies can be generated and stored
        2. Each strategy is persisted independently
        3. All strategies remain accessible after multiple generations
        4. No strategies are lost or overwritten
        
        **Validates: Requirement 4.1**
        """
        # Ensure we have enough test data
        if len(strategy_inputs) < num_strategies or len(strategy_outputs) < num_strategies:
            return
        
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Generate and store multiple strategies
        stored_ids = []
        for i in range(num_strategies):
            # Create mock agent for this specific output
            mock_agent = create_mock_agent(strategy_outputs[i])
            
            # Create strategy service
            strategy_service = StrategyService(
                agent=mock_agent,
                repository=mock_repository
            )
            
            # Generate and store strategy
            stored_record = await strategy_service.generate_and_store_strategy(
                strategy_input=strategy_inputs[i],
                user_id=str(user_id)
            )
            
            stored_ids.append(stored_record.id)
        
        # **Verify all strategies were persisted**
        assert len(stored_ids) == num_strategies, \
            f"Should have stored {num_strategies} strategies"
        
        # **Verify all strategies are retrievable**
        for i, strategy_id in enumerate(stored_ids):
            retrieved_record = await mock_repository.get_strategy_by_id(
                strategy_id=strategy_id,
                user_id=str(user_id)
            )
            
            assert retrieved_record is not None, \
                f"Strategy {i} should be retrievable from database"
            assert retrieved_record.id == strategy_id, \
                f"Retrieved strategy {i} should have correct ID"
            assert retrieved_record.brand_name == strategy_inputs[i].brand_name, \
                f"Strategy {i} should have correct brand_name"
            assert retrieved_record.strategy_output.content_pillars == strategy_outputs[i].content_pillars, \
                f"Strategy {i} should have correct content_pillars"
        
        # **Verify all strategies appear in user's list**
        user_strategies = await mock_repository.list_strategies_by_user(str(user_id))
        user_strategy_ids = [s.id for s in user_strategies]
        
        assert len(user_strategies) == num_strategies, \
            f"User should have {num_strategies} strategies in their list"
        
        for strategy_id in stored_ids:
            assert strategy_id in user_strategy_ids, \
                f"Strategy {strategy_id} should appear in user's strategy list"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_persistence_preserves_data_integrity(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 8: Persistence Preserves Data Integrity**
        
        For any generated strategy, the persisted data should exactly match
        the generated data without any loss, corruption, or modification.
        
        This ensures that:
        1. No data is lost during persistence
        2. No data is modified during persistence
        3. Complex nested structures are preserved correctly
        4. All field types are preserved correctly
        
        **Validates: Requirement 4.1**
        """
        # Create mock agent and repository
        mock_agent = create_mock_agent(strategy_output)
        mock_repository = create_mock_repository()
        
        # Create strategy service
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Generate and store strategy
        stored_record = await strategy_service.generate_and_store_strategy(
            strategy_input=strategy_input,
            user_id=str(user_id)
        )
        
        # Retrieve the strategy
        retrieved_record = await mock_repository.get_strategy_by_id(
            strategy_id=stored_record.id,
            user_id=str(user_id)
        )
        
        # **Verify exact data preservation for all fields**
        
        # Input fields
        assert retrieved_record.brand_name == strategy_input.brand_name
        assert retrieved_record.industry == strategy_input.industry
        assert retrieved_record.target_audience == strategy_input.target_audience
        assert retrieved_record.goals == strategy_input.goals
        
        # Output fields - verify exact equality
        output = retrieved_record.strategy_output
        
        # Lists should have same length and content
        assert len(output.content_pillars) == len(strategy_output.content_pillars)
        assert output.content_pillars == strategy_output.content_pillars
        
        assert len(output.platform_recommendations) == len(strategy_output.platform_recommendations)
        for i, rec in enumerate(output.platform_recommendations):
            expected = strategy_output.platform_recommendations[i]
            assert rec.platform == expected.platform
            assert rec.rationale == expected.rationale
            assert rec.priority == expected.priority
        
        assert len(output.content_themes) == len(strategy_output.content_themes)
        assert output.content_themes == strategy_output.content_themes
        
        assert len(output.engagement_tactics) == len(strategy_output.engagement_tactics)
        assert output.engagement_tactics == strategy_output.engagement_tactics
        
        assert len(output.visual_prompts) == len(strategy_output.visual_prompts)
        assert output.visual_prompts == strategy_output.visual_prompts
        
        # String fields should be identical
        assert output.posting_schedule == strategy_output.posting_schedule
        
        # Verify no truncation occurred
        assert len(output.posting_schedule) == len(strategy_output.posting_schedule)
        
        # Verify metadata fields
        assert retrieved_record.user_id == str(user_id)
        assert retrieved_record.id is not None and len(retrieved_record.id) > 0
        assert retrieved_record.created_at is not None
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_persistence_is_immediate(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 8: Persistence Is Immediate**
        
        For any generated strategy, the strategy should be immediately available
        in the database after the generate_and_store_strategy call completes.
        There should be no delay or eventual consistency issues.
        
        **Validates: Requirement 4.1**
        """
        # Create mock agent and repository
        mock_agent = create_mock_agent(strategy_output)
        mock_repository = create_mock_repository()
        
        # Create strategy service
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Verify database is empty before generation
        strategies_before = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_before) == 0, "Database should be empty before generation"
        
        # Generate and store strategy
        stored_record = await strategy_service.generate_and_store_strategy(
            strategy_input=strategy_input,
            user_id=str(user_id)
        )
        
        # **Verify strategy is immediately available by ID**
        retrieved_by_id = await mock_repository.get_strategy_by_id(
            strategy_id=stored_record.id,
            user_id=str(user_id)
        )
        assert retrieved_by_id is not None, \
            "Strategy should be immediately retrievable by ID after generation"
        
        # **Verify strategy is immediately available in user's list**
        strategies_after = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after) == 1, \
            "User's strategy list should immediately contain the new strategy"
        assert strategies_after[0].id == stored_record.id, \
            "The strategy in the list should be the one just generated"
        
        # **Verify the content is immediately correct**
        assert strategies_after[0].brand_name == strategy_input.brand_name
        assert strategies_after[0].strategy_output.content_pillars == strategy_output.content_pillars
