-- =====================================================
-- Add period boolean field to leads table
-- Created: 2026-01-20
-- Description: Adds period field to personal information section
--              This is a boolean field to track menstrual period status
-- =====================================================

SET search_path TO public;

-- Add period column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS period BOOLEAN DEFAULT NULL;

-- Create index for period column
CREATE INDEX IF NOT EXISTS idx_leads_period ON public.leads(period) WHERE period IS NOT NULL;

-- Update the view to include period field
DROP VIEW IF EXISTS public.v_leads_with_customer CASCADE;

CREATE VIEW public.v_leads_with_customer AS
SELECT 
    l.id,
    l.created_at,
    l.updated_at,
    l.assigned_to,
    l.customer_id,
    l.city,
    l.birth_date,
    l.age,
    l.gender,
    l.period,
    l.status_main,
    l.status_sub,
    l.height,
    l.weight,
    l.bmi,
    l.join_date,
    l.subscription_data,
    l.daily_protocol,
    l.workout_history,
    l.steps_history,
    l.source,
    l.fitness_goal,
    l.activity_level,
    l.preferred_time,
    l.notes,
    -- Customer data (joined)
    c.full_name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    -- Calculated fields (PostgreSQL does the math)
    TO_CHAR(l.created_at, 'YYYY-MM-DD') as created_date_formatted,
    TO_CHAR(l.birth_date, 'YYYY-MM-DD') as birth_date_formatted,
    -- Extract JSONB fields (PostgreSQL parses JSON)
    (l.daily_protocol->>'stepsGoal')::INTEGER as daily_steps_goal,
    (l.daily_protocol->>'workoutGoal')::INTEGER as weekly_workouts,
    -- Extract supplements array from JSONB (handle both array and null)
    CASE 
        WHEN l.daily_protocol->'supplements' IS NULL THEN ARRAY[]::TEXT[]
        WHEN jsonb_typeof(l.daily_protocol->'supplements') = 'array' 
        THEN ARRAY(SELECT jsonb_array_elements_text(l.daily_protocol->'supplements'))
        ELSE ARRAY[]::TEXT[]
    END as daily_supplements,
    (l.subscription_data->>'months')::INTEGER as subscription_months,
    (l.subscription_data->>'initialPrice')::DECIMAL as subscription_initial_price,
    (l.subscription_data->>'renewalPrice')::DECIMAL as subscription_renewal_price
FROM public.leads l
LEFT JOIN public.customers c ON l.customer_id = c.id;

-- Grant permissions on the view
GRANT SELECT ON public.v_leads_with_customer TO authenticated;
GRANT SELECT ON public.v_leads_with_customer TO anon;
