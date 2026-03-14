"""
Test script to verify JWT authentication is working
Run with: python test_auth_endpoint.py
"""

import requests
import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_URL = "http://localhost:8000"
JWT_SECRET = os.getenv("JWT_SECRET")

print("=== Testing Strategy API Authentication ===\n")
print(f"API URL: {API_URL}")
print(f"JWT_SECRET: {JWT_SECRET[:20]}..." if JWT_SECRET else "JWT_SECRET: NOT SET")

# Test 1: Health check (no auth required)
print("\n1. Testing health endpoint (no auth)...")
try:
    response = requests.get(f"{API_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ERROR: {e}")
    print("   Is the Python service running? (uvicorn main:app --reload --port 8000)")
    exit(1)

# Test 2: Create a test JWT token
print("\n2. Creating test JWT token...")
test_user_id = "test-user-123"
test_email = "test@example.com"

try:
    token = jwt.encode(
        {"userId": test_user_id, "email": test_email},
        JWT_SECRET,
        algorithm="HS256"
    )
    print(f"   Token created: {token[:50]}...")
    
    # Decode to verify
    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    print(f"   Decoded payload: {decoded}")
except Exception as e:
    print(f"   ERROR creating token: {e}")
    exit(1)

# Test 3: Call /api/strategy/list with token
print("\n3. Testing /api/strategy/list with auth token...")
try:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.get(f"{API_URL}/api/strategy/list", headers=headers)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 200:
        print("   ✓ SUCCESS: Authentication working!")
    elif response.status_code == 401:
        print("   ✗ ERROR: 401 Unauthorized - Token validation failed")
    elif response.status_code == 403:
        print("   ✗ ERROR: 403 Forbidden - Access denied")
    else:
        print(f"   ✗ ERROR: Unexpected status code {response.status_code}")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 4: Call without token (should fail)
print("\n4. Testing /api/strategy/list WITHOUT token (should fail)...")
try:
    response = requests.get(f"{API_URL}/api/strategy/list")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 401:
        print("   ✓ EXPECTED: 401 Unauthorized")
    else:
        print(f"   ✗ UNEXPECTED: Got {response.status_code} instead of 401")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n=== Test Complete ===")
