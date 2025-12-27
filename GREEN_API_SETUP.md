# Green API Setup Guide

## Overview

The WhatsApp messaging feature uses Green API to send messages. To avoid CORS issues, requests are proxied through a Supabase Edge Function.

## Setup Instructions

### 1. Get Your Green API Credentials

1. Sign up at [Green API](https://green-api.com/)
2. Create an instance and get your credentials:
   - `idInstance` - Your instance ID
   - `apiTokenInstance` - Your API token

### 2. Configure for Local Development

For local development, you need to set the credentials as Supabase secrets:

```bash
# Set the secrets (replace with your actual values)
supabase secrets set GREEN_API_ID_INSTANCE=your_actual_instance_id --env-file .env.local
supabase secrets set GREEN_API_TOKEN_INSTANCE=your_actual_token --env-file .env.local
```

Alternatively, you can add them directly to your `.env.local` file:

```env
GREEN_API_ID_INSTANCE=your_actual_instance_id
GREEN_API_TOKEN_INSTANCE=your_actual_token
```

**Important:** Make sure to replace `your_actual_instance_id` and `your_actual_token` with your real credentials from Green API.

### 3. Start Supabase Functions

Make sure Supabase Edge Functions are running locally:

```bash
npm run functions:local
```

Or if you're running Supabase locally:

```bash
supabase functions serve
```

### 4. Restart Your Dev Server

After setting the secrets, restart your Vite dev server:

```bash
npm run dev
```

## How It Works

1. Frontend calls `sendWhatsAppMessage()` from `greenApiService.ts`
2. The service calls the Supabase Edge Function `send-whatsapp-message`
3. The Edge Function makes the actual API call to Green API (server-side, no CORS issues)
4. The response is returned to the frontend

## Troubleshooting

### Error: "Green API configuration not found"

- Make sure you've set the Supabase secrets (see step 2 above)
- Verify the secrets are loaded: `supabase secrets list`
- Restart your Supabase functions: `npm run functions:local`

### Error: "CORS policy" or "Failed to fetch"

- This should be resolved by using the Edge Function proxy
- Make sure the Edge Function is running: `npm run functions:local`
- Check that the function is enabled in `supabase/config.toml`

### Error: "Unauthorized"

- Make sure you're logged in to the application
- The Edge Function requires authentication

## Production Deployment

For production, set the secrets in your Supabase project:

```bash
supabase secrets set GREEN_API_ID_INSTANCE=your_actual_instance_id --project-ref your-project-ref
supabase secrets set GREEN_API_TOKEN_INSTANCE=your_actual_token --project-ref your-project-ref
```

Then deploy the Edge Function:

```bash
supabase functions deploy send-whatsapp-message --project-ref your-project-ref
```

