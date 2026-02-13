#!/bin/bash

echo "=== Testing Logout API Endpoint ==="
echo ""

# First, login to get a valid auth token
echo "Step 1: Logging in to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c /tmp/test_cookies.txt)

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Login successful"
else
  echo "✗ Login failed - creating test user first..."
  
  # Try to signup first
  SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"test@example.com","password":"password123"}')
  
  echo "Signup Response: $SIGNUP_RESPONSE"
  
  # Try login again
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}' \
    -c /tmp/test_cookies.txt)
  
  echo "Login Response (retry): $LOGIN_RESPONSE"
fi

echo ""
echo "Cookies after login:"
cat /tmp/test_cookies.txt
echo ""

# Now test logout with the auth cookie
echo "Step 2: Testing logout endpoint..."
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -b /tmp/test_cookies.txt \
  -c /tmp/test_cookies_after_logout.txt \
  -v 2>&1)

echo "$LOGOUT_RESPONSE"
echo ""

# Check if logout was successful
if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Logout API returned success"
else
  echo "✗ Logout API did not return success"
fi

# Check if Set-Cookie header is present to clear the cookie
if echo "$LOGOUT_RESPONSE" | grep -q "Set-Cookie.*auth_token"; then
  echo "✓ Set-Cookie header present to clear auth_token"
else
  echo "✗ Set-Cookie header not found"
fi

# Check if cookie has Max-Age=0 or expires in the past
if echo "$LOGOUT_RESPONSE" | grep -q "Max-Age=0\|expires="; then
  echo "✓ Cookie set to expire (Max-Age=0 or expires set)"
else
  echo "✗ Cookie expiration not properly set"
fi

echo ""
echo "Cookies after logout:"
cat /tmp/test_cookies_after_logout.txt 2>/dev/null || echo "No cookies file"
echo ""

echo "=== Test Complete ==="
