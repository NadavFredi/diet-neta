# Fix Steps Plan Issue

## Problem
After adding a budget, no row appears in the Steps Log tab, and there's a database error.

## Solution

### Option 1: Apply Migration via Supabase Studio (Recommended)

1. Open Supabase Studio: http://localhost:54323
2. Go to "SQL Editor"
3. Copy and paste the entire contents of `supabase/migrations/20260104000007_create_steps_plans.sql`
4. Click "Run" to execute the SQL
5. Verify the table was created by checking the "Table Editor" - you should see `steps_plans` table

### Option 2: Restart Supabase and Apply Migration

```bash
# Stop Supabase
supabase stop

# Start Supabase (this should apply migrations)
supabase start

# If that doesn't work, try:
supabase db reset --local
```

### After Applying Migration

1. **Assign a budget** to a client (make sure it has `steps_goal > 0`)
2. **Check browser console** - you should see:
   - `[syncPlansFromBudget] Creating steps plan:`
   - `[syncPlansFromBudget] ✅ Steps plan created successfully:`
3. **Refresh the page**
4. **Go to Steps Log tab** - you should see a row with the steps goal

### Verify It's Working

In Supabase Studio:
1. Go to "Table Editor"
2. Select `steps_plans` table
3. You should see rows with `budget_id`, `steps_goal`, `customer_id`, etc.

### If Still Not Working

Check browser console for:
- Any errors mentioning `steps_plans`
- The sync logs showing what happened
- Whether the table exists error appears


