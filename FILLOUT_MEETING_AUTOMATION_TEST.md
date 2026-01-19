# Fillout Meeting Automation - Testing Guide

## Overview

When a new meeting is created through the Fillout form (`n5VwsjFk5ous`), the system automatically sends a WhatsApp message using the `intro_questionnaire` template.

## How It Works

1. **Fillout Form Submission**: When someone submits the meeting form (`n5VwsjFk5ous`)
2. **Webhook Trigger**: Fillout sends a webhook to `receive-fillout-webhook` Edge Function
3. **Meeting Creation**: The webhook creates a new meeting record in the database
4. **Automation Trigger**: If the form ID matches, the `intro_questionnaire` automation is triggered automatically
5. **Message Sent**: The WhatsApp message is sent to the customer's phone number

## Local Development Setup

### 1. Set Environment Variables

Add to `.env.local`:

```env
VITE_FILLOUT_FORM_ID_MEETING=n5VwsjFk5ous
FILLOUT_FORM_ID_MEETING=n5VwsjFk5ous
GREEN_API_ID_INSTANCE=your_id_instance
GREEN_API_TOKEN_INSTANCE=your_token_instance
```

### 2. Start Supabase Functions

```bash
# Start local Supabase functions with environment variables
npm run functions:local

# Or directly:
supabase functions serve --env-file .env.local
```

This will start the Edge Functions on `http://127.0.0.1:54321/functions/v1/`

### 3. Set Up Webhook URL in Fillout

**For Local Testing (using ngrok or similar):**

1. Install and start ngrok:

```bash
ngrok http 54321
```

2. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

3. In Fillout dashboard:
   - Go to your form settings
   - Set Webhook URL to: `https://abc123.ngrok.io/functions/v1/receive-fillout-webhook`
   - Save

**Alternative - Use Supabase Local URL:**

- If you're testing from the same network, you can use: `http://YOUR_LOCAL_IP:54321/functions/v1/receive-fillout-webhook`
- Note: Fillout requires HTTPS, so ngrok is recommended

### 4. Ensure Template Exists

Make sure you have an `intro_questionnaire` template configured:

1. Go to a lead/customer page
2. Open the "אוטומציית WhatsApp" card
3. Click the settings icon next to "שליחת שאלון הכרות לאחר קביעת שיחה"
4. Edit and save the template

The template should be saved in the `whatsapp_flow_templates` table with `flow_key = 'intro_questionnaire'`.

### 5. Test the Automation

1. **Submit Test Form**: Go to your Fillout form and submit it with:

   - Customer phone number (required for WhatsApp)
   - Any other required fields
   - **Important**: Include `lead_id` or `customer_id` as a URL parameter in the form URL:
     ```
     https://your-form.fillout.com?lead_id=LEAD_ID_HERE&customer_id=CUSTOMER_ID_HERE
     ```

2. **Check Logs**: Watch the function logs for automation trigger:

```bash
# In another terminal, watch the logs
supabase functions logs receive-fillout-webhook --follow
```

You should see:

- `[receive-fillout-webhook] Meeting created successfully`
- `[receive-fillout-webhook] ========== STARTING AUTOMATION TRIGGER ==========`
- `[receive-fillout-webhook] ✅ Successfully sent intro_questionnaire automation`

3. **Check Database**: Verify the meeting was created:

```sql
SELECT * FROM meetings ORDER BY created_at DESC LIMIT 1;
```

4. **Check WhatsApp**: The customer should receive the automated message

## Troubleshooting

### Automation Not Triggering

1. **Check Form ID**: Verify the webhook receives the correct form ID:

   - Check logs: `[receive-fillout-webhook] Automation trigger check:`
   - Ensure `formId` matches `n5VwsjFk5ous`

2. **Check Environment Variable**:

   - Ensure `VITE_FILLOUT_FORM_ID_MEETING` is set in `.env.local`
   - Restart Supabase functions after changing env vars

3. **Check Customer Data**:
   - Ensure `customer_id` or `lead_id` is in the webhook payload
   - Customer must have a phone number

### Message Not Sending

1. **Check Template**:

   - Ensure `intro_questionnaire` template exists and has content
   - Check `whatsapp_flow_templates` table

2. **Check Green API Credentials**:

   - Verify `GREEN_API_ID_INSTANCE` and `GREEN_API_TOKEN_INSTANCE` are set
   - Test Green API connection separately

3. **Check Logs**: Look for errors in the automation trigger section:
   - `[receive-fillout-webhook] ❌` indicates an error
   - `[receive-fillout-webhook] ✅` indicates success

### Webhook Not Receiving Data

1. **Check Webhook URL**: Ensure Fillout is sending to the correct URL
2. **Check ngrok**: If using ngrok, ensure the tunnel is active
3. **Check CORS**: The function handles CORS, but verify Fillout can reach it
4. **Test Webhook**: Send a test webhook from Fillout dashboard

## Manual Testing (Without Fillout)

You can test the webhook manually using curl:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/receive-fillout-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "n5VwsjFk5ous",
    "submissionId": "test-submission-' $(date +%s) '",
    "questions": [
      {
        "name": "phone",
        "value": "972501234567"
      }
    ],
    "urlParameters": [
      {
        "name": "customer_id",
        "value": "YOUR_CUSTOMER_ID_HERE"
      },
      {
        "name": "lead_id",
        "value": "YOUR_LEAD_ID_HERE"
      }
    ]
  }'
```

Replace `YOUR_CUSTOMER_ID_HERE` and `YOUR_LEAD_ID_HERE` with actual IDs from your database.

## Production Deployment

1. **Deploy Function**:

```bash
supabase functions deploy receive-fillout-webhook
```

2. **Set Environment Variables in Supabase Dashboard**:

   - Go to Project Settings → Edge Functions → Environment Variables
   - Set `VITE_FILLOUT_FORM_ID_MEETING=n5VwsjFk5ous`
   - Set `GREEN_API_ID_INSTANCE` and `GREEN_API_TOKEN_INSTANCE`

3. **Update Webhook URL in Fillout**:
   - Change webhook URL to: `https://YOUR_PROJECT.supabase.co/functions/v1/receive-fillout-webhook`

## Automation Flow Details

The automation:

- ✅ Runs **asynchronously** (doesn't block webhook response)
- ✅ Only triggers for form ID `n5VwsjFk5ous` (or configured form ID)
- ✅ Requires customer phone number
- ✅ Uses the `intro_questionnaire` template from database
- ✅ Replaces placeholders ({{name}}, {{phone}}, etc.)
- ✅ Supports interactive buttons if configured in template
- ✅ Handles both regular messages and button messages

## Next Steps

- Monitor logs for successful automation triggers
- Adjust template content as needed in the UI
- Test with real form submissions to verify end-to-end flow
