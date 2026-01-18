-- =====================================================
-- Migration: Add Pagination, Sorting, and Group By to Leads
-- Created: 2026-01-21
-- Description: Adds server-side pagination, sorting, and grouping support to get_filtered_leads RPC function
--              Also adds separate get_filtered_leads_count function for total count
-- =====================================================

-- Step 1: Update get_filtered_leads function to support sorting and grouping
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
    -- New parameters for sorting
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'DESC',
    -- New parameters for grouping (level 1 and level 2)
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
DECLARE
    v_sort_direction TEXT;
    v_order_by_clause TEXT;
BEGIN
    -- Validate sort_order (must be ASC or DESC)
    v_sort_direction := UPPER(COALESCE(NULLIF(p_sort_order, ''), 'DESC'));
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN
        v_sort_direction := 'DESC';
    END IF;

    -- Build ORDER BY clause - start with grouping columns, then sorting column
    v_order_by_clause := '';
    
    -- Add grouping columns to ORDER BY (for grouping in frontend, ensures groups are sorted together)
    IF p_group_by_level1 IS NOT NULL THEN
        v_order_by_clause := v_order_by_clause || CASE 
            WHEN p_group_by_level1 = 'status' OR p_group_by_level1 = 'status_main' THEN 'v.status_main ASC, '
            WHEN p_group_by_level1 = 'source' THEN 'v.source ASC, '
            WHEN p_group_by_level1 = 'fitnessGoal' OR p_group_by_level1 = 'fitness_goal' THEN 'v.fitness_goal ASC, '
            WHEN p_group_by_level1 = 'activityLevel' OR p_group_by_level1 = 'activity_level' THEN 'v.activity_level ASC, '
            WHEN p_group_by_level1 = 'preferredTime' OR p_group_by_level1 = 'preferred_time' THEN 'v.preferred_time ASC, '
            WHEN p_group_by_level1 = 'name' OR p_group_by_level1 = 'customer_name' THEN 'v.customer_name ASC, '
            WHEN p_group_by_level1 = 'age' THEN 'v.age ASC, '
            WHEN p_group_by_level1 = 'height' THEN 'v.height ASC, '
            WHEN p_group_by_level1 = 'weight' THEN 'v.weight ASC, '
            ELSE ''
        END;
    END IF;
    
    IF p_group_by_level2 IS NOT NULL THEN
        v_order_by_clause := v_order_by_clause || CASE 
            WHEN p_group_by_level2 = 'status' OR p_group_by_level2 = 'status_main' THEN 'v.status_main ASC, '
            WHEN p_group_by_level2 = 'source' THEN 'v.source ASC, '
            WHEN p_group_by_level2 = 'fitnessGoal' OR p_group_by_level2 = 'fitness_goal' THEN 'v.fitness_goal ASC, '
            WHEN p_group_by_level2 = 'activityLevel' OR p_group_by_level2 = 'activity_level' THEN 'v.activity_level ASC, '
            WHEN p_group_by_level2 = 'preferredTime' OR p_group_by_level2 = 'preferred_time' THEN 'v.preferred_time ASC, '
            WHEN p_group_by_level2 = 'name' OR p_group_by_level2 = 'customer_name' THEN 'v.customer_name ASC, '
            WHEN p_group_by_level2 = 'age' THEN 'v.age ASC, '
            WHEN p_group_by_level2 = 'height' THEN 'v.height ASC, '
            WHEN p_group_by_level2 = 'weight' THEN 'v.weight ASC, '
            ELSE ''
        END;
    END IF;
    
    -- Add main sorting column
    v_order_by_clause := v_order_by_clause || CASE 
        WHEN p_sort_by = 'createdDate' OR p_sort_by = 'created_date' OR p_sort_by = 'created_at' THEN 'v.created_at ' || v_sort_direction
        WHEN p_sort_by = 'name' OR p_sort_by = 'customer_name' THEN 'v.customer_name ' || v_sort_direction
        WHEN p_sort_by = 'status' OR p_sort_by = 'status_main' THEN 'v.status_main ' || v_sort_direction
        WHEN p_sort_by = 'phone' OR p_sort_by = 'customer_phone' THEN 'v.customer_phone ' || v_sort_direction
        WHEN p_sort_by = 'email' OR p_sort_by = 'customer_email' THEN 'v.customer_email ' || v_sort_direction
        WHEN p_sort_by = 'source' THEN 'v.source ' || v_sort_direction
        WHEN p_sort_by = 'age' THEN 'v.age ' || v_sort_direction
        WHEN p_sort_by = 'height' THEN 'v.height ' || v_sort_direction
        WHEN p_sort_by = 'weight' THEN 'v.weight ' || v_sort_direction
        WHEN p_sort_by = 'fitnessGoal' OR p_sort_by = 'fitness_goal' THEN 'v.fitness_goal ' || v_sort_direction
        WHEN p_sort_by = 'activityLevel' OR p_sort_by = 'activity_level' THEN 'v.activity_level ' || v_sort_direction
        WHEN p_sort_by = 'preferredTime' OR p_sort_by = 'preferred_time' THEN 'v.preferred_time ' || v_sort_direction
        WHEN p_sort_by = 'notes' THEN 'v.notes ' || v_sort_direction
        ELSE 'v.created_at ' || v_sort_direction -- Default fallback
    END;

    -- Execute query with dynamic ORDER BY using EXECUTE (safe with validated inputs)
    RETURN QUERY
    EXECUTE format('
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
            ($1 IS NULL OR 
             v.customer_name ILIKE ''%%'' || $1 || ''%%'' OR
             v.customer_phone ILIKE ''%%'' || $1 || ''%%'' OR
             v.customer_email ILIKE ''%%'' || $1 || ''%%'')
            -- Status filter
            AND ($2 IS NULL OR v.status_main = $2)
            AND ($3 IS NULL OR v.status_sub = $3)
            -- Source filter
            AND ($4 IS NULL OR v.source = $4)
            -- Fitness goal filter
            AND ($5 IS NULL OR v.fitness_goal = $5)
            -- Activity level filter
            AND ($6 IS NULL OR v.activity_level = $6)
            -- Preferred time filter
            AND ($7 IS NULL OR v.preferred_time = $7)
            -- Age filter
            AND ($8 IS NULL OR v.age::TEXT = $8)
            -- Height filter
            AND ($9 IS NULL OR v.height::TEXT = $9)
            -- Weight filter
            AND ($10 IS NULL OR v.weight::TEXT = $10)
            -- Date filter (created_at date)
            AND ($11 IS NULL OR v.created_date_formatted = $11)
        ORDER BY %s
        LIMIT $12
        OFFSET $13
    ', v_order_by_clause)
    USING 
        p_search_query,
        p_status_main,
        p_status_sub,
        p_source,
        p_fitness_goal,
        p_activity_level,
        p_preferred_time,
        p_age,
        p_height,
        p_weight,
        p_date,
        p_limit_count,
        p_offset_count;
END;
$$;

-- Step 2: Create separate count function for total leads matching filters
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
        -- Age filter
        AND (p_age IS NULL OR v.age::TEXT = p_age)
        -- Height filter
        AND (p_height IS NULL OR v.height::TEXT = p_height)
        -- Weight filter
        AND (p_weight IS NULL OR v.weight::TEXT = p_weight)
        -- Date filter (created_at date)
        AND (p_date IS NULL OR v.created_date_formatted = p_date);

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_filtered_leads(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filtered_leads_count(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 4: Update comments
COMMENT ON FUNCTION public.get_filtered_leads(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'RPC function for complex lead filtering with server-side pagination, sorting, and grouping support. All filtering happens in PostgreSQL.';
COMMENT ON FUNCTION public.get_filtered_leads_count(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Returns total count of leads matching the filter criteria. Used for pagination to calculate total pages.';

-- =====================================================
-- Migration Complete
-- =====================================================
