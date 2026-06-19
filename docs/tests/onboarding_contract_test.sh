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
echo "Starting Onboarding & Contract Management Test (CURL)"
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

# 2. Admin: Create Commodity
echo -n "2. Creating Commodity... "
COMM_TITLE="Onboarding-Comm-$(date +%s)"
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

# 3. Admin: Create Hub Manager & Hub
echo -n "3. Creating Hub Manager... "
HM_EMAIL="hm_onboard_$(date +%s)@example.com"
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
    \"ssn\": \"SSN-$(date +%s | cut -c 6-10)\",
    \"hire_date\": \"2026-04-26\"
  }")

HM_ID=$(echo "$HM_RESPONSE" | grep -oP '"id":\K[0-9]+' | head -n 1)

if [ -n "$HM_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $HM_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$HM_RESPONSE"
    exit 1
fi

echo -n "4. Creating Hub... "
HUB_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/hubs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"location\": \"Onboarding Test Hub\",
    \"size_sq_meters\": 1000,
    \"capacity\": 5000,
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

# 5. Admin: Create Supplier (Auto-creates Draft Contract)
echo -n "5. Creating Supplier... "
SUP_EMAIL="sup_onboard_$(date +%s)@example.com"
CREATE_SUP_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"fname\": \"John\",
    \"lname\": \"Supplier\",
    \"email\": \"$SUP_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"supplier\",
    \"company_name\": \"Onboarding Co\",
    \"commodity_id\": $COMM_ID
  }")

CONTRACT_ID=$(echo "$CREATE_SUP_RESPONSE" | grep -oP '"contract":\{[^}]*"id":\K[0-9]+')

if [ -n "$CONTRACT_ID" ]; then
    echo -e "${GREEN}SUCCESS (Contract ID: $CONTRACT_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$CREATE_SUP_RESPONSE"
    exit 1
fi

# 6. Admin: Update Contract Terms
echo -n "6. Updating Contract Terms... "
UPDATE_CONTRACT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/admin/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"payment_terms\": \"Net 30\",
    \"shipment_threshold_kg\": 1500,
    \"material_type\": \"High Grade Plastic\"
  }")

if echo "$UPDATE_CONTRACT_RESPONSE" | grep -q "Contract updated successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$UPDATE_CONTRACT_RESPONSE"
    exit 1
fi

# 7. Admin: Activate Contract
echo -n "7. Activating Contract... "
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/admin/contracts/$CONTRACT_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"status\": \"active\"
  }")

if echo "$ACTIVATE_RESPONSE" | grep -q "\"status\":\"active\""; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$ACTIVATE_RESPONSE"
    exit 1
fi

# 8. Admin: Schedule Pickup
echo -n "8. Scheduling Pickup... "
PICKUP_DATE=$(date -d "+1 day" +"%Y-%m-%dT09:00:00Z")
PICKUP_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/pickups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"contract_id\": $CONTRACT_ID,
    \"hub_id\": $HUB_ID,
    \"schedule_date\": \"$PICKUP_DATE\",
    \"estimated_weight\": 2500
  }")

if echo "$PICKUP_RESPONSE" | grep -q "Pickup scheduled successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$PICKUP_RESPONSE"
    exit 1
fi

# 9. Admin: List Pickups (Verification)
echo -n "9. Verifying Pickup List... "
LIST_PICKUPS=$(curl -s -X GET "$BASE_URL/admin/pickups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$LIST_PICKUPS" | grep -q "\"contract_id\":$CONTRACT_ID"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

echo "--------------------------------------------------"
echo "All Onboarding & Contract CURL tests passed!"
echo "--------------------------------------------------"
