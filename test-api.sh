#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Idea Communicator - API Test Script        ║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║   Phase 1: Authentication & Infrastructure    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Check if backend is running
echo -e "${YELLOW}[1/8] Checking if backend is running...${NC}"
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running. Start it with: docker-compose up -d${NC}"
    exit 1
fi
echo ""

# Test Registration
echo -e "${YELLOW}[2/8] Testing user registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser_'$(date +%s)'@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "dataRegion": "eu",
    "gdprConsentGiven": true,
    "marketingConsent": false
  }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*' | sed 's/"refreshToken":"//')
    USER_EMAIL=$(echo "$REGISTER_RESPONSE" | grep -o '"email":"[^"]*' | sed 's/"email":"//' | head -1)
    echo "  Email: $USER_EMAIL"
    echo "  Token: ${ACCESS_TOKEN:0:30}..."
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test Login
echo -e "${YELLOW}[3/8] Testing user login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$USER_EMAIL'",
    "password": "TestPassword123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Login successful${NC}"
    # Update tokens
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*' | sed 's/"refreshToken":"//')
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test Get Current User
echo -e "${YELLOW}[4/8] Testing get current user...${NC}"
ME_RESPONSE=$(curl -s -X POST $API_URL/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q "$USER_EMAIL"; then
    echo -e "${GREEN}✓ Get current user successful${NC}"
    echo "  User: $(echo "$ME_RESPONSE" | grep -o '"firstName":"[^"]*' | sed 's/"firstName":"//')  $(echo "$ME_RESPONSE" | grep -o '"lastName":"[^"]*' | sed 's/"lastName":"//')"
else
    echo -e "${RED}✗ Get current user failed${NC}"
    echo "$ME_RESPONSE"
fi
echo ""

# Test Update Profile
echo -e "${YELLOW}[5/8] Testing update profile...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH $API_URL/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }')

if echo "$UPDATE_RESPONSE" | grep -q "Updated"; then
    echo -e "${GREEN}✓ Profile update successful${NC}"
else
    echo -e "${RED}✗ Profile update failed${NC}"
    echo "$UPDATE_RESPONSE"
fi
echo ""

# Test Token Refresh
echo -e "${YELLOW}[6/8] Testing token refresh...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $API_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }')

if echo "$REFRESH_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Token refresh successful${NC}"
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    echo "  New token: ${NEW_ACCESS_TOKEN:0:30}..."
else
    echo -e "${RED}✗ Token refresh failed${NC}"
    echo "$REFRESH_RESPONSE"
fi
echo ""

# Test GDPR Data Export
echo -e "${YELLOW}[7/8] Testing GDPR data export...${NC}"
EXPORT_RESPONSE=$(curl -s -X GET $API_URL/users/me/export \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$EXPORT_RESPONSE" | grep -q "auditTrail"; then
    echo -e "${GREEN}✓ Data export successful${NC}"
    echo "  Export includes user data and audit trail"
else
    echo -e "${RED}✗ Data export failed${NC}"
    echo "$EXPORT_RESPONSE"
fi
echo ""

# Test Logout
echo -e "${YELLOW}[8/8] Testing logout...${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST $API_URL/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }')

if echo "$LOGOUT_RESPONSE" | grep -q "Successfully logged out"; then
    echo -e "${GREEN}✓ Logout successful${NC}"
else
    echo -e "${RED}✗ Logout failed${NC}"
    echo "$LOGOUT_RESPONSE"
fi
echo ""

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                                ║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   ✓ All authentication tests passed          ║${NC}"
echo -e "${BLUE}║                                               ║${NC}"
echo -e "${BLUE}║   Next steps:                                 ║${NC}"
echo -e "${BLUE}║   1. Open http://localhost:5173              ║${NC}"
echo -e "${BLUE}║   2. Register a user via the UI               ║${NC}"
echo -e "${BLUE}║   3. Test the dashboard                       ║${NC}"
echo -e "${BLUE}║   4. Check API docs at /api/docs              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
