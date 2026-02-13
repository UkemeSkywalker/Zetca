#!/bin/bash

# Test script for Profile API using curl
# Simulates Postman testing as mentioned in task verification

echo "🧪 Testing Profile API with curl"
echo ""

# Step 1: Create a test user via signup
echo "1️⃣  Creating test user via signup..."
SIGNUP_RESPONSE=$(curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Curl Test User",
    "email": "curl-test-'$(date +%s)'@example.com",
    "password": "TestPassword123!"
  }')

echo "Signup response: $SIGNUP_RESPONSE"

# Extract user ID from response
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ User created with ID: $USER_ID"
echo ""

# Step 2: Test GET /api/profile WITH authentication (using cookie from signup)
echo "2️⃣  Testing GET /api/profile WITH authentication (using cookie)..."
PROFILE_RESPONSE=$(curl -s -b cookies.txt http://localhost:3000/api/profile)
echo "Profile response: $PROFILE_RESPONSE"

if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Profile retrieved successfully"
  
  # Check that password hash is not in response
  if echo "$PROFILE_RESPONSE" | grep -q 'passwordHash'; then
    echo "❌ WARNING: Password hash exposed in response!"
  else
    echo "✅ Password hash correctly excluded"
  fi
else
  echo "❌ Failed to retrieve profile"
fi
echo ""

# Step 3: Test GET /api/profile WITHOUT authentication
echo "3️⃣  Testing GET /api/profile WITHOUT authentication..."
UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3000/api/profile)
HTTP_STATUS=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✅ Correctly rejected with 401 Unauthorized"
else
  echo "❌ Expected 401, got $HTTP_STATUS"
fi
echo ""

# Step 4: Test with invalid token
echo "4️⃣  Testing GET /api/profile with INVALID token..."
INVALID_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Cookie: auth_token=invalid.token.here" \
  http://localhost:3000/api/profile)
HTTP_STATUS=$(echo "$INVALID_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✅ Correctly rejected invalid token with 401"
else
  echo "❌ Expected 401, got $HTTP_STATUS"
fi
echo ""

# Cleanup
rm -f cookies.txt
echo "✅ All curl tests completed!"
