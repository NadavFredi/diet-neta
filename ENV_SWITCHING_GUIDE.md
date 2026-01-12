# Environment Switching Guide

## Current Setup

You now have both local and production Supabase configurations in your `.env.local` file. Here's how to switch between them:

## Option 1: Comment/Uncomment (Simplest)

In your `.env.local` file, comment out the one you're NOT using:

### For Local Development:
```bash
# Supabase Configuration (LOCAL DEVELOPMENT)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Supabase Configuration (Cloud DEVELOPMENT) - COMMENTED OUT
# VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Production Testing:
```bash
# Supabase Configuration (LOCAL DEVELOPMENT) - COMMENTED OUT
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Configuration (Cloud DEVELOPMENT)
VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: After changing, restart your dev server (`npm run dev`)

## Option 2: Use Different Env Files (Recommended)

Create separate files and use Vite's mode system:

### Create `.env.local` (for local development):
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Create `.env.production.local` (for production testing):
```bash
VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-key>
```

Then run:
- Local: `npm run dev` (uses `.env.local`)
- Production: `npm run dev -- --mode production` (uses `.env.production.local`)

## Option 3: Add npm Scripts (Best for Quick Switching)

Add these to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:local": "vite --mode local",
    "dev:prod": "vite --mode production"
  }
}
```

Then create:
- `.env.local` - local config
- `.env.production.local` - production config

Run:
- `npm run dev:local` - for local
- `npm run dev:prod` - for production

## Current Issue

**Important**: Vite will use the LAST defined value in your `.env.local` file. So if you have both configs, make sure to comment out the one you're NOT using, or Vite will use whichever comes last in the file.

## Quick Check

To verify which Supabase instance you're connected to, check the browser console:
- Local: `http://127.0.0.1:54321`
- Production: `https://xghoqeayrtwgymfafrdm.supabase.co`

