# Fix: Invalid JWT Error

## Problem
You're getting "Invalid JWT" (401 Unauthorized) when trying to create a trainee user.

## Root Cause
Your session token is from **local Supabase** (`127.0.0.1:54321`), but you're now calling **production** (`https://xghoqeayrtwgymfafrdm.supabase.co`). The JWT tokens are not interchangeable between instances.

## Solution: Re-Login

You need to log out and log back in to get a fresh production session token:

1. **Log out** from the application
2. **Log back in** with your manager credentials
3. This will create a new session token for production
4. Try creating the trainee user again

## Why This Happens

- You were logged in when using local Supabase
- You switched `.env.local` to use production
- But your browser still has the old local session token
- Production Supabase rejects the local token

## After Re-Login

Once you log back in, you'll have a valid production session token and the function call will work.

## Quick Test

After logging back in, check the browser console - you should see:
```
[Supabase Client] Using: { url: 'https://xghoqeayrtwgymfafrdm.supabase.co', isCloud: true }
```

And when creating a trainee user, the JWT should be valid.

