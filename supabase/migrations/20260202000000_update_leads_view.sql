-- =====================================================
-- Update Leads View and Functions for Expanded Relations (Ultimate God Mode - FIXED)
-- Created: 2026-02-02
-- Description: Adds relations to EVERYTHING linked to leads
-- =====================================================

-- 1. Drop dependencies (Robustly drop all function signatures)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop get_filtered_leads functions
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname = 'get_filtered_leads'
             AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;

    -- Drop get_filtered_leads_count functions
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname = 'get_filtered_leads_count'
             AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

DROP VIEW IF EXISTS public.v_leads_with_customer CASCADE;

-- 2. Recreate View with ALL Aggregates and JSON Data
CREATE OR REPLACE VIEW "public"."v_leads_with_customer" AS
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
    -- Customer data (One-to-One)
    c.full_name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    -- Calculated fields
    TO_CHAR(l.created_at, 'YYYY-MM-DD') as created_date_formatted,
    TO_CHAR(l.birth_date, 'YYYY-MM-DD') as birth_date_formatted,
    -- JSONB fields extracted for convenience
    (l.daily_protocol->>'stepsGoal')::INTEGER as daily_steps_goal,
    (l.daily_protocol->>'workoutGoal')::INTEGER as weekly_workouts_goal,
    (l.daily_protocol->>'supplements')::JSONB as daily_supplements,
    (l.subscription_data->>'months')::INTEGER as subscription_months,
    (l.subscription_data->>'initialPrice')::DECIMAL as subscription_initial_price,
    (l.subscription_data->>'renewalPrice')::DECIMAL as subscription_renewal_price,
    (l.subscription_data->>'name')::TEXT as subscription_name,
    
    -- Active Budget (One-to-One via assignment)
    b.name as active_budget_name,
    b.id as active_budget_id,
    to_jsonb(b.*) as active_budget_json,
    
    -- Payments (One-to-Many)
    COALESCE(p_agg.total_paid, 0) as total_paid,
    p_agg.last_payment_date,
    COALESCE(p_agg.payments_json, '[]'::jsonb) as payments_json,
    
    -- Collections (One-to-Many)
    COALESCE(col_agg.total_expected, 0) as total_expected,
    (COALESCE(col_agg.total_expected, 0) - COALESCE(p_agg.total_paid, 0)) as debt_amount,
    COALESCE(col_agg.collections_json, '[]'::jsonb) as collections_json,
    
    -- Workout Plans (One-to-Many)
    COALESCE(wp_agg.plan_count, 0) as workout_plans_count,
    wp_agg.latest_plan_date as latest_workout_plan_date,
    COALESCE(wp_agg.plans_json, '[]'::jsonb) as workout_plans_json,
    
    -- Nutrition Plans (One-to-Many)
    COALESCE(np_agg.plan_count, 0) as nutrition_plans_count,
    np_agg.latest_plan_date as latest_nutrition_plan_date,
    COALESCE(np_agg.plans_json, '[]'::jsonb) as nutrition_plans_json,

    -- Supplement Plans (One-to-Many)
    COALESCE(sup_agg.plan_count, 0) as supplement_plans_count,
    sup_agg.latest_plan_date as latest_supplement_plan_date,
    COALESCE(sup_agg.plans_json, '[]'::jsonb) as supplement_plans_json,

    -- Steps Plans (One-to-Many)
    COALESCE(step_agg.plan_count, 0) as steps_plans_count,
    step_agg.latest_plan_date as latest_steps_plan_date,
    COALESCE(step_agg.plans_json, '[]'::jsonb) as steps_plans_json,

    -- Meetings (One-to-Many)
    COALESCE(meet_agg.meeting_count, 0) as meetings_count,
    meet_agg.latest_meeting_date,
    meet_agg.next_meeting_date,
    COALESCE(meet_agg.meetings_json, '[]'::jsonb) as meetings_json,

    -- Blood Tests (One-to-Many)
    COALESCE(blood_agg.test_count, 0) as blood_tests_count,
    blood_agg.latest_test_date,
    COALESCE(blood_agg.tests_json, '[]'::jsonb) as blood_tests_json

FROM public.leads l
LEFT JOIN public.customers c ON l.customer_id = c.id
LEFT JOIN public.budget_assignments ba ON l.id = ba.lead_id AND ba.is_active = true
LEFT JOIN public.budgets b ON ba.budget_id = b.id

-- Payments Aggregation
LEFT JOIN (
    SELECT lead_id, SUM(amount) as total_paid, MAX(created_at) as last_payment_date,
           jsonb_agg(to_jsonb(p.*) ORDER BY created_at DESC) as payments_json
    FROM public.payments p GROUP BY lead_id
) p_agg ON l.id = p_agg.lead_id

-- Collections Aggregation
LEFT JOIN (
    SELECT lead_id, SUM(total_amount) as total_expected,
           jsonb_agg(to_jsonb(cl.*) ORDER BY due_date ASC) as collections_json
    FROM public.collections cl GROUP BY lead_id
) col_agg ON l.id = col_agg.lead_id

-- Workout Plans
LEFT JOIN (
    SELECT lead_id, COUNT(*) as plan_count, MAX(start_date) as latest_plan_date,
           jsonb_agg(to_jsonb(wp.*) ORDER BY start_date DESC) as plans_json
    FROM public.workout_plans wp GROUP BY lead_id
) wp_agg ON l.id = wp_agg.lead_id

-- Nutrition Plans
LEFT JOIN (
    SELECT lead_id, COUNT(*) as plan_count, MAX(start_date) as latest_plan_date,
           jsonb_agg(to_jsonb(np.*) ORDER BY start_date DESC) as plans_json
    FROM public.nutrition_plans np GROUP BY lead_id
) np_agg ON l.id = np_agg.lead_id

-- Supplement Plans
LEFT JOIN (
    SELECT lead_id, COUNT(*) as plan_count, MAX(start_date) as latest_plan_date,
           jsonb_agg(to_jsonb(sp.*) ORDER BY start_date DESC) as plans_json
    FROM public.supplement_plans sp GROUP BY lead_id
) sup_agg ON l.id = sup_agg.lead_id

-- Steps Plans
LEFT JOIN (
    SELECT lead_id, COUNT(*) as plan_count, MAX(start_date) as latest_plan_date,
           jsonb_agg(to_jsonb(stp.*) ORDER BY start_date DESC) as plans_json
    FROM public.steps_plans stp GROUP BY lead_id
) step_agg ON l.id = step_agg.lead_id

-- Meetings
LEFT JOIN (
    SELECT lead_id, COUNT(*) as meeting_count, 
           MAX(created_at) FILTER (WHERE created_at < now()) as latest_meeting_date,
           MIN(created_at) FILTER (WHERE created_at >= now()) as next_meeting_date,
           jsonb_agg(to_jsonb(m.*) ORDER BY created_at DESC) as meetings_json
    FROM public.meetings m GROUP BY lead_id
) meet_agg ON l.id = meet_agg.lead_id

-- Blood Tests
LEFT JOIN (
    SELECT lead_id, COUNT(*) as test_count, MAX(created_at) as latest_test_date,
           jsonb_agg(to_jsonb(bt.*) ORDER BY created_at DESC) as tests_json
    FROM public.blood_tests bt GROUP BY lead_id
) blood_agg ON l.id = blood_agg.lead_id;

-- Grant permissions
GRANT SELECT ON public.v_leads_with_customer TO authenticated;
GRANT SELECT ON public.v_leads_with_customer TO anon;
GRANT SELECT ON public.v_leads_with_customer TO service_role;

-- 3. Recreate get_filtered_leads with ALL columns
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
    p_date TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'DESC',
    p_group_by_level1 TEXT DEFAULT NULL,
    p_group_by_level2 TEXT DEFAULT NULL
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
    weekly_workouts_goal INTEGER,
    daily_supplements JSONB,
    subscription_months INTEGER,
    subscription_initial_price DECIMAL,
    subscription_renewal_price DECIMAL,
    subscription_name TEXT,
    
    active_budget_name TEXT,
    active_budget_id UUID,
    active_budget_json JSONB,
    
    total_paid DECIMAL,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    payments_json JSONB,
    
    total_expected DECIMAL,
    debt_amount DECIMAL,
    collections_json JSONB,
    
    workout_plans_count BIGINT,
    latest_workout_plan_date DATE,
    workout_plans_json JSONB,
    
    nutrition_plans_count BIGINT,
    latest_nutrition_plan_date DATE,
    nutrition_plans_json JSONB,

    supplement_plans_count BIGINT,
    latest_supplement_plan_date DATE,
    supplement_plans_json JSONB,

    steps_plans_count BIGINT,
    latest_steps_plan_date DATE,
    steps_plans_json JSONB,

    meetings_count BIGINT,
    latest_meeting_date TIMESTAMP WITH TIME ZONE,
    next_meeting_date TIMESTAMP WITH TIME ZONE,
    meetings_json JSONB,

    blood_tests_count BIGINT,
    latest_test_date TIMESTAMP WITH TIME ZONE,
    blood_tests_json JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_sort_direction TEXT;
    v_order_by_clause TEXT;
BEGIN
    v_sort_direction := UPPER(COALESCE(NULLIF(p_sort_order, ''), 'DESC'));
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    v_order_by_clause := '';
    
    IF p_group_by_level1 IS NOT NULL THEN
        v_order_by_clause := v_order_by_clause || CASE 
            WHEN p_group_by_level1 IN ('status', 'status_main') THEN 'v.status_main ASC, '
            WHEN p_group_by_level1 = 'source' THEN 'v.source ASC, '
            WHEN p_group_by_level1 IN ('name', 'customer_name') THEN 'v.customer_name ASC, '
            WHEN p_group_by_level1 = 'active_budget_name' THEN 'v.active_budget_name ASC, '
            ELSE ''
        END;
    END IF;
    
    IF p_group_by_level2 IS NOT NULL THEN
        v_order_by_clause := v_order_by_clause || CASE 
            WHEN p_group_by_level2 IN ('status', 'status_main') THEN 'v.status_main ASC, '
            WHEN p_group_by_level2 = 'source' THEN 'v.source ASC, '
            WHEN p_group_by_level2 IN ('name', 'customer_name') THEN 'v.customer_name ASC, '
            ELSE ''
        END;
    END IF;
    
    v_order_by_clause := v_order_by_clause || CASE 
        WHEN p_sort_by IN ('createdDate', 'created_date', 'created_at') THEN 'v.created_at ' || v_sort_direction
        WHEN p_sort_by IN ('name', 'customer_name') THEN 'v.customer_name ' || v_sort_direction
        WHEN p_sort_by IN ('status', 'status_main') THEN 'v.status_main ' || v_sort_direction
        WHEN p_sort_by = 'debt_amount' THEN 'v.debt_amount ' || v_sort_direction
        ELSE 'v.created_at ' || v_sort_direction
    END;

    RETURN QUERY
    EXECUTE format('
        SELECT 
            v.*
        FROM public.v_leads_with_customer v
        WHERE 
            ($1 IS NULL OR 
             v.customer_name ILIKE ''%%'' || $1 || ''%%'' OR
             v.customer_phone ILIKE ''%%'' || $1 || ''%%'' OR
             v.customer_email ILIKE ''%%'' || $1 || ''%%'')
            AND ($2 IS NULL OR v.status_main = $2)
            AND ($3 IS NULL OR v.status_sub = $3)
            AND ($4 IS NULL OR v.source = $4)
            AND ($5 IS NULL OR v.fitness_goal = $5)
            AND ($6 IS NULL OR v.activity_level = $6)
            AND ($7 IS NULL OR v.preferred_time = $7)
            AND ($8 IS NULL OR v.age::TEXT = $8)
            AND ($9 IS NULL OR v.height::TEXT = $9)
            AND ($10 IS NULL OR v.weight::TEXT = $10)
            AND ($11 IS NULL OR v.created_date_formatted = $11)
        ORDER BY %s
        LIMIT $12
        OFFSET $13
    ', v_order_by_clause)
    USING 
        p_search_query, p_status_main, p_status_sub, p_source, p_fitness_goal, p_activity_level, 
        p_preferred_time, p_age, p_height, p_weight, p_date, p_limit_count, p_offset_count;
END;
$$;

-- 4. Recreate get_filtered_leads_count
CREATE OR REPLACE FUNCTION public.get_filtered_leads_count(
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
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.v_leads_with_customer v
    WHERE 
        (p_search_query IS NULL OR 
         v.customer_name ILIKE '%' || p_search_query || '%' OR
         v.customer_phone ILIKE '%' || p_search_query || '%' OR
         v.customer_email ILIKE '%' || p_search_query || '%')
        AND (p_status_main IS NULL OR v.status_main = p_status_main)
        AND (p_status_sub IS NULL OR v.status_sub = p_status_sub)
        AND (p_source IS NULL OR v.source = p_source)
        AND (p_fitness_goal IS NULL OR v.fitness_goal = p_fitness_goal)
        AND (p_activity_level IS NULL OR v.activity_level = p_activity_level)
        AND (p_preferred_time IS NULL OR v.preferred_time = p_preferred_time)
        AND (p_age IS NULL OR v.age::TEXT = p_age)
        AND (p_height IS NULL OR v.height::TEXT = p_height)
        AND (p_weight IS NULL OR v.weight::TEXT = p_weight)
        AND (p_date IS NULL OR v.created_date_formatted = p_date);

    RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_leads TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filtered_leads_count TO authenticated;
