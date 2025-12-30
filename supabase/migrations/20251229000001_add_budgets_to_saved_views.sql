-- =====================================================
-- Add 'budgets' to saved_views resource_key constraint
-- Created: 2025-12-29
-- Description: Allow saved views for budgets (Taktziv)
-- =====================================================

-- Drop the existing constraint
ALTER TABLE saved_views DROP CONSTRAINT IF EXISTS saved_views_resource_key_check;

-- Add new constraint that includes 'budgets'
ALTER TABLE saved_views 
  ADD CONSTRAINT saved_views_resource_key_check 
  CHECK (resource_key IN ('leads', 'workouts', 'customers', 'templates', 'nutrition_templates', 'budgets'));

-- =====================================================
-- Migration Complete
-- =====================================================



