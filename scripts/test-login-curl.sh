#!/bin/bash

# Test script for login API endpoint using curl
# Prerequisites: Next.js dev server must be running on port 3000

BASE_URL="http://localhost:3000"
VALID_EMAIL="test@example.com"
VALID_PASSWORD="TestPassword123"

echo "🧪 Login API Endpoint Test Suite (curl)"
echo "========================================"
echo ""

# Test 1: Valid credentials
echo "--- Test 1: Valid Credentials ---"
echo "POST $BASE_URL/api/auth/login"
echo "Body: {\"email\":\"$VALID_EMAIL\",\"password\":\"$VALID_PASSWORD\"}"
echo ""
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$VALID_EMAIL\",\"password\":\"$VALID_PASSWORD\"}" \
  -i \
  -s | head -30
echo ""
echo ""

# Test 2: Invalid credentials
echo "--- Test 2: Invalid Credentials ---"
echo "POST $BASE_URL/api/auth/login"
echo "Body: {\"email\":\"$VALID_EMAIL\",\"password\":\"WrongPassword\"}"
echo ""
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$VALID_EMAIL\",\"password\":\"WrongPassword\"}" \
  -s
echo ""
echo ""

# Test 3: Missing email
echo "--- Test 3: Missing Email ---"
echo "POST $BASE_URL/api/auth/login"
echo "Body: {\"password\":\"$VALID_PASSWORD\"}"
echo ""
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$VALID_PASSWORD\"}" \
  -s
echo ""
echo ""

# Test 4: Missing password
echo "--- Test 4: Missing Password ---"
echo "POST $BASE_URL/api/auth/login"
echo "Body: {\"email\":\"$VALID_EMAIL\"}"
echo ""
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$VALID_EMAIL\"}" \
  -s
echo ""
echo ""

# Test 5: Rate limiting (6 rapid requests)
echo "--- Test 5: Rate Limiting (6 rapid requests) ---"
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$VALID_EMAIL\",\"password\":\"$VALID_PASSWORD\"}" \
    -s -w "\nHTTP Status: %{http_code}\n" \
    -o /dev/null
  echo ""
done

echo ""
echo "✅ Test suite completed"
echo ""
echo "📋 Manual verification checklist:"
echo "   ✓ Valid credentials return token and user data"
echo "   ✓ Invalid credentials return generic error message"
echo "   ✓ Missing fields return validation errors"
echo "   ✓ 6th request returns 429 (Too Many Requests)"
echo "   ✓ Cookie 'auth-token' is set in response headers"
