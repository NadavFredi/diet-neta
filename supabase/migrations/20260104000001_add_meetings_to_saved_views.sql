-- =====================================================
-- Add 'meetings' to saved_views resource_key constraint
-- Created: 2026-01-04
-- Description: Allow saved views for meetings (Pegishot)
-- =====================================================

-- Drop the existing constraint
ALTER TABLE saved_views DROP CONSTRAINT IF EXISTS saved_views_resource_key_check;

-- Add new constraint that includes 'meetings'
ALTER TABLE saved_views 
  ADD CONSTRAINT saved_views_resource_key_check 
  CHECK (resource_key IN ('leads', 'workouts', 'customers', 'templates', 'nutrition_templates', 'budgets', 'meetings'));

-- =====================================================
-- Migration Complete
-- =====================================================

