# Fix Fillout Webhook URL Error

## Problem
You're getting an error when trying to make an appointment in production:
- **Error**: "Invalid webhook URL"
- **Form**: פגישת הכרות (Introductory Meeting)
- **Step**: Confirmation

## Solution

The webhook URL in your Fillout form needs to be updated to the correct production URL.

### Correct Production Webhook URL

```
https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook
```

## Steps to Fix in Fillout

1. **Log in to Fillout Dashboard**
   - Go to https://build.fillout.com
   - Navigate to your form: "פגישת הכרות" (form ID: `n5VwsjFk5ous`)

2. **Open Form Settings**
   - Click on your form
   - Go to **Settings** or **Integrations** tab
   - Look for **Webhooks** section

3. **Update Webhook URL**
   - Find the webhook configuration for the "Confirmation" step
   - Replace the current webhook URL with:
     ```
     https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook
     ```
   - Make sure there are no trailing slashes or extra characters
   - Save the changes

4. **Verify Webhook Configuration**
   - Check that the webhook is enabled
   - Ensure it's set to trigger on form submission
   - Verify the HTTP method is set to POST (if applicable)

5. **Test the Webhook**
   - Submit a test form submission
   - Check that the webhook is called successfully
   - Verify the meeting is created in your database

## Alternative: Check Form Steps Configuration

If the webhook is configured at the step level:

1. **Open Form Editor**
   - Go to your form in Fillout
   - Click **Edit**

2. **Find the Confirmation Step**
   - Navigate to the "Confirmation" step
   - Look for webhook or integration settings

3. **Update Webhook URL**
   - Set the webhook URL to:
     ```
     https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook
     ```

## Verify Webhook is Working

After updating the URL, test it:

```bash
# Test the webhook endpoint
curl -X POST "https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "n5VwsjFk5ous",
    "submissionId": "test-123",
    "formName": "open-meeting"
  }'
```

You should receive a response indicating the webhook is working.

## Common Issues

### Issue 1: URL has trailing slash
**Wrong**: `https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook/`  
**Correct**: `https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook`

### Issue 2: Using localhost URL
**Wrong**: `http://127.0.0.1:54321/functions/v1/receive-fillout-webhook`  
**Correct**: `https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook`

### Issue 3: Wrong project reference
Make sure you're using the correct project reference: `uklxejsaenqoxujcjkba`

## Check Function Deployment

To verify the function is deployed:

```bash
# Check if function is accessible
curl -X GET "https://uklxejsaenqoxujcjkba.supabase.co/functions/v1/receive-fillout-webhook"

# Should return: "Webhook endpoint is active"
```

## Next Steps

1. Update the webhook URL in Fillout
2. Test with a form submission
3. Check the Supabase function logs to verify webhooks are being received:
   ```bash
   supabase functions logs receive-fillout-webhook --project-ref uklxejsaenqoxujcjkba
   ```

## Support

If the issue persists after updating the URL:
1. Check Fillout's webhook logs/errors
2. Verify the function is deployed: `supabase functions list --project-ref uklxejsaenqoxujcjkba`
3. Check Supabase function logs for any errors
4. Ensure the function has the correct environment variables set
