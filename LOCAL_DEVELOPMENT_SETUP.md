# Local Development Setup - Edge Functions

## Important: Running Edge Functions Locally

For local development, you need to run Edge Functions separately so they can access API keys securely.

### Option 1: Run Edge Functions with Environment File (Recommended)

In a separate terminal, run:
```bash
npm run functions:local
```

This will start the Edge Functions server with access to your `.env.local` file (keys are NOT exposed to frontend).

### Option 2: Use Database for Credentials (Already Set Up)

The Green API credentials are already stored in the `green_api_settings` table in your local database. The Edge Functions will automatically use them as a fallback.

### Current Setup

✅ **Green API**: Credentials stored in database (safe - not exposed to frontend)
✅ **Fillout API**: Needs to be in `.env.local` (without VITE_ prefix) OR run with `--env-file`
✅ **Stripe API**: Needs to be in `.env.local` (without VITE_ prefix) OR run with `--env-file`

### Security Status

- ✅ No API keys are exposed to frontend
- ✅ All API calls go through Edge Functions
- ✅ Keys are only accessible server-side

### Troubleshooting

If you get "Green API configuration not found":
1. Make sure Edge Functions are running: `npm run functions:local`
2. OR ensure credentials are in the database (already done)
3. OR run Edge Functions with `--env-file .env.local`
