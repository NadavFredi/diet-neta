-- =====================================================
-- Add 'payments' to saved_views resource_key constraint
-- Created: 2026-01-21
-- Description: Allow saved views for payments (Tashlumim)
-- =====================================================

-- Drop the existing constraint
ALTER TABLE saved_views DROP CONSTRAINT IF EXISTS saved_views_resource_key_check;

-- Add new constraint that includes 'payments'
ALTER TABLE saved_views 
  ADD CONSTRAINT saved_views_resource_key_check 
  CHECK (resource_key IN ('leads', 'workouts', 'customers', 'templates', 'nutrition_templates', 'budgets', 'meetings', 'check_in_settings', 'payments'));

-- =====================================================
-- Migration Complete
-- =====================================================
