# Debugging Automation Trigger Issue

## Problem
The automation is not triggering when a form is submitted at `https://dietneta.fillout.com/-open-meeting?lead_id=...`

## Steps to Debug

### 1. Check Webhook Logs
After submitting the form, check the Supabase Edge Function logs:
```bash
# If running locally
supabase functions logs receive-fillout-webhook

# Or check in Supabase Dashboard > Edge Functions > receive-fillout-webhook > Logs
```

Look for these log entries:
- `[receive-fillout-webhook] Function called:` - Confirms webhook was received
- `[receive-fillout-webhook] Automation trigger check:` - Shows form ID matching
- `[receive-fillout-webhook] Skipping automation -` - Shows why automation didn't trigger

### 2. Set Environment Variable
The form ID needs to be set in the environment. Add to `.env.local`:
```env
VITE_FILLOUT_FORM_ID_MEETING=your_actual_form_id_here
```

To find the form ID:
1. Go to Fillout form editor
2. Check the URL - it will be like `build.fillout.com/editor/n5VwsjFk5ous`
3. The form ID is the part after `/editor/` (e.g., `n5VwsjFk5ous`)

### 3. Restart Supabase Functions
After setting the environment variable:
```bash
# Stop the functions
# Then restart with:
supabase functions serve receive-fillout-webhook --env-file .env.local
```

### 4. Check What Fillout Sends
The webhook handler now logs the full body. Check logs for:
- `formId` - The actual form ID Fillout sends
- `formName` - The form name (should contain "open-meeting")
- `submissionId` - The submission ID

### 5. Verify Customer/Lead Data
The automation needs:
- `customer_id` - Extracted from `lead_id` in URL parameters
- Customer must have a `phone` number
- Template must exist for `intro_questionnaire` flow

### 6. Fallback Detection
The code now has a fallback that checks if `formName` contains "open-meeting" even if the form ID doesn't match. This should work even without the environment variable set.

## Common Issues

1. **Environment variable not set**: Automation won't trigger
2. **Form ID mismatch**: Fillout sends different form ID than expected
3. **No customer_id**: Lead ID not found in URL parameters
4. **No phone number**: Customer record missing phone
5. **No template**: `intro_questionnaire` template not created yet
6. **Webhook not configured**: Fillout webhook not pointing to your Supabase function

## Testing

1. Submit the form at: `https://dietneta.fillout.com/-open-meeting?lead_id=8541a0dd-7fc9-412b-a965-dd6295b67bd0`
2. Check webhook logs immediately
3. Verify automation was triggered or see why it was skipped

