#!/bin/bash

# Test script for profile UPDATE endpoint
# This script tests the PUT /api/profile endpoint

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/profile"

echo "=== Profile UPDATE API Test ==="
echo ""

# First, we need to login to get a valid auth cookie
echo "Step 1: Login to get auth cookie..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Login successful"
else
  echo "✗ Login failed - creating test user first..."
  
  # Try to signup if login failed
  SIGNUP_RESPONSE=$(curl -s -c cookies.txt -X POST "${BASE_URL}/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test User",
      "email": "test@example.com",
      "password": "password123"
    }')
  
  echo "Signup Response: $SIGNUP_RESPONSE"
  
  if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Signup successful"
  else
    echo "✗ Signup failed - cannot proceed with tests"
    rm -f cookies.txt
    exit 1
  fi
fi

echo ""
echo "Step 2: Update profile with valid data..."
UPDATE_RESPONSE=$(curl -s -b cookies.txt -X PUT "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "email": "updated@example.com",
    "bio": "This is my updated bio"
  }')

echo "Update Response: $UPDATE_RESPONSE"
echo ""

# Check if update was successful
if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Profile update successful"
  
  # Verify the data was updated
  if echo "$UPDATE_RESPONSE" | grep -q '"name":"Updated Test User"'; then
    echo "✓ Name updated correctly"
  else
    echo "✗ Name not updated"
  fi
  
  if echo "$UPDATE_RESPONSE" | grep -q '"email":"updated@example.com"'; then
    echo "✓ Email updated correctly"
  else
    echo "✗ Email not updated"
  fi
  
  if echo "$UPDATE_RESPONSE" | grep -q '"bio":"This is my updated bio"'; then
    echo "✓ Bio updated correctly"
  else
    echo "✗ Bio not updated"
  fi
  
  if echo "$UPDATE_RESPONSE" | grep -q '"lastModified"'; then
    echo "✓ lastModified timestamp present"
  else
    echo "✗ lastModified timestamp missing"
  fi
else
  echo "✗ Profile update failed"
fi

echo ""
echo "Step 3: Test validation - invalid email..."
INVALID_EMAIL_RESPONSE=$(curl -s -b cookies.txt -X PUT "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email"
  }')

echo "Invalid Email Response: $INVALID_EMAIL_RESPONSE"
echo ""

if echo "$INVALID_EMAIL_RESPONSE" | grep -q '"success":false'; then
  echo "✓ Invalid email rejected"
else
  echo "✗ Invalid email not rejected"
fi

echo ""
echo "Step 4: Test validation - name too long..."
LONG_NAME=$(printf 'a%.0s' {1..101})
LONG_NAME_RESPONSE=$(curl -s -b cookies.txt -X PUT "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$LONG_NAME\"
  }")

echo "Long Name Response: $LONG_NAME_RESPONSE"
echo ""

if echo "$LONG_NAME_RESPONSE" | grep -q '"success":false'; then
  echo "✓ Long name rejected"
else
  echo "✗ Long name not rejected"
fi

echo ""
echo "Step 5: Test validation - bio too long..."
LONG_BIO=$(printf 'a%.0s' {1..501})
LONG_BIO_RESPONSE=$(curl -s -b cookies.txt -X PUT "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"bio\": \"$LONG_BIO\"
  }")

echo "Long Bio Response: $LONG_BIO_RESPONSE"
echo ""

if echo "$LONG_BIO_RESPONSE" | grep -q '"success":false'; then
  echo "✓ Long bio rejected"
else
  echo "✗ Long bio not rejected"
fi

echo ""
echo "Step 6: Test without auth cookie..."
NO_AUTH_RESPONSE=$(curl -s -X PUT "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized User"
  }')

echo "No Auth Response: $NO_AUTH_RESPONSE"
echo ""

if echo "$NO_AUTH_RESPONSE" | grep -q '"success":false'; then
  echo "✓ Unauthorized request rejected"
else
  echo "✗ Unauthorized request not rejected"
fi

echo ""
echo "Step 7: Verify data persisted - GET profile..."
GET_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_ENDPOINT")

echo "GET Profile Response: $GET_RESPONSE"
echo ""

if echo "$GET_RESPONSE" | grep -q '"name":"Updated Test User"'; then
  echo "✓ Updated data persisted in database"
else
  echo "✗ Updated data not persisted"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "=== Test Complete ==="
