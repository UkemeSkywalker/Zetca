"""
Property-based tests for error prevention during strategy generation.

This module tests Property 13: Errors Prevent Incomplete Storage
Validates Requirements 7.4
"""

import pytest
from hypothesis import given, settings, strategies as st
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from models.strategy import StrategyInput, StrategyOutput, StrategyRecord, PlatformRecommendation
from services.strategy_service import StrategyService
from services.strategist_agent import StrategistAgent, StructuredOutputException
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


def create_failing_agent(error_type: str):
    """Create a mock agent that fails with specified error type."""
    mock_agent = MagicMock(spec=StrategistAgent)
    
    async def mock_generate_strategy_fail(strategy_input: StrategyInput):
        """Mock strategy generation that always fails."""
        if error_type == "structured_output":
            raise StructuredOutputException("Agent did not return structured output")
        elif error_type == "timeout":
            raise TimeoutError("Agent execution timeout")
        elif error_type == "bedrock":
            raise Exception("Bedrock service error")
        elif error_type == "generic":
            raise Exception("Generic agent error")
        else:
            raise ValueError(f"Unknown error type: {error_type}")
    
    mock_agent.generate_strategy = mock_generate_strategy_fail
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


class TestErrorPreventionProperty:
    """
    Property-based tests for error prevention during strategy generation.
    
    **Validates: Requirement 7.4**
    """
    
    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        error_type=st.sampled_from([
            "structured_output",
            "timeout",
            "bedrock",
            "generic"
        ])
    )
    async def test_property_errors_prevent_incomplete_storage(
        self,
        user_id,
        strategy_input,
        error_type
    ):
        """
        **Property 13: Errors Prevent Incomplete Storage**
        
        For any strategy generation request that fails (due to agent error, timeout,
        or Bedrock failure), no Strategy_Record should be created in the database.
        
        This property ensures that:
        1. Agent errors do not result in database writes
        2. The database remains consistent even when generation fails
        3. Users do not see incomplete or invalid strategies
        4. Failed attempts do not pollute the database
        
        **Validates: Requirement 7.4**
        """
        # Create mock agent that will fail with specified error type
        mock_agent = create_failing_agent(error_type)
        
        # Create mock repository with in-memory storage
        mock_repository = create_mock_repository()
        
        # Create strategy service with mocked dependencies
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Verify database is empty before attempt
        strategies_before = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_before) == 0, "Database should be empty before generation attempt"
        
        # **Attempt to generate strategy (should fail)**
        with pytest.raises(Exception):
            await strategy_service.generate_and_store_strategy(
                strategy_input=strategy_input,
                user_id=str(user_id)
            )
        
        # **Verify no record was created in the database**
        strategies_after = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after) == 0, \
            f"Database should remain empty after {error_type} error, but found {len(strategies_after)} records"
        
        # **Verify the in-memory storage is truly empty**
        assert len(mock_repository._storage) == 0, \
            f"Repository storage should be empty after {error_type} error"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        num_failures=st.integers(min_value=1, max_value=5),
        strategy_inputs=st.lists(strategy_input_strategy(), min_size=1, max_size=5),
        error_types=st.lists(
            st.sampled_from(["structured_output", "timeout", "bedrock", "generic"]),
            min_size=1,
            max_size=5
        )
    )
    async def test_property_multiple_failures_no_storage(
        self,
        user_id,
        num_failures,
        strategy_inputs,
        error_types
    ):
        """
        **Property 13: Multiple Failures Do Not Create Any Records**
        
        For any sequence of failed strategy generation attempts, none of them
        should result in database records being created.
        
        This ensures that:
        1. Multiple failures do not accumulate incomplete records
        2. The database remains clean regardless of failure count
        3. Error handling is consistent across multiple attempts
        
        **Validates: Requirement 7.4**
        """
        # Ensure we have enough test data
        if len(strategy_inputs) < num_failures or len(error_types) < num_failures:
            return
        
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Attempt multiple failed generations
        for i in range(num_failures):
            # Create failing agent for this attempt
            mock_agent = create_failing_agent(error_types[i])
            
            # Create strategy service
            strategy_service = StrategyService(
                agent=mock_agent,
                repository=mock_repository
            )
            
            # Attempt generation (should fail)
            with pytest.raises(Exception):
                await strategy_service.generate_and_store_strategy(
                    strategy_input=strategy_inputs[i],
                    user_id=str(user_id)
                )
        
        # **Verify no records were created after all failures**
        strategies = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies) == 0, \
            f"Database should be empty after {num_failures} failures, but found {len(strategies)} records"
        
        assert len(mock_repository._storage) == 0, \
            f"Repository storage should be empty after {num_failures} failures"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        error_type=st.sampled_from(["structured_output", "timeout", "bedrock", "generic"])
    )
    async def test_property_failure_does_not_affect_existing_records(
        self,
        user_id,
        strategy_input,
        error_type
    ):
        """
        **Property 13: Failures Do Not Affect Existing Records**
        
        For any failed strategy generation attempt, existing strategy records
        in the database should remain unchanged and accessible.
        
        This ensures that:
        1. Failures do not corrupt existing data
        2. Existing strategies remain accessible after failures
        3. Database integrity is maintained across error conditions
        
        **Validates: Requirement 7.4**
        """
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Create a successful strategy first (manually insert)
        existing_record = StrategyRecord(
            user_id=str(user_id),
            brand_name="Existing Brand",
            industry="Tech",
            target_audience="Developers",
            goals="Growth",
            strategy_output=StrategyOutput(
                content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
                posting_schedule="Daily",
                platform_recommendations=[
                    PlatformRecommendation(
                        platform="LinkedIn",
                        rationale="Professional audience",
                        priority="high"
                    ),
                    PlatformRecommendation(
                        platform="Twitter",
                        rationale="Tech community",
                        priority="medium"
                    )
                ],
                content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
                engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
                visual_prompts=["Prompt 1", "Prompt 2"]
            )
        )
        
        await mock_repository.create_strategy(existing_record)
        
        # Verify existing record is in database
        strategies_before = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_before) == 1, "Should have one existing strategy"
        assert strategies_before[0].id == existing_record.id
        
        # Create failing agent
        mock_agent = create_failing_agent(error_type)
        
        # Create strategy service
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Attempt to generate new strategy (should fail)
        with pytest.raises(Exception):
            await strategy_service.generate_and_store_strategy(
                strategy_input=strategy_input,
                user_id=str(user_id)
            )
        
        # **Verify existing record is still there and unchanged**
        strategies_after = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after) == 1, \
            f"Should still have exactly one strategy after failure, but found {len(strategies_after)}"
        
        assert strategies_after[0].id == existing_record.id, \
            "Existing strategy ID should be unchanged"
        assert strategies_after[0].brand_name == existing_record.brand_name, \
            "Existing strategy brand_name should be unchanged"
        assert strategies_after[0].strategy_output.content_pillars == existing_record.strategy_output.content_pillars, \
            "Existing strategy content should be unchanged"
        
        # **Verify existing record is still retrievable by ID**
        retrieved = await mock_repository.get_strategy_by_id(
            strategy_id=existing_record.id,
            user_id=str(user_id)
        )
        assert retrieved is not None, "Existing strategy should still be retrievable"
        assert retrieved.id == existing_record.id, "Retrieved strategy should match existing record"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy()
    )
    async def test_property_partial_execution_no_storage(
        self,
        user_id,
        strategy_input
    ):
        """
        **Property 13: Partial Execution Does Not Create Records**
        
        Even if the agent begins execution but fails before completion,
        no partial or incomplete records should be stored in the database.
        
        This ensures that:
        1. Only complete, successful generations are persisted
        2. Partial results are not stored
        3. The service maintains atomicity (all-or-nothing)
        
        **Validates: Requirement 7.4**
        """
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Create agent that fails mid-execution
        mock_agent = MagicMock(spec=StrategistAgent)
        
        async def mock_generate_strategy_partial(strategy_input: StrategyInput):
            """Simulate partial execution before failure."""
            # Simulate some processing time
            import asyncio
            await asyncio.sleep(0.01)
            
            # Then fail
            raise Exception("Agent failed during execution")
        
        mock_agent.generate_strategy = mock_generate_strategy_partial
        
        # Create strategy service
        strategy_service = StrategyService(
            agent=mock_agent,
            repository=mock_repository
        )
        
        # Verify database is empty
        strategies_before = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_before) == 0
        
        # Attempt generation (should fail)
        with pytest.raises(Exception):
            await strategy_service.generate_and_store_strategy(
                strategy_input=strategy_input,
                user_id=str(user_id)
            )
        
        # **Verify no partial record was created**
        strategies_after = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after) == 0, \
            "No records should be created even after partial execution"
        
        assert len(mock_repository._storage) == 0, \
            "Repository storage should be empty after partial execution failure"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        error_type=st.sampled_from(["structured_output", "timeout", "bedrock", "generic"])
    )
    async def test_property_error_recovery_allows_subsequent_success(
        self,
        user_id,
        strategy_input,
        error_type
    ):
        """
        **Property 13: After Error, Subsequent Success Works Correctly**
        
        After a failed generation attempt that creates no records, a subsequent
        successful generation should work correctly and create a record.
        
        This ensures that:
        1. Failures do not leave the system in a broken state
        2. The service can recover from errors
        3. Subsequent operations work normally after failures
        
        **Validates: Requirement 7.4**
        """
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # First attempt: Create failing agent
        failing_agent = create_failing_agent(error_type)
        failing_service = StrategyService(
            agent=failing_agent,
            repository=mock_repository
        )
        
        # Attempt generation (should fail)
        with pytest.raises(Exception):
            await failing_service.generate_and_store_strategy(
                strategy_input=strategy_input,
                user_id=str(user_id)
            )
        
        # Verify no record was created
        strategies_after_failure = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after_failure) == 0, "No records should exist after failure"
        
        # Second attempt: Create successful agent
        successful_output = StrategyOutput(
            content_pillars=["Pillar 1", "Pillar 2", "Pillar 3"],
            posting_schedule="3 times per week",
            platform_recommendations=[
                PlatformRecommendation(
                    platform="Instagram",
                    rationale="Visual content",
                    priority="high"
                ),
                PlatformRecommendation(
                    platform="Facebook",
                    rationale="Broad reach",
                    priority="medium"
                )
            ],
            content_themes=["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
            engagement_tactics=["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4"],
            visual_prompts=["Visual prompt 1", "Visual prompt 2"]
        )
        
        successful_agent = MagicMock(spec=StrategistAgent)
        
        async def mock_generate_strategy_success(strategy_input: StrategyInput):
            return successful_output
        
        successful_agent.generate_strategy = mock_generate_strategy_success
        
        successful_service = StrategyService(
            agent=successful_agent,
            repository=mock_repository
        )
        
        # **Attempt successful generation**
        stored_record = await successful_service.generate_and_store_strategy(
            strategy_input=strategy_input,
            user_id=str(user_id)
        )
        
        # **Verify the successful record was created**
        assert stored_record is not None, "Successful generation should return a record"
        
        strategies_after_success = await mock_repository.list_strategies_by_user(str(user_id))
        assert len(strategies_after_success) == 1, \
            "Exactly one record should exist after successful generation following failure"
        
        assert strategies_after_success[0].id == stored_record.id, \
            "The stored record should be retrievable"
        assert strategies_after_success[0].brand_name == strategy_input.brand_name, \
            "The stored record should have correct data"
