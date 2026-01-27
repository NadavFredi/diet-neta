-- =====================================================
-- Update Budgets View Name Migration
-- Created: 2026-02-11
-- Description: Update saved view names from "כל התקציבים" to "כל תכניות הפעולה" for budgets resource
-- =====================================================

-- Update all saved views for budgets resource that have the old name
UPDATE saved_views
SET view_name = 'כל תכניות הפעולה'
WHERE resource_key = 'budgets'
  AND view_name = 'כל התקציבים';

-- Comments
COMMENT ON TABLE saved_views IS 'User-defined saved views/filters for different resources. Updated budget view names from "כל התקציבים" to "כל תכניות הפעולה".';

-- =====================================================
-- Migration Complete
-- =====================================================
