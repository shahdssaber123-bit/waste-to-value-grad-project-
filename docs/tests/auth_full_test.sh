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
echo "Starting Full Auth & User Management Test v2 (CURL)"
echo "Note: MFA is currently deferred."
echo "--------------------------------------------------"

# 1. Auth: Login as SuperAdmin (Direct token expected)
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
    echo -e "${GREEN}SUCCESS (Bearer Token Received)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 2. Public: Submit Application Lead
IDEMPOTENCY=$(cat /proc/sys/kernel/random/uuid)
echo -n "2. Testing Public Application Lead Submission... "
APP_RESPONSE=$(curl -s -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"idempotency_token\": \"$IDEMPOTENCY\",
    \"company_name\": \"Lead Factory\",
    \"contact_name\": \"Lead Person\",
    \"email\": \"lead@factory.com\",
    \"phone\": \"1234567890\",
    \"role\": \"factory\",
    \"tax_id\": \"LEAD-TAX-001\",
    \"required_commodity\": \"Plastic\"
  }")

if echo "$APP_RESPONSE" | grep -q "Your application has been submitted"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$APP_RESPONSE"
    exit 1
fi

# 3. Admin: Create Employees (1 Driver, 1 Hub Manager)
echo -n "3.1 Testing Admin Create Driver... "
CREATE_DRIVER_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "fname": "Drive",
    "lname": "User",
    "email": "driver@test.com",
    "password": "password123",
    "phone": "5550001111",
    "role": "employee",
    "employee_role": "driver",
    "ssn": "SSN-DRV-001",
    "driver_license_number": "DL-DRV-001",
    "hire_date": "2026-04-20"
  }')

if echo "$CREATE_DRIVER_RESPONSE" | grep -q "User created successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$CREATE_DRIVER_RESPONSE"
    exit 1
fi

echo -n "3.2 Testing Admin Create Hub Manager... "
CREATE_HM_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "fname": "Manager",
    "lname": "User",
    "email": "manager@test.com",
    "password": "password123",
    "phone": "5550002222",
    "role": "employee",
    "employee_role": "hub_manager",
    "ssn": "SSN-HM-001",
    "hire_date": "2026-04-21"
  }')

if echo "$CREATE_HM_RESPONSE" | grep -q "User created successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$CREATE_HM_RESPONSE"
    exit 1
fi

# 4. Admin: Create Factory & Supplier
echo -n "4.1 Testing Admin Create Factory... "
CREATE_FAC_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "fname": "Factory",
    "lname": "Boss",
    "email": "factory@test.com",
    "password": "password123",
    "role": "factory",
    "company_name": "Major Factory",
    "tax_id": "TAX-FAC-V2-001",
    "commodity_id": 1
  }')

if echo "$CREATE_FAC_RESPONSE" | grep -q "User created successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$CREATE_FAC_RESPONSE"
    exit 1
fi

echo -n "4.2 Testing Admin Create Supplier... "
CREATE_SUP_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "fname": "Supplier",
    "lname": "Pro",
    "email": "supplier@test.com",
    "password": "password123",
    "role": "supplier",
    "company_name": "Expert Supplier",
    "commodity_id": 1
  }')

if echo "$CREATE_SUP_RESPONSE" | grep -q "User created successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$CREATE_SUP_RESPONSE"
    exit 1
fi

# 5. Admin: List All Users (Verification)
echo -n "5. Verifying Users in Database... "
LIST_USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$LIST_USERS_RESPONSE" | grep -q "driver@test.com" && \
   echo "$LIST_USERS_RESPONSE" | grep -q "manager@test.com" && \
   echo "$LIST_USERS_RESPONSE" | grep -q "factory@test.com" && \
   echo "$LIST_USERS_RESPONSE" | grep -q "supplier@test.com"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# 6. Auth: Logout
echo -n "6. Testing Admin Logout... "
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$LOGOUT_RESPONSE" | grep -q "Logged out successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

echo "--------------------------------------------------"
echo "All v2 CURL tests passed (MFA bypassed)!"
echo "--------------------------------------------------"
