# Debug Fillout Automation - Troubleshooting Guide

## Quick Debug Steps

### 1. Check if Webhook is Being Called

Watch the function logs in real-time:
```bash
supabase functions logs receive-fillout-webhook --follow
```

When you submit the form, you should see:
- `[receive-fillout-webhook] Function called`
- `[receive-fillout-webhook] ========== WEBHOOK RECEIVED ==========`

### 2. Check Form ID Matching

Look for this log entry:
```
[receive-fillout-webhook] Automation trigger check:
```

Check:
- `formId` - Should be `n5VwsjFk5ous`
- `openMeetingFormId` - Should be `n5VwsjFk5ous` (from env var or default)
- `shouldTriggerAutomation` - Should be `true`

### 3. Check Customer/Lead IDs

Look for:
```
[receive-fillout-webhook] ========== FINAL ID EXTRACTION ==========
```

**IMPORTANT**: The automation requires `customerId` to be present. It can come from:
- URL parameter `customer_id` in the form URL
- URL parameter `lead_id` (will fetch customer_id from lead)

### 4. Check Automation Trigger

Look for:
```
[receive-fillout-webhook] ========== AUTOMATION DECISION ==========
```

Should show:
- `shouldTriggerAutomation: true`
- `customerId: <some-uuid>`
- `✅ Automation will be triggered`

### 5. Check Automation Execution

Look for:
```
[receive-fillout-webhook] ========== STARTING AUTOMATION TRIGGER ==========
```

Then check for:
- `✅ Customer ID found`
- `✅ Customer fetched`
- `✅ Customer phone found`
- `✅ Template found`
- `✅ Successfully sent intro_questionnaire automation`

## Common Issues

### Issue 1: Form ID Not Matching

**Symptoms:**
- Log shows: `shouldTriggerAutomation: false`
- Log shows: `⚠️ Skipping automation - form is not open-meeting form`

**Solution:**
1. Check the `formId` in the webhook payload matches `n5VwsjFk5ous`
2. Verify environment variable is set:
   ```bash
   # In .env.local
   VITE_FILLOUT_FORM_ID_MEETING=n5VwsjFk5ous
   ```
3. Restart Supabase functions:
   ```bash
   # Stop current functions (Ctrl+C)
   npm run functions:local
   ```

### Issue 2: Missing Customer ID

**Symptoms:**
- Log shows: `❌ Skipping automation - no customer_id`
- `customerId: null` in logs

**Solution:**
1. **Add URL Parameters to Form**: When sharing the Fillout form, add these parameters:
   ```
   https://your-form.fillout.com?customer_id=CUSTOMER_UUID&lead_id=LEAD_UUID
   ```
   
2. **Or Extract from Form Data**: If customer info is in the form submission, we need to extract it. Check the webhook payload structure.

### Issue 3: Customer Has No Phone

**Symptoms:**
- Log shows: `❌ Skipping automation - customer has no phone number`

**Solution:**
1. Ensure the customer record has a phone number in the database
2. Check: `SELECT id, full_name, phone FROM customers WHERE id = 'CUSTOMER_ID';`

### Issue 4: Template Not Found

**Symptoms:**
- Log shows: `❌ No intro_questionnaire template found - skipping automation`

**Solution:**
1. Go to a lead/customer page in the app
2. Open "אוטומציית WhatsApp" card
3. Click settings icon next to "שליחת שאלון הכרות לאחר קביעת שיחה"
4. Edit and save the template (even if it's empty, just save it)
5. Check database:
   ```sql
   SELECT * FROM whatsapp_flow_templates WHERE flow_key = 'intro_questionnaire';
   ```

### Issue 5: Template Content Empty

**Symptoms:**
- Log shows: `❌ Template content is empty - skipping automation`

**Solution:**
1. Edit the template and add some content
2. Save the template
3. Verify: `SELECT template_content FROM whatsapp_flow_templates WHERE flow_key = 'intro_questionnaire';`

### Issue 6: Green API Error

**Symptoms:**
- Log shows: `❌ Error sending WhatsApp message`

**Solution:**
1. Check Green API credentials in `.env.local`:
   ```
   GREEN_API_ID_INSTANCE=your_id
   GREEN_API_TOKEN_INSTANCE=your_token
   ```
2. Verify credentials are correct
3. Test Green API connection separately

## Manual Test

You can manually test the automation by calling the webhook function directly:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/receive-fillout-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "n5VwsjFk5ous",
    "submissionId": "test-' $(date +%s) '",
    "urlParameters": [
      {
        "name": "customer_id",
        "value": "YOUR_CUSTOMER_ID_HERE"
      }
    ],
    "questions": []
  }'
```

Replace `YOUR_CUSTOMER_ID_HERE` with an actual customer ID from your database.

## Check Database

### Verify Meeting Was Created
```sql
SELECT 
  id, 
  fillout_submission_id, 
  customer_id, 
  lead_id, 
  created_at 
FROM meetings 
ORDER BY created_at DESC 
LIMIT 5;
```

### Verify Template Exists
```sql
SELECT 
  id, 
  flow_key, 
  template_content, 
  updated_at 
FROM whatsapp_flow_templates 
WHERE flow_key = 'intro_questionnaire';
```

### Verify Customer Has Phone
```sql
SELECT 
  id, 
  full_name, 
  phone, 
  email 
FROM customers 
WHERE id = 'YOUR_CUSTOMER_ID';
```

## Next Steps

1. **Check Logs First**: Always start by checking the function logs
2. **Verify Each Step**: Follow the automation flow step by step
3. **Check Database**: Verify data exists at each step
4. **Test Manually**: Use the curl command to test directly

## Still Not Working?

If automation still doesn't work after checking all above:

1. Share the function logs (especially the "AUTOMATION DECISION" and "AUTOMATION TRIGGER" sections)
2. Share the webhook payload structure (from Fillout)
3. Verify the form URL includes `customer_id` or `lead_id` parameters
