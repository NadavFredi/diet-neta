#!/bin/bash

# Test Fillout Meeting Webhook for form n5VwsjFk5ous
# 
# Usage:
#   Local: ./test-meeting-webhook.sh
#   Production: ./test-meeting-webhook.sh production
#
# Make sure to replace:
#   - YOUR_LEAD_ID_HERE with an actual lead ID
#   - YOUR_CUSTOMER_ID_HERE with an actual customer ID

ENV=${1:-local}

if [ "$ENV" = "production" ]; then
  # Production URL - replace with your actual Supabase project URL
  WEBHOOK_URL="https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook"
else
  # Local development URL
  WEBHOOK_URL="http://127.0.0.1:54321/functions/v1/receive-fillout-webhook"
fi

# Generate a unique submission ID for testing
SUBMISSION_ID="meeting-test-$(date +%s)-$(openssl rand -hex 4)"

echo "Testing Fillout Meeting Webhook"
echo "==============================="
echo "URL: $WEBHOOK_URL"
echo "Form ID: n5VwsjFk5ous (Meeting Form)"
echo "Submission ID: $SUBMISSION_ID"
echo ""

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "n5VwsjFk5ous",
    "submissionId": "'"$SUBMISSION_ID"'",
    "submissionTime": "'"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"'",
    "lastUpdatedAt": "'"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"'",
    "formName": "open-meeting",
    "eventType": "formSubmission",
    "questions": [
      {
        "id": "name",
        "name": "name",
        "type": "ShortAnswer",
        "value": "Test User"
      },
      {
        "id": "phone",
        "name": "phone",
        "type": "PhoneNumber",
        "value": "972501234567"
      },
      {
        "id": "email",
        "name": "email",
        "type": "Email",
        "value": "test@example.com"
      },
      {
        "id": "meeting_date",
        "name": "meeting_date",
        "type": "Date",
        "value": "'"$(date -u +"%Y-%m-%d")"'"
      },
      {
        "id": "meeting_time",
        "name": "meeting_time",
        "type": "Time",
        "value": "14:00"
      },
      {
        "id": "סוג פגישה",
        "name": "סוג פגישה",
        "type": "ShortAnswer",
        "value": "פגישת הכרות"
      }
    ],
    "urlParameters": [
      {
        "name": "lead_id",
        "value": "YOUR_LEAD_ID_HERE"
      },
      {
        "name": "customer_id",
        "value": "YOUR_CUSTOMER_ID_HERE"
      }
    ]
  }'

echo ""
echo ""
echo "✅ Request sent!"
echo "📝 Check the function logs:"
echo "   supabase functions logs receive-fillout-webhook --follow"
echo ""
echo "📋 Check the database:"
echo "   SELECT * FROM meetings ORDER BY created_at DESC LIMIT 1;"
echo "   SELECT * FROM fillout_submissions WHERE fillout_form_id = '\''n5VwsjFk5ous'\'' ORDER BY created_at DESC LIMIT 1;"
