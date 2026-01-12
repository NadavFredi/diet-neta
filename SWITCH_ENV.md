# Quick Environment Switching Guide

## ⚠️ Current Issue

You have **both** local and production configs in `.env.local`. Vite uses the **LAST** defined value, so it's currently using **production**.

## ✅ Solution: Comment/Uncomment Method

Edit your `.env.local` file and comment out the one you're NOT using:

### For Local Development (comment out production):
```bash
# Supabase Configuration (LOCAL DEVELOPMENT)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Supabase Configuration (Cloud DEVELOPMENT) - COMMENTED FOR LOCAL
# VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Production Testing (comment out local):
```bash
# Supabase Configuration (LOCAL DEVELOPMENT) - COMMENTED FOR PRODUCTION
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Configuration (Cloud DEVELOPMENT)
VITE_SUPABASE_URL=https://xghoqeayrtwgymfafrdm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaG9xZWF5cnR3Z3ltZmFmcmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjgxNjQsImV4cCI6MjA4MjUwNDE2NH0.O-IqKIo2VnDwZPTyHwp4khbrqN_5fWSfDLNSuG_xBos
```

## 🔄 After Changing

**Always restart your dev server** after changing environment variables:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ Verify Which Environment You're Using

Check the browser console network tab - you should see requests to:
- **Local**: `http://127.0.0.1:54321`
- **Production**: `https://xghoqeayrtwgymfafrdm.supabase.co`

## 📝 Quick Reference

| Environment | URL | When to Use |
|------------|-----|-------------|
| **Local** | `http://127.0.0.1:54321` | Daily development, testing features |
| **Production** | `https://xghoqeayrtwgymfafrdm.supabase.co` | Testing storage, file uploads, production features |

## 🎯 Right Now

Since you want to test file uploads with the production bucket, make sure production config is **uncommented** and local is **commented** in your `.env.local` file.

