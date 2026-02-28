"""
Property-based tests for strategy record completeness.

This module tests Property 9: Strategy Records Are Complete
Validates Requirements 4.2, 4.3, 4.4, 4.5, 4.6
"""

import pytest
from hypothesis import given, settings, strategies as st
from uuid import uuid4, UUID
from datetime import datetime, UTC
from unittest.mock import MagicMock

from models.strategy import StrategyInput, StrategyOutput, StrategyRecord, PlatformRecommendation
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


def create_mock_repository():
    """Create a mock repository with in-memory storage for testing."""
    repo = StrategyRepository.__new__(StrategyRepository)
    repo.table_name = "test-strategies"
    repo.region = "us-east-1"
    
    # In-memory storage for testing
    repo._storage = {}
    
    # Mock the table
    repo.table = MagicMock()
    
    # Override create_strategy to use in-memory storage
    async def mock_create_strategy(record: StrategyRecord) -> StrategyRecord:
        repo._storage[record.id] = record
        return record
    
    async def mock_get_strategy_by_id(strategy_id: str, user_id: str):
        if strategy_id not in repo._storage:
            return None
        record = repo._storage[strategy_id]
        if record.user_id != user_id:
            return None
        return record
    
    repo.create_strategy = mock_create_strategy
    repo.get_strategy_by_id = mock_get_strategy_by_id
    
    return repo


class TestRecordCompletenessProperty:
    """
    Property-based tests for strategy record completeness.
    
    **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
    """
    
    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_strategy_record_has_all_required_fields(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 9: Strategy Records Are Complete**
        
        For any Strategy_Record stored in the database, it should contain all required fields:
        - id (non-empty string)
        - user_id (non-empty string)
        - brand_name (from input)
        - industry (from input)
        - target_audience (from input)
        - goals (from input)
        - strategy_output (complete StrategyOutput)
        - created_at (valid datetime)
        
        **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
        """
        # Create a strategy record
        record = StrategyRecord(
            user_id=str(user_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        # Create mock repository and store the record
        mock_repository = create_mock_repository()
        stored_record = await mock_repository.create_strategy(record)
        
        # Retrieve the record from storage
        retrieved_record = await mock_repository.get_strategy_by_id(
            stored_record.id,
            str(user_id)
        )
        
        # Verify the record was stored and retrieved
        assert retrieved_record is not None, "Record should be retrievable after storage"
        
        # **Requirement 4.2: Record has unique identifier**
        assert hasattr(retrieved_record, 'id'), "Record must have 'id' field"
        assert retrieved_record.id is not None, "Record id must not be None"
        assert isinstance(retrieved_record.id, str), "Record id must be a string"
        assert len(retrieved_record.id) > 0, "Record id must be non-empty"
        # Verify it's a valid UUID format
        try:
            UUID(retrieved_record.id)
        except ValueError:
            pytest.fail(f"Record id '{retrieved_record.id}' is not a valid UUID")
        
        # **Requirement 4.3: Record includes user_id from User_Context**
        assert hasattr(retrieved_record, 'user_id'), "Record must have 'user_id' field"
        assert retrieved_record.user_id is not None, "Record user_id must not be None"
        assert isinstance(retrieved_record.user_id, str), "Record user_id must be a string"
        assert len(retrieved_record.user_id) > 0, "Record user_id must be non-empty"
        assert retrieved_record.user_id == str(user_id), "Record user_id must match the authenticated user"
        
        # **Requirement 4.4: Record includes original Strategy_Input fields**
        assert hasattr(retrieved_record, 'brand_name'), "Record must have 'brand_name' field"
        assert retrieved_record.brand_name == strategy_input.brand_name, "Record brand_name must match input"
        
        assert hasattr(retrieved_record, 'industry'), "Record must have 'industry' field"
        assert retrieved_record.industry == strategy_input.industry, "Record industry must match input"
        
        assert hasattr(retrieved_record, 'target_audience'), "Record must have 'target_audience' field"
        assert retrieved_record.target_audience == strategy_input.target_audience, "Record target_audience must match input"
        
        assert hasattr(retrieved_record, 'goals'), "Record must have 'goals' field"
        assert retrieved_record.goals == strategy_input.goals, "Record goals must match input"
        
        # **Requirement 4.5: Record includes complete Strategy_Output**
        assert hasattr(retrieved_record, 'strategy_output'), "Record must have 'strategy_output' field"
        assert retrieved_record.strategy_output is not None, "Record strategy_output must not be None"
        assert isinstance(retrieved_record.strategy_output, StrategyOutput), "Record strategy_output must be a StrategyOutput instance"
        
        # Verify all StrategyOutput fields are present and complete
        output = retrieved_record.strategy_output
        
        assert hasattr(output, 'content_pillars'), "StrategyOutput must have 'content_pillars'"
        assert output.content_pillars == strategy_output.content_pillars, "content_pillars must match"
        assert len(output.content_pillars) >= 3, "content_pillars must have at least 3 items"
        assert len(output.content_pillars) <= 6, "content_pillars must have at most 6 items"
        
        assert hasattr(output, 'posting_schedule'), "StrategyOutput must have 'posting_schedule'"
        assert output.posting_schedule == strategy_output.posting_schedule, "posting_schedule must match"
        
        assert hasattr(output, 'platform_recommendations'), "StrategyOutput must have 'platform_recommendations'"
        assert output.platform_recommendations == strategy_output.platform_recommendations, "platform_recommendations must match"
        assert len(output.platform_recommendations) >= 2, "platform_recommendations must have at least 2 items"
        
        assert hasattr(output, 'content_themes'), "StrategyOutput must have 'content_themes'"
        assert output.content_themes == strategy_output.content_themes, "content_themes must match"
        assert len(output.content_themes) >= 5, "content_themes must have at least 5 items"
        
        assert hasattr(output, 'engagement_tactics'), "StrategyOutput must have 'engagement_tactics'"
        assert output.engagement_tactics == strategy_output.engagement_tactics, "engagement_tactics must match"
        assert len(output.engagement_tactics) >= 4, "engagement_tactics must have at least 4 items"
        
        assert hasattr(output, 'visual_prompts'), "StrategyOutput must have 'visual_prompts'"
        assert output.visual_prompts == strategy_output.visual_prompts, "visual_prompts must match"
        assert len(output.visual_prompts) >= 2, "visual_prompts must have at least 2 items"
        assert len(output.visual_prompts) <= 3, "visual_prompts must have at most 3 items"
        
        # **Requirement 4.6: Record includes created_at timestamp**
        assert hasattr(retrieved_record, 'created_at'), "Record must have 'created_at' field"
        assert retrieved_record.created_at is not None, "Record created_at must not be None"
        assert isinstance(retrieved_record.created_at, datetime), "Record created_at must be a datetime instance"
        
        # Verify the timestamp is valid and reasonable (not in the future, not too old)
        now = datetime.now(UTC)
        assert retrieved_record.created_at <= now, "created_at should not be in the future"
        # Allow up to 1 minute in the past (generous for test execution time)
        time_diff = (now - retrieved_record.created_at).total_seconds()
        assert time_diff >= 0, "created_at should be in the past or present"
        assert time_diff < 60, "created_at should be recent (within 60 seconds)"
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        num_records=st.integers(min_value=2, max_value=5),
        strategy_inputs=st.lists(strategy_input_strategy(), min_size=2, max_size=5),
        strategy_outputs=st.lists(strategy_output_strategy(), min_size=2, max_size=5)
    )
    async def test_property_multiple_records_all_complete(
        self,
        user_id,
        num_records,
        strategy_inputs,
        strategy_outputs
    ):
        """
        **Property 9: Strategy Records Are Complete (Multiple Records)**
        
        For any set of Strategy_Records stored in the database, all records
        should be complete with all required fields properly populated.
        
        **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
        """
        # Ensure we have enough test data
        if len(strategy_inputs) < num_records or len(strategy_outputs) < num_records:
            return
        
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Create and store multiple records
        stored_ids = []
        for i in range(num_records):
            record = StrategyRecord(
                user_id=str(user_id),
                brand_name=strategy_inputs[i].brand_name,
                industry=strategy_inputs[i].industry,
                target_audience=strategy_inputs[i].target_audience,
                goals=strategy_inputs[i].goals,
                strategy_output=strategy_outputs[i]
            )
            stored_record = await mock_repository.create_strategy(record)
            stored_ids.append(stored_record.id)
        
        # Verify all records are complete
        for i, strategy_id in enumerate(stored_ids):
            retrieved_record = await mock_repository.get_strategy_by_id(
                strategy_id,
                str(user_id)
            )
            
            assert retrieved_record is not None, f"Record {i} should be retrievable"
            
            # Verify all required fields are present
            assert retrieved_record.id is not None and len(retrieved_record.id) > 0
            assert retrieved_record.user_id == str(user_id)
            assert retrieved_record.brand_name == strategy_inputs[i].brand_name
            assert retrieved_record.industry == strategy_inputs[i].industry
            assert retrieved_record.target_audience == strategy_inputs[i].target_audience
            assert retrieved_record.goals == strategy_inputs[i].goals
            assert retrieved_record.strategy_output is not None
            assert isinstance(retrieved_record.strategy_output, StrategyOutput)
            assert retrieved_record.created_at is not None
            assert isinstance(retrieved_record.created_at, datetime)
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_record_id_is_unique(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 9: Strategy Records Have Unique IDs**
        
        For any Strategy_Record, the id field should be unique and not collide
        with other records.
        
        **Validates: Requirement 4.2**
        """
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Create multiple records
        record1 = StrategyRecord(
            user_id=str(user_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        record2 = StrategyRecord(
            user_id=str(user_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        stored1 = await mock_repository.create_strategy(record1)
        stored2 = await mock_repository.create_strategy(record2)
        
        # Verify IDs are unique
        assert stored1.id != stored2.id, "Each record should have a unique ID"
        
        # Verify both IDs are valid UUIDs
        try:
            UUID(stored1.id)
            UUID(stored2.id)
        except ValueError:
            pytest.fail("Record IDs should be valid UUIDs")
    
    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=None)
    @given(
        user_id=st.uuids(),
        strategy_input=strategy_input_strategy(),
        strategy_output=strategy_output_strategy()
    )
    async def test_property_record_preserves_input_data_integrity(
        self,
        user_id,
        strategy_input,
        strategy_output
    ):
        """
        **Property 9: Strategy Records Preserve Input Data Integrity**
        
        For any Strategy_Record, the stored input fields (brand_name, industry,
        target_audience, goals) should exactly match the original input data
        without modification or data loss.
        
        **Validates: Requirement 4.4**
        """
        # Create mock repository
        mock_repository = create_mock_repository()
        
        # Create and store record
        record = StrategyRecord(
            user_id=str(user_id),
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        stored_record = await mock_repository.create_strategy(record)
        retrieved_record = await mock_repository.get_strategy_by_id(
            stored_record.id,
            str(user_id)
        )
        
        # Verify exact data preservation (no truncation, modification, or encoding issues)
        assert retrieved_record.brand_name == strategy_input.brand_name, \
            "brand_name should be preserved exactly"
        assert retrieved_record.industry == strategy_input.industry, \
            "industry should be preserved exactly"
        assert retrieved_record.target_audience == strategy_input.target_audience, \
            "target_audience should be preserved exactly"
        assert retrieved_record.goals == strategy_input.goals, \
            "goals should be preserved exactly"
        
        # Verify no whitespace trimming or normalization occurred unexpectedly
        assert len(retrieved_record.brand_name) == len(strategy_input.brand_name)
        assert len(retrieved_record.industry) == len(strategy_input.industry)
        assert len(retrieved_record.target_audience) == len(strategy_input.target_audience)
        assert len(retrieved_record.goals) == len(strategy_input.goals)
