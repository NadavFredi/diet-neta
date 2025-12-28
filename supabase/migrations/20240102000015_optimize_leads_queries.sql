-- =====================================================
-- Performance Optimization: Shift Left Strategy
-- Created: 2024-01-02
-- Description: Move filtering, calculations, and aggregations to PostgreSQL
--              Replace client-side JS logic with database functions
-- Philosophy: Database does the heavy lifting, frontend stays light
-- =====================================================

-- =====================================================
-- STEP 1: Create Optimized Indexes (Strategic, not over-indexing)
-- =====================================================

-- Indexes for filtering columns (most common filters)
CREATE INDEX IF NOT EXISTS idx_leads_status_main ON public.leads(status_main) WHERE status_main IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status_sub ON public.leads(status_sub) WHERE status_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_fitness_goal ON public.leads(fitness_goal) WHERE fitness_goal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_activity_level ON public.leads(activity_level) WHERE activity_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_preferred_time ON public.leads(preferred_time) WHERE preferred_time IS NOT NULL;
-- Note: Removed idx_leads_created_at_date - DATE() is not IMMUTABLE
-- Use existing idx_leads_created_at index for date filtering instead

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_leads_status_source ON public.leads(status_main, source) WHERE status_main IS NOT NULL AND source IS NOT NULL;

-- Index for customer_id (already exists, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON public.leads(customer_id);

-- Index for birth_date (for age calculations)
CREATE INDEX IF NOT EXISTS idx_leads_birth_date ON public.leads(birth_date) WHERE birth_date IS NOT NULL;

-- Note: Removed idx_leads_created_at_date index
-- DATE() function is not IMMUTABLE, so it can't be used in index expressions
-- The existing idx_leads_created_at index on created_at (DESC) is sufficient for date filtering

-- =====================================================
-- STEP 2: Create View for Leads with Customer Data (Pre-joined)
-- =====================================================

CREATE OR REPLACE VIEW public.v_leads_with_customer AS
SELECT 
    l.id,
    l.created_at,
    l.updated_at,
    l.assigned_to,
    l.customer_id,
    l.city,
    l.birth_date,
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
    EXTRACT(YEAR FROM AGE(l.birth_date))::INTEGER as age,
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
    -- Extract subscription data
    (l.subscription_data->>'months')::INTEGER as subscription_months,
    (l.subscription_data->>'initialPrice')::DECIMAL as subscription_initial_price,
    (l.subscription_data->>'renewalPrice')::DECIMAL as subscription_renewal_price
FROM public.leads l
INNER JOIN public.customers c ON l.customer_id = c.id;

-- Grant access to authenticated users
GRANT SELECT ON public.v_leads_with_customer TO authenticated;

-- =====================================================
-- STEP 3: Create RPC Function for Filtered Leads (Complex Filtering)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_filtered_leads(
    p_search_query TEXT DEFAULT NULL,
    p_created_date DATE DEFAULT NULL,
    p_status_main TEXT DEFAULT NULL,
    p_status_sub TEXT DEFAULT NULL,
    p_age TEXT DEFAULT NULL,
    p_height TEXT DEFAULT NULL,
    p_weight TEXT DEFAULT NULL,
    p_fitness_goal TEXT DEFAULT NULL,
    p_activity_level TEXT DEFAULT NULL,
    p_preferred_time TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL,
    p_limit_count INTEGER DEFAULT 1000,
    p_offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    customer_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    status_main TEXT,
    status_sub TEXT,
    source TEXT,
    fitness_goal TEXT,
    activity_level TEXT,
    preferred_time TEXT,
    notes TEXT,
    age INTEGER,
    birth_date DATE,
    birth_date_formatted TEXT,
    created_date_formatted TEXT,
    height DECIMAL,
    weight DECIMAL,
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
        v.customer_id,
        v.customer_name,
        v.customer_phone,
        v.customer_email,
        v.status_main,
        v.status_sub,
        v.source,
        v.fitness_goal,
        v.activity_level,
        v.preferred_time,
        v.notes,
        v.age,
        v.birth_date,
        v.birth_date_formatted,
        v.created_date_formatted,
        v.height,
        v.weight,
        v.daily_steps_goal,
        v.weekly_workouts,
        v.daily_supplements,
        v.subscription_months,
        v.subscription_initial_price,
        v.subscription_renewal_price
    FROM public.v_leads_with_customer v
    WHERE 
        -- Search query (PostgreSQL text search - fast with indexes)
        (p_search_query IS NULL OR 
         v.customer_name ILIKE '%' || p_search_query || '%' OR
         v.customer_email ILIKE '%' || p_search_query || '%' OR
         v.customer_phone LIKE '%' || p_search_query || '%' OR
         v.fitness_goal ILIKE '%' || p_search_query || '%' OR
         v.notes ILIKE '%' || p_search_query || '%')
        -- Date filter (PostgreSQL date comparison)
        AND (p_created_date IS NULL OR DATE(v.created_at) = p_created_date)
        -- Status filters (uses indexes)
        AND (p_status_main IS NULL OR v.status_main = p_status_main)
        AND (p_status_sub IS NULL OR v.status_sub = p_status_sub)
        -- Age filter (calculated in PostgreSQL)
        AND (p_age IS NULL OR v.age::TEXT = p_age)
        -- Height filter
        AND (p_height IS NULL OR v.height::TEXT = p_height)
        -- Weight filter
        AND (p_weight IS NULL OR v.weight::TEXT = p_weight)
        -- Fitness goal filter (uses index)
        AND (p_fitness_goal IS NULL OR v.fitness_goal = p_fitness_goal)
        -- Activity level filter (uses index)
        AND (p_activity_level IS NULL OR v.activity_level = p_activity_level)
        -- Preferred time filter (uses index)
        AND (p_preferred_time IS NULL OR v.preferred_time = p_preferred_time)
        -- Source filter (uses index)
        AND (p_source IS NULL OR v.source = p_source)
    ORDER BY v.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_filtered_leads TO authenticated;

-- =====================================================
-- STEP 4: Create Helper Function for Age Calculation (Reusable)
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_age_from_birth_date(birth_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF birth_date IS NULL THEN
        RETURN 0;
    END IF;
    RETURN EXTRACT(YEAR FROM AGE(birth_date))::INTEGER;
END;
$$;

-- =====================================================
-- STEP 5: Create Function to Get Unique Filter Values (For Dropdowns)
-- =====================================================

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
        'ages', ARRAY(SELECT DISTINCT EXTRACT(YEAR FROM AGE(birth_date))::TEXT 
                      FROM public.leads 
                      WHERE birth_date IS NOT NULL 
                      ORDER BY EXTRACT(YEAR FROM AGE(birth_date)))::TEXT[],
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_lead_filter_options TO authenticated;

-- =====================================================
-- STEP 6: Comments for Documentation
-- =====================================================

COMMENT ON VIEW public.v_leads_with_customer IS 'Pre-joined view of leads with customer data and calculated fields. Use this for read operations to avoid client-side joins.';
COMMENT ON FUNCTION public.get_filtered_leads IS 'RPC function for complex lead filtering. All filtering happens in PostgreSQL. Returns pre-calculated fields (age, formatted dates, JSONB extracts).';
COMMENT ON FUNCTION public.calculate_age_from_birth_date IS 'Immutable function to calculate age from birth date. Can be used in queries and views.';
COMMENT ON FUNCTION public.get_lead_filter_options IS 'Returns distinct filter values for dropdowns. Calculated once in PostgreSQL instead of client-side.';

-- =====================================================
-- Migration Complete
-- =====================================================
