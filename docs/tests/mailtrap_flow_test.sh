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
echo "Starting Full Mailtrap Email Flow Test"
echo "--------------------------------------------------"

# 1. Auth: Login as SuperAdmin
echo -n "1. Testing Admin Login... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASS\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"\K[^"]+')

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# 2. Submit Application
EMAIL="test_$(date +%s)@example.com"
echo -n "2. Submitting Application... "
APP_RESPONSE=$(curl -s -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"idempotency_token\": \"UUID-$(date +%s)\",
    \"company_name\": \"Mailtrap Test Co\",
    \"contact_name\": \"Tester\",
    \"email\": \"$EMAIL\",
    \"phone\": \"1234567890\",
    \"role\": \"supplier\",
    \"tax_id\": \"TAX-$(date +%s)\"
  }")

if echo "$APP_RESPONSE" | grep -q "Your application has been submitted"; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# 3. Process Queued Mails
echo -n "3. Processing Queue... "
php artisan queue:work --once > /dev/null 2>&1
php artisan queue:work --once > /dev/null 2>&1
echo -e "${GREEN}DONE${NC}"

# 4. Verify in Logs (if using log driver) or just note
echo "4. Verification Note: If MAIL_MAILER=smtp, check your Mailtrap inbox for:"
echo "   - 'Verify Your Email — Waste-to-Value Platform'"
echo "   - 'New Verified Application — Action Required' (after verification)"
echo "--------------------------------------------------"
echo "Test Sequence Finished."
