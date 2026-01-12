# Debugging Steps Plan Issue

## Problem
After adding a budget, no row appears in the Steps Log tab.

## Steps to Fix

### 1. Apply the Migration
The `steps_plans` table needs to be created. Run:

```bash
# Option 1: Reset database (applies all migrations)
supabase db reset --local

# Option 2: Apply just this migration (if Supabase CLI supports it)
supabase migration up
```

### 2. Check Browser Console
After assigning a budget, check the browser console for:
- `[useAssignBudgetToLead] Starting plan sync:` - Should show budget details
- `[syncPlansFromBudget] Creating steps plan:` - Should show steps goal
- `[syncPlansFromBudget] ✅ Steps plan created successfully:` - Should show the plan ID
- OR `[syncPlansFromBudget] steps_plans table does not exist!` - If migration not applied

### 3. Verify Table Exists
In Supabase Studio (http://localhost:54323), check if `steps_plans` table exists in the database.

### 4. Check Query
After assigning budget, the `usePlansHistory` hook should fetch from `steps_plans` table. Check console for:
- `[usePlansHistory] Plans fetched:` - Should show steps count > 0

### 5. Manual Test
If migration can't be applied automatically, you can manually create the table in Supabase Studio SQL Editor by running the migration SQL.

## Expected Behavior
When you assign a budget with `steps_goal > 0`:
1. A row should be created in `steps_plans` table
2. The row should appear in the Steps Log tab
3. The row should show the steps goal and date

## Current Fallback
If the table doesn't exist, the code falls back to updating `daily_protocol.stepsGoal` in the `customers` table, but this won't create a visible row in the Steps Log tab.




