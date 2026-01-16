-- =====================================================
-- Add age column alongside birth_date
-- Created: 2026-01-16
-- Description: Adds age column to leads table while keeping birth_date
--              Age can be manually entered, independent of birth_date
-- =====================================================

SET search_path TO public;

-- Step 1: Add age column to leads table (keep birth_date)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Step 2: Create index for age column
CREATE INDEX IF NOT EXISTS idx_leads_age ON public.leads(age) WHERE age IS NOT NULL;

-- Step 3: Drop and recreate the view to include both birth_date and age
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

-- Step 7: Update get_filtered_leads function to use age instead of birth_date
CREATE OR REPLACE FUNCTION public.get_filtered_leads(
    p_limit_count INTEGER DEFAULT 100,
    p_offset_count INTEGER DEFAULT 0,
    p_search_query TEXT DEFAULT NULL,
    p_status_main TEXT DEFAULT NULL,
    p_status_sub TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL,
    p_fitness_goal TEXT DEFAULT NULL,
    p_activity_level TEXT DEFAULT NULL,
    p_preferred_time TEXT DEFAULT NULL,
    p_age TEXT DEFAULT NULL,
    p_height TEXT DEFAULT NULL,
    p_weight TEXT DEFAULT NULL,
    p_date TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID,
    customer_id UUID,
    city TEXT,
    birth_date DATE,
    age INTEGER,
    gender TEXT,
    status_main TEXT,
    status_sub TEXT,
    height DECIMAL,
    weight DECIMAL,
    bmi DECIMAL,
    join_date TIMESTAMP WITH TIME ZONE,
    subscription_data JSONB,
    daily_protocol JSONB,
    workout_history JSONB,
    steps_history JSONB,
    source TEXT,
    fitness_goal TEXT,
    activity_level TEXT,
    preferred_time TEXT,
    notes TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    created_date_formatted TEXT,
    birth_date_formatted TEXT,
    daily_steps_goal INTEGER,
    weekly_workouts INTEGER,
    daily_supplements TEXT[],
    subscription_months INTEGER,
    subscription_initial_price DECIMAL,
    subscription_renewal_price DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.created_at,
        v.updated_at,
        v.assigned_to,
        v.customer_id,
        v.city,
        v.birth_date,
        v.age,
        v.gender,
        v.status_main,
        v.status_sub,
        v.height,
        v.weight,
        v.bmi,
        v.join_date,
        v.subscription_data,
        v.daily_protocol,
        v.workout_history,
        v.steps_history,
        v.source,
        v.fitness_goal,
        v.activity_level,
        v.preferred_time,
        v.notes,
        v.customer_name,
        v.customer_phone,
        v.customer_email,
        v.created_date_formatted,
        v.birth_date_formatted,
        v.daily_steps_goal,
        v.weekly_workouts,
        v.daily_supplements,
        v.subscription_months,
        v.subscription_initial_price,
        v.subscription_renewal_price
    FROM public.v_leads_with_customer v
    WHERE 
        -- Search query (name, phone, email)
        (p_search_query IS NULL OR 
         v.customer_name ILIKE '%' || p_search_query || '%' OR
         v.customer_phone ILIKE '%' || p_search_query || '%' OR
         v.customer_email ILIKE '%' || p_search_query || '%')
        -- Status filter
        AND (p_status_main IS NULL OR v.status_main = p_status_main)
        AND (p_status_sub IS NULL OR v.status_sub = p_status_sub)
        -- Source filter
        AND (p_source IS NULL OR v.source = p_source)
        -- Fitness goal filter
        AND (p_fitness_goal IS NULL OR v.fitness_goal = p_fitness_goal)
        -- Activity level filter
        AND (p_activity_level IS NULL OR v.activity_level = p_activity_level)
        -- Preferred time filter
        AND (p_preferred_time IS NULL OR v.preferred_time = p_preferred_time)
        -- Age filter (now using age column directly)
        AND (p_age IS NULL OR v.age::TEXT = p_age)
        -- Height filter
        AND (p_height IS NULL OR v.height::TEXT = p_height)
        -- Weight filter
        AND (p_weight IS NULL OR v.weight::TEXT = p_weight)
        -- Date filter (created_at date)
        AND (p_date IS NULL OR v.created_date_formatted = p_date)
    ORDER BY v.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Step 8: Update get_lead_filter_options function to use age column
CREATE OR REPLACE FUNCTION public.get_lead_filter_options()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'statuses', ARRAY(SELECT DISTINCT status_main FROM public.leads WHERE status_main IS NOT NULL ORDER BY status_main)::TEXT[],
        'sources', ARRAY(SELECT DISTINCT source FROM public.leads WHERE source IS NOT NULL ORDER BY source)::TEXT[],
        'fitness_goals', ARRAY(SELECT DISTINCT fitness_goal FROM public.leads WHERE fitness_goal IS NOT NULL ORDER BY fitness_goal)::TEXT[],
        'activity_levels', ARRAY(SELECT DISTINCT activity_level FROM public.leads WHERE activity_level IS NOT NULL ORDER BY activity_level)::TEXT[],
        'preferred_times', ARRAY(SELECT DISTINCT preferred_time FROM public.leads WHERE preferred_time IS NOT NULL ORDER BY preferred_time)::TEXT[],
        'ages', ARRAY(SELECT DISTINCT age::TEXT 
                      FROM public.leads 
                      WHERE age IS NOT NULL 
                      ORDER BY age)::TEXT[],
        'heights', ARRAY(SELECT DISTINCT height::TEXT 
                         FROM public.leads 
                         WHERE height IS NOT NULL 
                         ORDER BY height)::TEXT[],
        'weights', ARRAY(SELECT DISTINCT weight::TEXT 
                         FROM public.leads 
                         WHERE weight IS NOT NULL 
                         ORDER BY weight)::TEXT[]
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Step 9: Update comments
COMMENT ON COLUMN public.leads.age IS 'Age in years. Can be manually entered, independent of birth_date.';
COMMENT ON COLUMN public.leads.birth_date IS 'Birth date. Can be entered manually, independent of age.';
COMMENT ON VIEW public.v_leads_with_customer IS 'Pre-joined view of leads with customer data and calculated fields. Includes both birth_date and age columns.';
COMMENT ON FUNCTION public.get_filtered_leads(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'RPC function for complex lead filtering. All filtering happens in PostgreSQL. Includes both birth_date and age columns.';
COMMENT ON FUNCTION public.get_lead_filter_options() IS 'Returns distinct filter values for dropdowns. Uses age column directly.';




