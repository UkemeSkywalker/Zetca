"""
Checkpoint 12: Verify real Copywriter Agent generates copies.

This script tests:
1. Real CopywriterAgent generates platform-specific copies from strategy data
2. Copies have appropriate text, platform, and hashtags
3. Chat refinement works with the real agent
4. Full API flow with the FastAPI test client
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv()


async def test_real_agent_generation():
    """Test that the real CopywriterAgent generates valid copies."""
    print("=" * 60)
    print("TEST 1: Real Agent - Copy Generation")
    print("=" * 60)

    from services.copywriter_agent import CopywriterAgent

    agent = CopywriterAgent(
        aws_region=os.getenv("AWS_REGION", "us-east-1"),
        model_id=os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    strategy_data = {
        "brand_name": "CopyCheckpoint",
        "industry": "SaaS",
        "target_audience": "Startup founders",
        "goals": "Grow brand awareness on social media",
        "content_pillars": [
            "Thought Leadership & Industry Insights",
            "Product Innovation & Features",
            "Customer Success Stories",
        ],
        "content_themes": [
            "Industry trend analysis",
            "Product feature deep-dives",
            "Customer success stories",
        ],
        "engagement_tactics": [
            "Host monthly LinkedIn Live Q&A sessions",
            "Respond to comments within 2 hours",
        ],
        "platform_recommendations": ["LinkedIn", "Twitter", "YouTube"],
        "posting_schedule": "Post 3-4 times per week, Tuesday-Thursday 9-11 AM EST",
    }

    print(f"Generating copies for brand: {strategy_data['brand_name']}")
    print(f"Platforms: {strategy_data['platform_recommendations']}")
    print("Calling Bedrock... (this may take 10-30 seconds)\n")

    try:
        result = await asyncio.wait_for(
            agent.generate_copies(strategy_data), timeout=60
        )
    except asyncio.TimeoutError:
        print("FAIL: Agent timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"FAIL: Agent raised exception: {type(e).__name__}: {e}")
        return False

    # Validate result
    print(f"Generated {len(result.copies)} copies:\n")
    for i, copy in enumerate(result.copies, 1):
        print(f"  Copy {i}:")
        print(f"    Platform: {copy.platform}")
        print(f"    Text:     {copy.text[:120]}...")
        print(f"    Hashtags: {copy.hashtags}")
        print()

    # Assertions
    assert len(result.copies) >= 1, "Should generate at least 1 copy"
    for copy in result.copies:
        assert copy.text.strip(), "Copy text should not be empty"
        assert copy.platform.strip(), "Platform should not be empty"
        assert isinstance(copy.hashtags, list), "Hashtags should be a list"

    platforms = [c.platform.lower() for c in result.copies]
    print(f"Platforms covered: {platforms}")
    print("PASS: Real agent generated valid copies\n")
    return True


async def test_real_agent_chat_refinement():
    """Test that the real CopywriterAgent can refine copies via chat."""
    print("=" * 60)
    print("TEST 2: Real Agent - Chat Refinement")
    print("=" * 60)

    from services.copywriter_agent import CopywriterAgent

    agent = CopywriterAgent(
        aws_region=os.getenv("AWS_REGION", "us-east-1"),
        model_id=os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    strategy_data = {
        "brand_name": "CopyCheckpoint",
        "industry": "SaaS",
        "target_audience": "Startup founders",
        "goals": "Grow brand awareness on social media",
        "content_pillars": ["Thought Leadership", "Product Innovation"],
    }

    copy_text = "Discover how our SaaS platform helps startup founders scale their social media presence. Join the revolution today."
    platform = "LinkedIn"
    hashtags = ["#SaaS", "#StartupLife", "#SocialMedia"]
    user_message = "Make it more casual and add some emojis. Also shorten it."

    print(f"Original copy: {copy_text}")
    print(f"User request: {user_message}")
    print("Calling Bedrock for refinement... (this may take 10-30 seconds)\n")

    try:
        result = await asyncio.wait_for(
            agent.chat_refine(copy_text, platform, hashtags, strategy_data, user_message),
            timeout=60,
        )
    except asyncio.TimeoutError:
        print("FAIL: Chat refinement timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"FAIL: Chat refinement raised exception: {type(e).__name__}: {e}")
        return False

    print(f"  Updated text:     {result.updated_text}")
    print(f"  Updated hashtags: {result.updated_hashtags}")
    print(f"  AI message:       {result.ai_message}")
    print()

    assert result.updated_text.strip(), "Updated text should not be empty"
    assert isinstance(result.updated_hashtags, list), "Updated hashtags should be a list"
    assert result.ai_message.strip(), "AI message should not be empty"

    print("PASS: Real agent chat refinement works\n")
    return True



async def test_full_api_flow():
    """Test the full API flow using FastAPI test client with real DynamoDB."""
    print("=" * 60)
    print("TEST 3: Full API Flow (generate, list, get, chat, delete)")
    print("=" * 60)

    import jwt
    from datetime import datetime, timedelta, UTC
    from httpx import AsyncClient, ASGITransport
    from main import app

    # Create a valid JWT for checkpoint-user-a
    secret = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production")
    user_id = "checkpoint-user-a"
    strategy_id = "528a8eaa-f27d-4d6e-a5a7-26a83b6033b1"

    token = jwt.encode(
        {"userId": user_id, "exp": datetime.now(UTC) + timedelta(hours=1)},
        secret,
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Generate copies
        print(f"\n1. POST /api/copy/generate (strategyId={strategy_id[:8]}...)")
        resp = await asyncio.wait_for(
            client.post(
                "/api/copy/generate",
                json={"strategy_id": strategy_id},
                headers=headers,
            ),
            timeout=90,
        )
        print(f"   Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"   Error: {resp.text}")
            return False

        copies = resp.json()
        print(f"   Generated {len(copies)} copies")
        for c in copies:
            print(f"     - {c['platform']}: {c['text'][:80]}...")

        assert len(copies) >= 1, "Should generate at least 1 copy"
        copy_id = copies[0]["id"]

        # Step 2: List copies by strategy
        print(f"\n2. GET /api/copy/list/{strategy_id[:8]}...")
        resp = await client.get(
            f"/api/copy/list/{strategy_id}", headers=headers
        )
        print(f"   Status: {resp.status_code}")
        listed = resp.json()
        print(f"   Listed {len(listed)} copies")
        assert resp.status_code == 200
        assert len(listed) >= len(copies)

        # Step 3: Get single copy
        print(f"\n3. GET /api/copy/{copy_id[:8]}...")
        resp = await client.get(f"/api/copy/{copy_id}", headers=headers)
        print(f"   Status: {resp.status_code}")
        assert resp.status_code == 200
        fetched = resp.json()
        assert fetched["id"] == copy_id

        # Step 4: Chat refinement
        print(f"\n4. POST /api/copy/{copy_id[:8]}../chat")
        resp = await asyncio.wait_for(
            client.post(
                f"/api/copy/{copy_id}/chat",
                json={"message": "Make it shorter and punchier"},
                headers=headers,
            ),
            timeout=90,
        )
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            chat_resp = resp.json()
            print(f"   Updated text: {chat_resp['updated_text'][:80]}...")
            print(f"   AI message:   {chat_resp['ai_message'][:80]}...")
        else:
            print(f"   Error: {resp.text}")
            return False

        # Step 5: Verify user isolation (different user gets 403)
        print("\n5. Verify user isolation (different user)")
        other_token = jwt.encode(
            {"userId": "other-user-xyz", "exp": datetime.now(UTC) + timedelta(hours=1)},
            secret,
            algorithm="HS256",
        )
        other_headers = {"Authorization": f"Bearer {other_token}"}
        resp = await client.get(f"/api/copy/{copy_id}", headers=other_headers)
        print(f"   Status: {resp.status_code} (expected 403)")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"

        # Step 6: Delete copy
        print(f"\n6. DELETE /api/copy/{copy_id[:8]}...")
        resp = await client.delete(f"/api/copy/{copy_id}", headers=headers)
        print(f"   Status: {resp.status_code} (expected 204)")
        assert resp.status_code == 204

        # Verify deleted
        resp = await client.get(f"/api/copy/{copy_id}", headers=headers)
        print(f"   After delete GET: {resp.status_code} (expected 404)")
        assert resp.status_code == 404

        # Clean up remaining copies
        for c in copies[1:]:
            await client.delete(f"/api/copy/{c['id']}", headers=headers)

    print("\nPASS: Full API flow works end-to-end\n")
    return True


async def main():
    results = {}

    # Test 1: Real agent generation
    try:
        results["generation"] = await test_real_agent_generation()
    except Exception as e:
        print(f"FAIL: {type(e).__name__}: {e}")
        results["generation"] = False

    # Test 2: Real agent chat refinement
    try:
        results["chat"] = await test_real_agent_chat_refinement()
    except Exception as e:
        print(f"FAIL: {type(e).__name__}: {e}")
        results["chat"] = False

    # Test 3: Full API flow
    try:
        results["api_flow"] = await test_full_api_flow()
    except Exception as e:
        print(f"FAIL: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        results["api_flow"] = False

    # Summary
    print("=" * 60)
    print("CHECKPOINT 12 SUMMARY")
    print("=" * 60)
    all_pass = all(results.values())
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {status}: {name}")
    print()
    if all_pass:
        print("All checkpoint 12 verifications PASSED")
    else:
        print("Some verifications FAILED")
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    asyncio.run(main())
