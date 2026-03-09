"""
Unit tests for MockStrategistAgent.

Tests verify that the mock agent returns properly structured data
that conforms to the StrategyOutput Pydantic model.
"""

import pytest
import asyncio
from services.mock_agent import MockStrategistAgent
from models.strategy import StrategyInput, StrategyOutput


class TestMockStrategistAgent:
    """Test suite for MockStrategistAgent."""
    
    @pytest.fixture
    def agent(self):
        """Create a MockStrategistAgent instance."""
        return MockStrategistAgent()
    
    @pytest.fixture
    def sample_input(self):
        """Create sample strategy input."""
        return StrategyInput(
            brand_name="TestCorp",
            industry="Technology",
            target_audience="Developers",
            goals="Increase brand awareness"
        )
    
    @pytest.mark.asyncio
    async def test_generate_strategy_returns_valid_output(self, agent, sample_input):
        """Test that generate_strategy returns a valid StrategyOutput."""
        result = await agent.generate_strategy(sample_input)
        
        # Should return StrategyOutput instance
        assert isinstance(result, StrategyOutput)
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_correct_content_pillars_count(self, agent, sample_input):
        """Test that content_pillars has 3-6 items."""
        result = await agent.generate_strategy(sample_input)
        
        assert len(result.content_pillars) >= 3
        assert len(result.content_pillars) <= 6
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_correct_platform_recommendations_count(self, agent, sample_input):
        """Test that platform_recommendations has at least 2 items."""
        result = await agent.generate_strategy(sample_input)
        
        assert len(result.platform_recommendations) >= 2
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_correct_visual_prompts_count(self, agent, sample_input):
        """Test that visual_prompts has 2-3 items."""
        result = await agent.generate_strategy(sample_input)
        
        assert len(result.visual_prompts) >= 2
        assert len(result.visual_prompts) <= 3
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_correct_content_themes_count(self, agent, sample_input):
        """Test that content_themes has at least 5 items."""
        result = await agent.generate_strategy(sample_input)
        
        assert len(result.content_themes) >= 5
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_correct_engagement_tactics_count(self, agent, sample_input):
        """Test that engagement_tactics has at least 4 items."""
        result = await agent.generate_strategy(sample_input)
        
        assert len(result.engagement_tactics) >= 4
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_posting_schedule(self, agent, sample_input):
        """Test that posting_schedule is a non-empty string."""
        result = await agent.generate_strategy(sample_input)
        
        assert isinstance(result.posting_schedule, str)
        assert len(result.posting_schedule) > 0
    
    @pytest.mark.asyncio
    async def test_generate_strategy_platform_recommendations_have_valid_priority(self, agent, sample_input):
        """Test that all platform recommendations have valid priority values."""
        result = await agent.generate_strategy(sample_input)
        
        valid_priorities = {'high', 'medium', 'low'}
        for platform in result.platform_recommendations:
            assert platform.priority in valid_priorities
    
    @pytest.mark.asyncio
    async def test_generate_strategy_visual_prompts_are_detailed(self, agent, sample_input):
        """Test that visual prompts are detailed (not just generic descriptions)."""
        result = await agent.generate_strategy(sample_input)
        
        # Visual prompts should be reasonably detailed (at least 50 characters)
        for prompt in result.visual_prompts:
            assert len(prompt) >= 50, f"Visual prompt too short: {prompt}"
    
    @pytest.mark.asyncio
    async def test_generate_strategy_has_delay(self, agent, sample_input):
        """Test that generate_strategy includes a simulated delay."""
        import time
        
        start_time = time.time()
        await agent.generate_strategy(sample_input)
        elapsed_time = time.time() - start_time
        
        # Should take at least 1 second due to asyncio.sleep(1)
        assert elapsed_time >= 1.0, f"Expected delay of 1s, but took {elapsed_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_generate_strategy_is_deterministic(self, agent, sample_input):
        """Test that the mock agent returns the same data every time."""
        result1 = await agent.generate_strategy(sample_input)
        result2 = await agent.generate_strategy(sample_input)
        
        # Should return identical data
        assert result1.content_pillars == result2.content_pillars
        assert result1.posting_schedule == result2.posting_schedule
        assert len(result1.platform_recommendations) == len(result2.platform_recommendations)
        assert result1.visual_prompts == result2.visual_prompts
