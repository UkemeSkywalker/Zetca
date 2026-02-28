"""
Quick test script to verify the strategist agent fix.
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.strategist_agent import StrategistAgent
from models.strategy import StrategyInput
from config import settings


async def test_strategist_agent():
    """Test the strategist agent with the fixed invoke_async method."""
    print("🧪 Testing Strategist Agent...")
    print(f"AWS Region: {settings.aws_region}")
    
    # Create test input
    test_input = StrategyInput(
        brand_name="TechCorp",
        industry="SaaS",
        target_audience="B2B decision makers in tech companies",
        goals="Increase brand awareness and generate qualified leads"
    )
    
    print(f"\n📝 Test Input:")
    print(f"  Brand: {test_input.brand_name}")
    print(f"  Industry: {test_input.industry}")
    print(f"  Target Audience: {test_input.target_audience}")
    print(f"  Goals: {test_input.goals}")
    
    try:
        # Initialize agent with configured model and credentials
        print("\n🚀 Initializing Strategist Agent...")
        print(f"Model: {settings.bedrock_model_id}")
        print(f"Using credentials from .env: {bool(settings.aws_access_key_id)}")
        agent = StrategistAgent(
            aws_region=settings.aws_region,
            model_id=settings.bedrock_model_id,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
        
        # Generate strategy
        print("⏳ Generating strategy (this may take 10-30 seconds)...")
        strategy = await agent.generate_strategy(test_input)
        
        # Verify output
        print("\n✅ Strategy generated successfully!")
        print(f"\n📊 Strategy Output:")
        print(f"  Content Pillars ({len(strategy.content_pillars)}): {strategy.content_pillars}")
        print(f"  Posting Schedule: {strategy.posting_schedule}")
        print(f"  Platform Recommendations ({len(strategy.platform_recommendations)}):")
        for rec in strategy.platform_recommendations:
            print(f"    - {rec.platform} ({rec.priority}): {rec.rationale}")
        print(f"  Content Themes ({len(strategy.content_themes)}): {strategy.content_themes[:3]}...")
        print(f"  Engagement Tactics ({len(strategy.engagement_tactics)}): {strategy.engagement_tactics[:3]}...")
        print(f"  Visual Prompts ({len(strategy.visual_prompts)}):")
        for i, prompt in enumerate(strategy.visual_prompts, 1):
            print(f"    {i}. {prompt[:80]}...")
        
        print("\n✨ Test PASSED! The fix works correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test FAILED with error:")
        print(f"  Type: {type(e).__name__}")
        print(f"  Message: {str(e)}")
        import traceback
        print(f"\n📋 Full traceback:")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 70)
    print("STRATEGIST AGENT FIX VERIFICATION TEST")
    print("=" * 70)
    
    success = asyncio.run(test_strategist_agent())
    
    print("\n" + "=" * 70)
    if success:
        print("✅ ALL TESTS PASSED - Fix is working!")
        sys.exit(0)
    else:
        print("❌ TEST FAILED - Please review the error above")
        sys.exit(1)
