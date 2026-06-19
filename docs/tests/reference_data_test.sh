#!/bin/bash

# Configuration
BASE_URL="http://localhost:8000/api/v1"
ADMIN_EMAIL="admin@platform.com"
ADMIN_PASS="changeme123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "--------------------------------------------------"
echo "Starting Core Reference Data Integration Test (CURL)"
echo "--------------------------------------------------"

# 1. Auth: Login as SuperAdmin
echo -n "1. Testing Admin Login... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASS\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"\K[^"]+')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 2. Admin: Create a Hub Manager (needed for Hub creation)
echo -n "2. Creating Hub Manager... "
HM_EMAIL="hm_test_$(date +%s)@example.com"
HM_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"fname\": \"Hub\",
    \"lname\": \"Manager\",
    \"email\": \"$HM_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"employee\",
    \"employee_role\": \"hub_manager\",
    \"ssn\": \"SSN-HM-$(date +%s)\",
    \"hire_date\": \"2026-04-23\"
  }")

HM_ID=$(echo "$HM_RESPONSE" | grep -oP '"user_id":\K[0-9]+')

if [ -n "$HM_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $HM_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$HM_RESPONSE"
    exit 1
fi

# 3. Admin: Create Hub
echo -n "3. Creating Hub... "
HUB_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/hubs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"location\": \"Integration Test Hub\",
    \"size_sq_meters\": 1200,
    \"capacity\": 25000,
    \"manager_employee_id\": $HM_ID
  }")

HUB_ID=$(echo "$HUB_RESPONSE" | grep -oP '"id":\K[0-9]+' | head -n 1)

if [ -n "$HUB_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $HUB_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$HUB_RESPONSE"
    exit 1
fi

# 4. Admin: Create Truck
echo -n "4. Creating Truck... "
PLATE="PLT-$(date +%s | cut -c 6-10)"
TRUCK_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/trucks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"hub_id\": $HUB_ID,
    \"payload_capacity\": 3000,
    \"truck_type\": \"Box Truck\",
    \"plate_number\": \"$PLATE\"
  }")

TRUCK_ID=$(echo "$TRUCK_RESPONSE" | grep -oP '"id":\K[0-9]+' | head -n 1)

if [ -n "$TRUCK_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $TRUCK_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$TRUCK_RESPONSE"
    exit 1
fi

# 5. Admin: Create Commodity
echo -n "5. Creating Commodity... "
COMM_TITLE="Comm-$(date +%s)"
COMM_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/commodities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"title\": \"$COMM_TITLE\"
  }")

COMM_ID=$(echo "$COMM_RESPONSE" | grep -oP '"id":\K[0-9]+' | head -n 1)

if [ -n "$COMM_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $COMM_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$COMM_RESPONSE"
    exit 1
fi

# 6. Admin: Set Commodity Price
echo -n "6. Setting Commodity Price... "
PRICE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/commodities/$COMM_ID/prices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"price\": 3.75
  }")

if echo "$PRICE_RESPONSE" | grep -q "Price updated successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$PRICE_RESPONSE"
    exit 1
fi

# 7. Admin: Link Commodity to Hub
echo -n "7. Linking Commodity to Hub... "
LINK_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/hubs/$HUB_ID/commodities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"commodity_id\": $COMM_ID
  }")

if echo "$LINK_RESPONSE" | grep -q "linked to hub successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$LINK_RESPONSE"
    exit 1
fi

# 8. Admin: Verify Data (List Endpoints)
echo -n "8. Verifying Data Lists... "
HUBS_LIST=$(curl -s -X GET "$BASE_URL/admin/hubs" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
TRUCKS_LIST=$(curl -s -X GET "$BASE_URL/admin/trucks" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")
COMMS_LIST=$(curl -s -X GET "$BASE_URL/admin/commodities" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json")

if echo "$HUBS_LIST" | grep -q "Integration Test Hub" && \
   echo "$TRUCKS_LIST" | grep -q "$PLATE" && \
   echo "$COMMS_LIST" | grep -q "$COMM_TITLE"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

echo "--------------------------------------------------"
echo "All Reference Data integration tests passed!"
echo "--------------------------------------------------"
