-- =====================================================
-- Migration: Add Filter Support Views
-- Created: 2026-01-24
-- Description: Add server-side helper views for table filters
-- =====================================================

-- Customers with lead counts (total_leads)
DROP VIEW IF EXISTS public.customers_with_lead_counts;
CREATE VIEW public.customers_with_lead_counts AS
SELECT
  c.*,
  COALESCE(l.lead_count, 0) AS total_leads
FROM public.customers c
LEFT JOIN (
  SELECT customer_id, COUNT(*)::INT AS lead_count
  FROM public.leads
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) l ON l.customer_id = c.id;

GRANT SELECT ON public.customers_with_lead_counts TO authenticated;
GRANT SELECT ON public.customers_with_lead_counts TO anon;

COMMENT ON VIEW public.customers_with_lead_counts IS 'Customers with total lead counts for filtering and sorting.';

-- Workout templates with has_leads flag
DROP VIEW IF EXISTS public.workout_templates_with_leads;
CREATE VIEW public.workout_templates_with_leads AS
SELECT
  t.*,
  EXISTS (
    SELECT 1
    FROM public.workout_plans wp
    WHERE wp.template_id = t.id
      AND wp.lead_id IS NOT NULL
  ) AS has_leads
FROM public.workout_templates t;

GRANT SELECT ON public.workout_templates_with_leads TO authenticated;
GRANT SELECT ON public.workout_templates_with_leads TO anon;

COMMENT ON VIEW public.workout_templates_with_leads IS 'Workout templates with has_leads flag for filtering.';

-- Nutrition templates with numeric ranges
DROP VIEW IF EXISTS public.nutrition_templates_with_ranges;
CREATE VIEW public.nutrition_templates_with_ranges AS
SELECT
  t.*,
  (t.targets->>'calories')::NUMERIC AS calories_value,
  (t.targets->>'protein')::NUMERIC AS protein_value
FROM public.nutrition_templates t;

GRANT SELECT ON public.nutrition_templates_with_ranges TO authenticated;
GRANT SELECT ON public.nutrition_templates_with_ranges TO anon;

COMMENT ON VIEW public.nutrition_templates_with_ranges IS 'Nutrition templates with numeric calories/protein values for filtering.';

-- =====================================================
-- Migration Complete
-- =====================================================
