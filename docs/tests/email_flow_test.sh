#!/bin/bash

# Configuration
BASE_URL="http://localhost:8000/api/v1"
EMAIL="test_$(date +%s)@example.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "--------------------------------------------------"
echo "Starting Application Email Flow Test"
echo "--------------------------------------------------"

# 1. Submit Application
echo -n "1. Submitting Application... "
APP_RESPONSE=$(curl -s -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"idempotency_token\": \"UUID-$(date +%s)\",
    \"company_name\": \"Email Test Co\",
    \"contact_name\": \"Email Tester\",
    \"email\": \"$EMAIL\",
    \"phone\": \"1234567890\",
    \"role\": \"supplier\",
    \"tax_id\": \"TAX-$(date +%s)\"
  }")

if echo "$APP_RESPONSE" | grep -q "Your application has been submitted"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$APP_RESPONSE"
    exit 1
fi

# 2. Check Queue for Verification Mail
echo -n "2. Checking Queue for Verification Mail... "
JOB_COUNT=$(php artisan tinker --execute "echo DB::table('jobs')->where('payload', 'like', '%ApplicationVerificationMail%')->count();")
if [ "$JOB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS ($JOB_COUNT job found)${NC}"
else
    echo -e "${RED}FAILED (No job found in queue)${NC}"
    exit 1
fi

# 3. Retrieve Token (Dev Route)
echo -n "3. Retrieving Verification Token... "
TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/dev/application-token/$EMAIL" \
  -H "Accept: application/json")

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -oP '"email_verification_token":"\K[^"]+')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}SUCCESS (Token: ${TOKEN:0:10}...)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$TOKEN_RESPONSE"
    exit 1
fi

# 4. Verify Email
echo -n "4. Verifying Email... "
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/applications/verify-email/$TOKEN" \
  -H "Accept: application/json")

if echo "$VERIFY_RESPONSE" | grep -q "Email verified successfully"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "$VERIFY_RESPONSE"
    exit 1
fi

# 5. Check Queue for Admin Notification
echo -n "5. Checking Queue for Admin Notification... "
ADMIN_JOB_COUNT=$(php artisan tinker --execute "echo DB::table('jobs')->where('payload', 'like', '%AdminNewApplicationMail%')->count();")
if [ "$ADMIN_JOB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS ($ADMIN_JOB_COUNT job found)${NC}"
else
    echo -e "${RED}FAILED (No admin job found in queue)${NC}"
    exit 1
fi

# 6. Process Queue
echo -n "6. Processing Queue... "
php artisan queue:work --once > /dev/null 2>&1
php artisan queue:work --once > /dev/null 2>&1
echo -e "${GREEN}DONE${NC}"

# 7. Check Logs
echo -n "7. Verifying Logs for Sent Emails... "
if tail -n 500 storage/logs/laravel.log | grep -q "Verify Your Email" && \
   tail -n 500 storage/logs/laravel.log | grep -q "New Verified Application"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED (Emails not found in logs)${NC}"
    exit 1
fi

echo "--------------------------------------------------"
echo "Application Email Flow Test Passed!"
echo "--------------------------------------------------"
