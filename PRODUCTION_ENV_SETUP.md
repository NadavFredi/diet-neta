# Production Environment Setup

## Current Issue
Your app is pointing to local Supabase (`127.0.0.1:54321`) instead of production. You need to update your environment variables.

## Production Supabase Credentials

Your production project:
- **Project Ref**: `xghoqeayrtwgymfafrdm`
- **Project URL**: `https://xghoqeayrtwgymfafrdm.supabase.co`

## Steps to Switch to Production

### Option 1: Update .env.local (Recommended for Testing)

1. **Get your production anon key** from Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api
   - Copy the **anon/public** key from the "Project API keys" section

2. **Update your `.env.local` file**:

```bash
# Supabase Configuration (PRODUCTION)
VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-anon-key-here>
```

3. **Restart your dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

### Option 2: Create .env.production.local

Create a separate file for production testing:

```bash
# .env.production.local
VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-anon-key-here>
```

Then run:
```bash
npm run dev -- --mode production
```

## Quick Access Links

- **Dashboard**: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm
- **API Settings**: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api
- **Storage**: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/storage/buckets

## After Updating

1. ✅ Restart your dev server
2. ✅ Test file upload in notes
3. ✅ Test progress photo upload
4. ✅ Verify files appear in Supabase Storage dashboard

## Switching Back to Local

When you want to switch back to local development, just change back to:
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

