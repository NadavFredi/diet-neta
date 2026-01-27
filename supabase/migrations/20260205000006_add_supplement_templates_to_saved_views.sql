-- =====================================================
-- Add supplement_templates to saved_views
-- Created: 2026-02-05
-- Description: Enable saved views for supplement templates interface
-- =====================================================

-- Drop the existing constraint
ALTER TABLE saved_views DROP CONSTRAINT IF EXISTS saved_views_resource_key_check;

-- Add new constraint that includes 'supplement_templates'
ALTER TABLE saved_views 
  ADD CONSTRAINT saved_views_resource_key_check 
  CHECK (resource_key IN ('leads', 'workouts', 'customers', 'templates', 'exercises', 'nutrition_templates', 'budgets', 'meetings', 'check_in_settings', 'payments', 'collections', 'subscription_types', 'whatsapp_automations', 'supplement_templates'));

-- Insert supplement_templates default view for all users
INSERT INTO public.saved_views (resource_key, view_name, filter_config, created_by, is_default, display_order)
SELECT 
    'supplement_templates' as resource_key,
    'כל התבניות' as view_name,
    '{}'::jsonb as filter_config,
    u.id as created_by,
    true as is_default,
    1 as display_order
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.saved_views sv
    WHERE sv.resource_key = 'supplement_templates' 
    AND sv.created_by = u.id 
    AND sv.is_default = true
);

-- =====================================================
-- Migration Complete
-- =====================================================
