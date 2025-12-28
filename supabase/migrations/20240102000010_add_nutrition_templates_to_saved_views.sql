-- =====================================================
-- Add 'nutrition_templates' to saved_views resource_key constraint
-- Created: 2024-01-02
-- Description: Allow saved views for nutrition templates
-- =====================================================

-- Drop the existing constraint
ALTER TABLE saved_views DROP CONSTRAINT IF EXISTS saved_views_resource_key_check;

-- Add new constraint that includes 'nutrition_templates'
ALTER TABLE saved_views 
  ADD CONSTRAINT saved_views_resource_key_check 
  CHECK (resource_key IN ('leads', 'workouts', 'customers', 'templates', 'nutrition_templates'));

-- =====================================================
-- Migration Complete
-- =====================================================


