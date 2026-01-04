# How to Get Your Production Service Role Key

## Step 1: Get the Service Role Key

1. Go to your Supabase Dashboard:
   https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api

2. Scroll down to "Project API keys" section

3. Find the **"service_role"** key (NOT the anon key)
   - It will say "service_role" in the name
   - ⚠️ **WARNING**: This key has admin privileges - keep it secret!

4. Copy the key

## Step 2: Run the Script

### Option A: Set as environment variable (Recommended)
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here node scripts/create_trainee_user_production.js
```

### Option B: Update the script directly
Edit `scripts/create_trainee_user_production.js` and replace:
```javascript
const PRODUCTION_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';
```
with your actual key.

## Step 3: Run the Script
```bash
node scripts/create_trainee_user_production.js
```

The script will output the login credentials for the new trainee user.
