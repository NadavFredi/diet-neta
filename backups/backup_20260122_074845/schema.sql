


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "supabase_migrations";


ALTER SCHEMA "supabase_migrations" OWNER TO "postgres";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    IF birth_date IS NULL THEN
        RETURN 0;
    END IF;
    RETURN EXTRACT(YEAR FROM AGE(birth_date))::INTEGER;
END;
$$;


ALTER FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") IS 'Immutable function to calculate age from birth date. Can be used in queries and views.';



CREATE OR REPLACE FUNCTION "public"."calculate_bmi"("height_cm" numeric, "weight_kg" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 OR weight_kg <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::DECIMAL, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_bmi"("height_cm" numeric, "weight_kg" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invitation_token"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token (32 bytes = 64 hex characters)
    -- This is just a placeholder - actual token generation happens in application code
    -- using crypto.randomBytes or similar
    token := encode(gen_random_bytes(32), 'hex');
    RETURN token;
END;
$$;


ALTER FUNCTION "public"."generate_invitation_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_filtered_leads"("p_limit_count" integer DEFAULT 100, "p_offset_count" integer DEFAULT 0, "p_search_query" "text" DEFAULT NULL::"text", "p_status_main" "text" DEFAULT NULL::"text", "p_status_sub" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT NULL::"text", "p_fitness_goal" "text" DEFAULT NULL::"text", "p_activity_level" "text" DEFAULT NULL::"text", "p_preferred_time" "text" DEFAULT NULL::"text", "p_age" "text" DEFAULT NULL::"text", "p_height" "text" DEFAULT NULL::"text", "p_weight" "text" DEFAULT NULL::"text", "p_date" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "assigned_to" "uuid", "customer_id" "uuid", "city" "text", "birth_date" "date", "age" integer, "gender" "text", "status_main" "text", "status_sub" "text", "height" numeric, "weight" numeric, "bmi" numeric, "join_date" timestamp with time zone, "subscription_data" "jsonb", "daily_protocol" "jsonb", "workout_history" "jsonb", "steps_history" "jsonb", "source" "text", "fitness_goal" "text", "activity_level" "text", "preferred_time" "text", "notes" "text", "customer_name" "text", "customer_phone" "text", "customer_email" "text", "created_date_formatted" "text", "birth_date_formatted" "text", "daily_steps_goal" integer, "weekly_workouts" integer, "daily_supplements" "text"[], "subscription_months" integer, "subscription_initial_price" numeric, "subscription_renewal_price" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id, v.created_at, v.updated_at, v.assigned_to, v.customer_id, v.city,
        v.birth_date, v.age, v.gender, v.status_main, v.status_sub,
        v.height, v.weight, v.bmi, v.join_date, v.subscription_data,
        v.daily_protocol, v.workout_history, v.steps_history, v.source,
        v.fitness_goal, v.activity_level, v.preferred_time, v.notes,
        v.customer_name, v.customer_phone, v.customer_email,
        v.created_date_formatted, v.birth_date_formatted,
        v.daily_steps_goal, v.weekly_workouts, v.daily_supplements,
        v.subscription_months, v.subscription_initial_price, v.subscription_renewal_price
    FROM public.v_leads_with_customer v
    WHERE 
        (p_search_query IS NULL OR v.customer_name ILIKE '%' || p_search_query || '%' OR v.customer_phone ILIKE '%' || p_search_query || '%' OR v.customer_email ILIKE '%' || p_search_query || '%')
        AND (p_status_main IS NULL OR v.status_main = p_status_main)
        AND (p_status_sub IS NULL OR v.status_sub = p_status_sub)
        AND (p_source IS NULL OR v.source = p_source)
        AND (p_fitness_goal IS NULL OR v.fitness_goal = p_fitness_goal)
        AND (p_activity_level IS NULL OR v.activity_level = p_activity_level)
        AND (p_preferred_time IS NULL OR v.preferred_time = p_preferred_time)
        AND (p_age IS NULL OR v.age::TEXT = p_age)
        AND (p_height IS NULL OR v.height::TEXT = p_height)
        AND (p_weight IS NULL OR v.weight::TEXT = p_weight)
        AND (p_date IS NULL OR v.created_date_formatted = p_date)
    ORDER BY v.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;


ALTER FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_filtered_leads"("p_limit_count" integer DEFAULT 100, "p_offset_count" integer DEFAULT 0, "p_search_query" "text" DEFAULT NULL::"text", "p_status_main" "text" DEFAULT NULL::"text", "p_status_sub" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT NULL::"text", "p_fitness_goal" "text" DEFAULT NULL::"text", "p_activity_level" "text" DEFAULT NULL::"text", "p_preferred_time" "text" DEFAULT NULL::"text", "p_age" "text" DEFAULT NULL::"text", "p_height" "text" DEFAULT NULL::"text", "p_weight" "text" DEFAULT NULL::"text", "p_date" "text" DEFAULT NULL::"text", "p_sort_by" "text" DEFAULT 'created_at'::"text", "p_sort_order" "text" DEFAULT 'DESC'::"text", "p_group_by_level1" "text" DEFAULT NULL::"text", "p_group_by_level2" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "assigned_to" "uuid", "customer_id" "uuid", "city" "text", "birth_date" "date", "age" integer, "gender" "text", "status_main" "text", "status_sub" "text", "height" numeric, "weight" numeric, "bmi" numeric, "join_date" timestamp with time zone, "subscription_data" "jsonb", "daily_protocol" "jsonb", "workout_history" "jsonb", "steps_history" "jsonb", "source" "text", "fitness_goal" "text", "activity_level" "text", "preferred_time" "text", "notes" "text", "customer_name" "text", "customer_phone" "text", "customer_email" "text", "created_date_formatted" "text", "birth_date_formatted" "text", "daily_steps_goal" integer, "weekly_workouts" integer, "daily_supplements" "text"[], "subscription_months" integer, "subscription_initial_price" numeric, "subscription_renewal_price" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $_$
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
$_$;


ALTER FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text", "p_sort_by" "text", "p_sort_order" "text", "p_group_by_level1" "text", "p_group_by_level2" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text", "p_sort_by" "text", "p_sort_order" "text", "p_group_by_level1" "text", "p_group_by_level2" "text") IS 'RPC function for complex lead filtering with server-side pagination, sorting, and grouping support. All filtering happens in PostgreSQL.';



CREATE OR REPLACE FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text" DEFAULT NULL::"text", "p_status_main" "text" DEFAULT NULL::"text", "p_status_sub" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT NULL::"text", "p_fitness_goal" "text" DEFAULT NULL::"text", "p_activity_level" "text" DEFAULT NULL::"text", "p_preferred_time" "text" DEFAULT NULL::"text", "p_age" "text" DEFAULT NULL::"text", "p_height" "text" DEFAULT NULL::"text", "p_weight" "text" DEFAULT NULL::"text", "p_date" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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


ALTER FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") IS 'Returns total count of leads matching the filter criteria. Used for pagination to calculate total pages.';



CREATE OR REPLACE FUNCTION "public"."get_lead_filter_options"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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


ALTER FUNCTION "public"."get_lead_filter_options"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_lead_filter_options"() IS 'Returns distinct filter values for dropdowns. Uses age column directly.';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO count
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  
  RETURN COALESCE(count, 0);
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Auto-set role to 'trainee' for trainee@test.com
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        CASE 
            WHEN NEW.email = 'trainee@test.com' THEN 'trainee'
            ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
        END
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_invitation_token"("token" "text", "salt" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Use SHA-256 for token hashing
    -- In production, consider using bcrypt or argon2
    RETURN encode(digest(salt || token, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."hash_invitation_token"("token" "text", "salt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_manager"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'user')
    );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_invitation_valid"("p_invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_status TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT status, expires_at INTO v_status, v_expires_at
    FROM public.user_invitations
    WHERE id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired or revoked
    IF v_status IN ('expired', 'revoked', 'accepted') THEN
        RETURN FALSE;
    END IF;
    
    -- Check expiration
    IF v_expires_at < NOW() THEN
        -- Auto-update status to expired
        UPDATE public.user_invitations
        SET status = 'expired', updated_at = NOW()
        WHERE id = p_invitation_id;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."is_invitation_valid"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert or update the weekly_review template for the user
  INSERT INTO public.whatsapp_flow_templates (user_id, flow_key, template_content, buttons, media)
  VALUES (
    p_user_id,
    'weekly_review',
    '📊 סיכום שבועי - שבוע {{week_start}} - {{week_end}}

🎯 יעדים:
קלוריות: {{target_calories}} קק"ל
חלבון: {{target_protein}} גרם
סיבים: {{target_fiber}} גרם
צעדים: {{target_steps}}

📈 בפועל (ממוצע):
קלוריות: {{actual_calories}} קק"ל
משקל ממוצע: {{actual_weight}} ק"ג',
    '[]'::jsonb,
    NULL
  )
  ON CONFLICT (user_id, flow_key)
  DO UPDATE SET
    template_content = EXCLUDED.template_content,
    updated_at = NOW()
  WHERE whatsapp_flow_templates.template_content = '' OR whatsapp_flow_templates.template_content IS NULL;
END;
$$;


ALTER FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") IS 'Sets default weekly_review WhatsApp template for a user. Only updates if template is empty or null.';



CREATE OR REPLACE FUNCTION "public"."set_green_api_settings_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.created_by = COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_green_api_settings_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_check_in_field_configurations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_check_in_field_configurations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_customer_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fillout_submissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_fillout_submissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_bmi"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
        NEW.bmi = public.calculate_bmi(NEW.height, NEW.weight);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lead_bmi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_meetings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_meetings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_whatsapp_flow_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_whatsapp_flow_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_invitation_token"("p_token_hash" "text", "p_token" "text", "p_salt" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Verify token by hashing and comparing
    RETURN p_token_hash = public.hash_invitation_token(p_token, p_salt);
END;
$$;


ALTER FUNCTION "public"."verify_invitation_token"("p_token_hash" "text", "p_token" "text", "p_salt" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';



CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



CREATE TABLE IF NOT EXISTS "public"."blood_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "upload_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid"
);


ALTER TABLE "public"."blood_tests" OWNER TO "postgres";


COMMENT ON TABLE "public"."blood_tests" IS 'Blood test PDF files uploaded by clients or managers';



COMMENT ON COLUMN "public"."blood_tests"."lead_id" IS 'Reference to the lead (client)';



COMMENT ON COLUMN "public"."blood_tests"."file_url" IS 'Storage path in client-assets bucket (e.g., customer_id/blood-tests/filename.pdf)';



COMMENT ON COLUMN "public"."blood_tests"."file_name" IS 'Original file name for display';



CREATE TABLE IF NOT EXISTS "public"."budget_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "budget_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."budget_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_assignments" IS 'Active budget assignments to leads/customers';



COMMENT ON COLUMN "public"."budget_assignments"."is_active" IS 'Only one active budget per lead/customer at a time';



CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "nutrition_template_id" "uuid",
    "nutrition_targets" "jsonb" DEFAULT '{}'::"jsonb",
    "steps_goal" integer DEFAULT 0,
    "steps_instructions" "text",
    "workout_template_id" "uuid",
    "supplements" "jsonb" DEFAULT '[]'::"jsonb",
    "eating_order" "text",
    "eating_rules" "text",
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


COMMENT ON TABLE "public"."budgets" IS 'Master budget templates that aggregate nutrition, workout, steps, and supplements';



COMMENT ON COLUMN "public"."budgets"."nutrition_targets" IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber_min: number, water_min: number }';



COMMENT ON COLUMN "public"."budgets"."supplements" IS 'JSONB array of supplements: [{ name: string, dosage: string, timing: string }]';



CREATE TABLE IF NOT EXISTS "public"."check_in_field_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."check_in_field_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."check_in_field_configurations" IS 'Stores configuration for check-in field visibility and labels per customer or globally';



COMMENT ON COLUMN "public"."check_in_field_configurations"."customer_id" IS 'Customer ID for customer-specific config, NULL for global/default config';



COMMENT ON COLUMN "public"."check_in_field_configurations"."configuration" IS 'JSONB object containing field visibility, labels, and section visibility settings';



CREATE TABLE IF NOT EXISTS "public"."customer_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "lead_id" "uuid",
    "attachment_url" "text"
);


ALTER TABLE "public"."customer_notes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customer_notes"."lead_id" IS 'Optional reference to a specific lead/inquiry. NULL means the note applies to all inquiries for the customer.';



COMMENT ON COLUMN "public"."customer_notes"."attachment_url" IS 'URL/path to file attachment in Supabase Storage (client-assets bucket)';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "daily_protocol" "jsonb" DEFAULT '{}'::"jsonb",
    "workout_history" "jsonb" DEFAULT '[]'::"jsonb",
    "steps_history" "jsonb" DEFAULT '[]'::"jsonb",
    "avatar_url" "text",
    "total_spent" numeric(10,2) DEFAULT 0,
    "membership_tier" "text" DEFAULT 'New'::"text",
    "user_id" "uuid",
    CONSTRAINT "customers_membership_tier_check" CHECK (("membership_tier" = ANY (ARRAY['New'::"text", 'Standard'::"text", 'Premium'::"text", 'VIP'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Customer identity table - unique by phone number';



COMMENT ON COLUMN "public"."customers"."phone" IS 'Unique identifier for customer identity';



COMMENT ON COLUMN "public"."customers"."daily_protocol" IS 'JSONB: { "stepsGoal": number, "workoutGoal": number, "supplements": string[] } - Coaching protocol data';



COMMENT ON COLUMN "public"."customers"."workout_history" IS 'JSONB: Array of workout program objects with dates, splits, and descriptions - Historical coaching data';



COMMENT ON COLUMN "public"."customers"."steps_history" IS 'JSONB: Array of step tracking objects with week numbers, dates, and targets - Historical coaching data';



COMMENT ON COLUMN "public"."customers"."avatar_url" IS 'URL to customer avatar/profile image';



COMMENT ON COLUMN "public"."customers"."total_spent" IS 'Total amount spent across all leads (calculated field)';



COMMENT ON COLUMN "public"."customers"."membership_tier" IS 'Customer membership tier based on total_spent: New (<500), Standard (500-1999), Premium (2000-4999), VIP (5000+)';



COMMENT ON COLUMN "public"."customers"."user_id" IS 'Link to auth.users - allows clients to log in and access their portal';



CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_to" "uuid",
    "city" "text",
    "birth_date" "date",
    "gender" "text",
    "status_main" "text",
    "status_sub" "text",
    "height" numeric(5,2),
    "weight" numeric(5,2),
    "bmi" numeric(4,2),
    "join_date" timestamp with time zone,
    "subscription_data" "jsonb" DEFAULT '{}'::"jsonb",
    "daily_protocol" "jsonb" DEFAULT '{}'::"jsonb",
    "workout_history" "jsonb" DEFAULT '[]'::"jsonb",
    "steps_history" "jsonb" DEFAULT '[]'::"jsonb",
    "source" "text",
    "fitness_goal" "text",
    "activity_level" "text",
    "preferred_time" "text",
    "notes" "text",
    "customer_id" "uuid" NOT NULL,
    "nutrition_history" "jsonb" DEFAULT '[]'::"jsonb",
    "supplements_history" "jsonb" DEFAULT '[]'::"jsonb",
    "age" integer,
    "period" boolean,
    CONSTRAINT "leads_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON TABLE "public"."leads" IS 'Lead/Opportunity table - linked to customers via customer_id';



COMMENT ON COLUMN "public"."leads"."birth_date" IS 'Birth date. Can be entered manually, independent of age.';



COMMENT ON COLUMN "public"."leads"."subscription_data" IS 'JSONB: Flexible subscription information including pricing and package details';



COMMENT ON COLUMN "public"."leads"."daily_protocol" IS 'JSONB: { "stepsGoal": number, "workoutGoal": number, "supplements": string[] }';



COMMENT ON COLUMN "public"."leads"."workout_history" IS 'JSONB: Array of workout program objects with dates, splits, and descriptions';



COMMENT ON COLUMN "public"."leads"."steps_history" IS 'JSONB: Array of step tracking objects with week numbers, dates, and targets';



COMMENT ON COLUMN "public"."leads"."customer_id" IS 'Foreign key to customers table - one customer can have many leads';



COMMENT ON COLUMN "public"."leads"."nutrition_history" IS 'Array of historical nutrition plans for this lead';



COMMENT ON COLUMN "public"."leads"."supplements_history" IS 'Array of historical supplements plans for this lead';



COMMENT ON COLUMN "public"."leads"."age" IS 'Age in years. Can be manually entered, independent of birth_date.';



CREATE OR REPLACE VIEW "public"."customers_with_lead_counts" AS
 SELECT "c"."id",
    "c"."full_name",
    "c"."phone",
    "c"."email",
    "c"."created_at",
    "c"."updated_at",
    "c"."daily_protocol",
    "c"."workout_history",
    "c"."steps_history",
    "c"."avatar_url",
    "c"."total_spent",
    "c"."membership_tier",
    "c"."user_id",
    COALESCE("l"."lead_count", 0) AS "total_leads"
   FROM ("public"."customers" "c"
     LEFT JOIN ( SELECT "leads"."customer_id",
            ("count"(*))::integer AS "lead_count"
           FROM "public"."leads"
          WHERE ("leads"."customer_id" IS NOT NULL)
          GROUP BY "leads"."customer_id") "l" ON (("l"."customer_id" = "c"."id")));


ALTER VIEW "public"."customers_with_lead_counts" OWNER TO "postgres";


COMMENT ON VIEW "public"."customers_with_lead_counts" IS 'Customers with total lead counts for filtering and sorting.';



CREATE TABLE IF NOT EXISTS "public"."daily_check_ins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "check_in_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "workout_completed" boolean DEFAULT false,
    "steps_goal_met" boolean DEFAULT false,
    "steps_actual" integer,
    "nutrition_goal_met" boolean DEFAULT false,
    "supplements_taken" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "weight" numeric(5,2),
    "belly_circumference" integer,
    "waist_circumference" integer,
    "thigh_circumference" integer,
    "arm_circumference" integer,
    "neck_circumference" integer,
    "exercises_count" integer,
    "cardio_amount" integer,
    "intervals_count" integer,
    "calories_daily" integer,
    "protein_daily" integer,
    "fiber_daily" integer,
    "water_amount" numeric(5,2),
    "stress_level" integer,
    "hunger_level" integer,
    "energy_level" integer,
    "sleep_hours" numeric(4,2),
    CONSTRAINT "daily_check_ins_energy_level_check" CHECK ((("energy_level" IS NULL) OR (("energy_level" >= 1) AND ("energy_level" <= 10)))),
    CONSTRAINT "daily_check_ins_hunger_level_check" CHECK ((("hunger_level" IS NULL) OR (("hunger_level" >= 1) AND ("hunger_level" <= 10)))),
    CONSTRAINT "daily_check_ins_stress_level_check" CHECK ((("stress_level" IS NULL) OR (("stress_level" >= 1) AND ("stress_level" <= 10))))
);


ALTER TABLE "public"."daily_check_ins" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_check_ins" IS 'Daily check-in records for client compliance tracking';



COMMENT ON COLUMN "public"."daily_check_ins"."workout_completed" IS 'Whether the client completed their workout for the day';



COMMENT ON COLUMN "public"."daily_check_ins"."steps_goal_met" IS 'Whether the client met their daily steps goal';



COMMENT ON COLUMN "public"."daily_check_ins"."steps_actual" IS 'Actual number of steps taken (optional, for detailed tracking)';



COMMENT ON COLUMN "public"."daily_check_ins"."nutrition_goal_met" IS 'Whether the client met their nutrition/macro goals';



COMMENT ON COLUMN "public"."daily_check_ins"."supplements_taken" IS 'JSONB array of supplement names that were taken';



COMMENT ON COLUMN "public"."daily_check_ins"."weight" IS 'Weight measurement in kg (משקל)';



COMMENT ON COLUMN "public"."daily_check_ins"."belly_circumference" IS 'Belly circumference in cm (היקף בטן)';



COMMENT ON COLUMN "public"."daily_check_ins"."waist_circumference" IS 'Waist circumference in cm (היקף מותן)';



COMMENT ON COLUMN "public"."daily_check_ins"."thigh_circumference" IS 'Thigh circumference in cm (היקף ירכיים)';



COMMENT ON COLUMN "public"."daily_check_ins"."arm_circumference" IS 'Arm circumference in cm (היקף יד)';



COMMENT ON COLUMN "public"."daily_check_ins"."neck_circumference" IS 'Neck circumference in cm (היקף צוואר)';



COMMENT ON COLUMN "public"."daily_check_ins"."exercises_count" IS 'Number of exercises completed (כמה תרגילים עשית)';



COMMENT ON COLUMN "public"."daily_check_ins"."cardio_amount" IS 'Cardio duration in minutes (כמה אירובי עשית)';



COMMENT ON COLUMN "public"."daily_check_ins"."intervals_count" IS 'Number of interval training sessions (כמה אינטרוולים)';



COMMENT ON COLUMN "public"."daily_check_ins"."calories_daily" IS 'Daily calorie intake (קלוריות יומי)';



COMMENT ON COLUMN "public"."daily_check_ins"."protein_daily" IS 'Daily protein intake in grams (חלבון יומי)';



COMMENT ON COLUMN "public"."daily_check_ins"."fiber_daily" IS 'Daily fiber intake in grams (סיבים יומי)';



COMMENT ON COLUMN "public"."daily_check_ins"."water_amount" IS 'Water consumed in liters (כמה מים שתית)';



COMMENT ON COLUMN "public"."daily_check_ins"."stress_level" IS 'Daily stress level 1-10 (רמת הלחץ היומי)';



COMMENT ON COLUMN "public"."daily_check_ins"."hunger_level" IS 'Hunger level 1-10 (רמת הרעב שלך)';



COMMENT ON COLUMN "public"."daily_check_ins"."energy_level" IS 'Energy level 1-10 (רמת האנרגיה שלך)';



COMMENT ON COLUMN "public"."daily_check_ins"."sleep_hours" IS 'Hours of sleep (כמה שעות ישנת)';



CREATE TABLE IF NOT EXISTS "public"."external_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[],
    "videos" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "cover_image" "text",
    CONSTRAINT "external_knowledge_base_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."external_knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."external_knowledge_base" IS 'External knowledge base for storing articles that clients can view. Only published articles are visible to clients.';



COMMENT ON COLUMN "public"."external_knowledge_base"."content" IS 'JSONB structured content with blocks. Format: { "blocks": [{ "type": "text|image|video", "content": "...", "url": "..." }] }';



COMMENT ON COLUMN "public"."external_knowledge_base"."images" IS 'DEPRECATED: Legacy array of image URLs. Use inline media in content blocks instead.';



COMMENT ON COLUMN "public"."external_knowledge_base"."videos" IS 'DEPRECATED: Legacy array of video URLs. Use inline media in content blocks instead.';



COMMENT ON COLUMN "public"."external_knowledge_base"."status" IS 'Status of the article: draft (only visible to managers) or published (visible to all clients)';



COMMENT ON COLUMN "public"."external_knowledge_base"."cover_image" IS 'Cover image URL for the article card display';



CREATE TABLE IF NOT EXISTS "public"."fillout_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fillout_submission_id" "text" NOT NULL,
    "fillout_form_id" "text" NOT NULL,
    "submission_type" "text",
    "submission_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."fillout_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."fillout_submissions" IS 'Stores all Fillout form submissions with type for easy categorization';



COMMENT ON COLUMN "public"."fillout_submissions"."fillout_submission_id" IS 'Unique identifier from Fillout submission';



COMMENT ON COLUMN "public"."fillout_submissions"."fillout_form_id" IS 'Form ID from Fillout';



COMMENT ON COLUMN "public"."fillout_submissions"."submission_type" IS 'Type of submission (e.g., meeting, questionnaire) - extracted from form submission';



COMMENT ON COLUMN "public"."fillout_submissions"."submission_data" IS 'Flexible JSONB containing all form submission data';



COMMENT ON COLUMN "public"."fillout_submissions"."lead_id" IS 'Link to the lead that the submission is associated with';



COMMENT ON COLUMN "public"."fillout_submissions"."customer_id" IS 'Link to the customer that the submission is associated with';



CREATE TABLE IF NOT EXISTS "public"."green_api_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_instance" "text" NOT NULL,
    "api_token_instance" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."green_api_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."green_api_settings" IS 'Stores Green API credentials for WhatsApp messaging';



COMMENT ON COLUMN "public"."green_api_settings"."id_instance" IS 'Green API instance ID';



COMMENT ON COLUMN "public"."green_api_settings"."api_token_instance" IS 'Green API token instance';



CREATE TABLE IF NOT EXISTS "public"."interface_folders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "interface_key" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interface_folders" OWNER TO "postgres";


COMMENT ON TABLE "public"."interface_folders" IS 'User-defined folders for organizing pages under interfaces';



COMMENT ON COLUMN "public"."interface_folders"."name" IS 'Name of the folder';



COMMENT ON COLUMN "public"."interface_folders"."interface_key" IS 'The interface this folder belongs to (e.g., "leads", "customers")';



COMMENT ON COLUMN "public"."interface_folders"."display_order" IS 'Display order for the folder (lower numbers appear first)';



CREATE TABLE IF NOT EXISTS "public"."internal_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "video_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "duration" integer,
    "additional_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."internal_knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."internal_knowledge_base" IS 'Internal knowledge base for storing video links and resources for staff/managers (NOT customer-related)';



COMMENT ON COLUMN "public"."internal_knowledge_base"."video_url" IS 'Video link URL (external link, no storage)';



COMMENT ON COLUMN "public"."internal_knowledge_base"."tags" IS 'Array of tags for categorization and filtering';



COMMENT ON COLUMN "public"."internal_knowledge_base"."duration" IS 'Duration in seconds (optional)';



COMMENT ON COLUMN "public"."internal_knowledge_base"."additional_info" IS 'Flexible JSONB field for additional metadata';



CREATE TABLE IF NOT EXISTS "public"."invitation_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invitation_id" "uuid",
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitation_audit_log_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'sent'::"text", 'resent'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text", 'viewed'::"text"])))
);


ALTER TABLE "public"."invitation_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."invitation_audit_log" IS 'Audit log for all invitation-related actions for security compliance';



CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "fillout_submission_id" "text",
    "meeting_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


COMMENT ON TABLE "public"."meetings" IS 'Stores meeting data from Fillout form submissions';



COMMENT ON COLUMN "public"."meetings"."lead_id" IS 'Link to the lead that the meeting is associated with';



COMMENT ON COLUMN "public"."meetings"."customer_id" IS 'Link to the customer that the meeting is associated with';



COMMENT ON COLUMN "public"."meetings"."fillout_submission_id" IS 'Unique identifier from Fillout submission';



COMMENT ON COLUMN "public"."meetings"."meeting_data" IS 'Flexible JSONB containing all meeting data from Fillout form, including Schedule field for actual meeting date/time';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "lead_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_url" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores real-time notifications for admin users about trainee activities';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Type of notification: weight_updated, meal_logged, check_in_completed, etc.';



COMMENT ON COLUMN "public"."notifications"."action_url" IS 'URL to navigate when clicking the notification';



COMMENT ON COLUMN "public"."notifications"."metadata" IS 'Additional context data in JSON format';



CREATE TABLE IF NOT EXISTS "public"."nutrition_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "template_id" "uuid",
    "start_date" "date" NOT NULL,
    "description" "text",
    "targets" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "customer_id" "uuid" NOT NULL,
    "budget_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."nutrition_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."nutrition_plans" IS 'User nutrition plans linked to leads (snapshot pattern - independent from templates)';



COMMENT ON COLUMN "public"."nutrition_plans"."lead_id" IS 'DEPRECATED: Use customer_id instead. This column is kept for historical data only.';



COMMENT ON COLUMN "public"."nutrition_plans"."template_id" IS 'Reference to the template this plan was created from (for tracking only, changes to template do not affect this plan)';



COMMENT ON COLUMN "public"."nutrition_plans"."start_date" IS 'Date when the nutrition plan starts';



COMMENT ON COLUMN "public"."nutrition_plans"."targets" IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number } - This is a snapshot, independent from the template';



COMMENT ON COLUMN "public"."nutrition_plans"."customer_id" IS 'Reference to the customer this nutrition plan belongs to (coaching data)';



COMMENT ON COLUMN "public"."nutrition_plans"."budget_id" IS 'Reference to the budget this nutrition plan was created from';



COMMENT ON COLUMN "public"."nutrition_plans"."is_active" IS 'Whether this nutrition plan is currently active';



COMMENT ON COLUMN "public"."nutrition_plans"."deleted_at" IS 'Timestamp when this nutrition plan was deleted (soft delete)';



CREATE TABLE IF NOT EXISTS "public"."nutrition_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "targets" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "manual_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "activity_entries" "jsonb" DEFAULT '[]'::"jsonb",
    "manual_override" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."nutrition_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."nutrition_templates" IS 'Reusable nutrition templates for macro-nutrient planning and calculation';



COMMENT ON COLUMN "public"."nutrition_templates"."name" IS 'Template name';



COMMENT ON COLUMN "public"."nutrition_templates"."description" IS 'Template description';



COMMENT ON COLUMN "public"."nutrition_templates"."targets" IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number }';



COMMENT ON COLUMN "public"."nutrition_templates"."is_public" IS 'Whether the template is publicly visible to all users';



COMMENT ON COLUMN "public"."nutrition_templates"."manual_fields" IS 'JSONB storing manual fields: { steps: number | null, workouts: text | null, supplements: text | null }';



COMMENT ON COLUMN "public"."nutrition_templates"."activity_entries" IS 'JSONB array storing activity entries for METs calculation: [{ id: string, activityType: string, mets: number, minutesPerWeek: number }]';



COMMENT ON COLUMN "public"."nutrition_templates"."manual_override" IS 'JSONB tracking which macro/calorie fields have been manually overridden: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }';



CREATE OR REPLACE VIEW "public"."nutrition_templates_with_ranges" AS
 SELECT "id",
    "name",
    "description",
    "targets",
    "is_public",
    "created_at",
    "updated_at",
    "created_by",
    "manual_fields",
    "activity_entries",
    "manual_override",
    (("targets" ->> 'calories'::"text"))::numeric AS "calories_value",
    (("targets" ->> 'protein'::"text"))::numeric AS "protein_value"
   FROM "public"."nutrition_templates" "t";


ALTER VIEW "public"."nutrition_templates_with_ranges" OWNER TO "postgres";


COMMENT ON VIEW "public"."nutrition_templates_with_ranges" IS 'Nutrition templates with numeric calories/protein values for filtering.';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "product_name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'ILS'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "stripe_payment_id" "text",
    "transaction_id" "text",
    "receipt_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['שולם'::"text", 'ממתין'::"text", 'הוחזר'::"text", 'נכשל'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Customer/lead payment records. NO sensitive payment data (card numbers, CVV, passwords) stored.';



COMMENT ON COLUMN "public"."payments"."status" IS 'Payment status in Hebrew: שולם (paid), ממתין (pending), הוחזר (refunded), נכשל (failed)';



COMMENT ON COLUMN "public"."payments"."stripe_payment_id" IS 'Stripe payment intent ID - external reference only';



COMMENT ON COLUMN "public"."payments"."transaction_id" IS 'Transaction ID for tracking purposes';



COMMENT ON COLUMN "public"."payments"."receipt_url" IS 'URL to receipt document (stored in secure storage)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'trainee'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles linked to auth.users, manages roles and user metadata';



COMMENT ON COLUMN "public"."profiles"."role" IS 'User role: admin (coach/admin), user (coach), trainee (client/trainee)';



COMMENT ON COLUMN "public"."profiles"."is_active" IS 'Whether the user account is active (trainee access gating)';



CREATE TABLE IF NOT EXISTS "public"."saved_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "resource_key" "text" NOT NULL,
    "view_name" "text" NOT NULL,
    "filter_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "icon_name" "text",
    "display_order" integer,
    "folder_id" "uuid",
    CONSTRAINT "saved_views_resource_key_check" CHECK (("resource_key" = ANY (ARRAY['leads'::"text", 'workouts'::"text", 'customers'::"text", 'templates'::"text", 'nutrition_templates'::"text", 'budgets'::"text", 'meetings'::"text", 'check_in_settings'::"text", 'payments'::"text"])))
);


ALTER TABLE "public"."saved_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_views" IS 'User-defined saved views/filters for different resources (leads, workouts, etc.)';



COMMENT ON COLUMN "public"."saved_views"."resource_key" IS 'The resource type this view applies to (e.g., "leads", "workouts")';



COMMENT ON COLUMN "public"."saved_views"."view_name" IS 'User-friendly name for the saved view';



COMMENT ON COLUMN "public"."saved_views"."filter_config" IS 'JSONB object storing the complete filter/sort state for this view';



COMMENT ON COLUMN "public"."saved_views"."is_default" IS 'Whether this is the default view for the resource (only one default per resource per user)';



COMMENT ON COLUMN "public"."saved_views"."icon_name" IS 'Name of the Lucide icon component to use for this view (e.g., "Users", "Dumbbell", "Flame"). If NULL, uses default icon for the resource_key.';



COMMENT ON COLUMN "public"."saved_views"."display_order" IS 'Display order for the page/view (0 for default view, higher numbers appear later)';



COMMENT ON COLUMN "public"."saved_views"."folder_id" IS 'Optional folder this page belongs to. NULL means the page is directly under the interface.';



CREATE TABLE IF NOT EXISTS "public"."steps_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "budget_id" "uuid",
    "template_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "description" "text",
    "steps_goal" integer DEFAULT 0 NOT NULL,
    "steps_instructions" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."steps_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."steps_plans" IS 'Steps plans linked to leads/customers and budgets';



COMMENT ON COLUMN "public"."steps_plans"."budget_id" IS 'Reference to the budget this steps plan was created from';



COMMENT ON COLUMN "public"."steps_plans"."steps_goal" IS 'Daily steps goal for this plan';



COMMENT ON COLUMN "public"."steps_plans"."steps_instructions" IS 'Instructions and guidelines for daily steps';



CREATE TABLE IF NOT EXISTS "public"."subscription_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "duration" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "currency" "text" DEFAULT 'ILS'::"text" NOT NULL,
    "duration_unit" "text" DEFAULT 'months'::"text" NOT NULL,
    CONSTRAINT "subscription_types_currency_check" CHECK (("currency" = ANY (ARRAY['ILS'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "subscription_types_duration_unit_check" CHECK (("duration_unit" = ANY (ARRAY['days'::"text", 'weeks'::"text", 'months'::"text"])))
);


ALTER TABLE "public"."subscription_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_types" IS 'Master subscription type templates that can be used to populate lead subscription data';



COMMENT ON COLUMN "public"."subscription_types"."duration" IS 'Duration value (interpreted based on duration_unit)';



COMMENT ON COLUMN "public"."subscription_types"."price" IS 'Price amount (value varies based on currency)';



COMMENT ON COLUMN "public"."subscription_types"."currency" IS 'Currency code: ILS (Israeli Shekel), USD (US Dollar), or EUR (Euro)';



COMMENT ON COLUMN "public"."subscription_types"."duration_unit" IS 'Unit for duration: days, weeks, or months';



CREATE TABLE IF NOT EXISTS "public"."supplement_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "budget_id" "uuid",
    "template_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "description" "text",
    "supplements" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."supplement_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplement_plans" IS 'Supplement plans linked to leads/customers and budgets';



COMMENT ON COLUMN "public"."supplement_plans"."budget_id" IS 'Reference to the budget this supplement plan was created from';



COMMENT ON COLUMN "public"."supplement_plans"."supplements" IS 'JSONB array of supplements: [{ name: string, dosage: string, timing: string }]';



CREATE TABLE IF NOT EXISTS "public"."user_interface_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "interface_key" "text" NOT NULL,
    "icon_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_order" integer
);


ALTER TABLE "public"."user_interface_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_interface_preferences" IS 'User preferences for customizing interface icons';



COMMENT ON COLUMN "public"."user_interface_preferences"."interface_key" IS 'The interface identifier (e.g., "leads", "customers", "templates")';



COMMENT ON COLUMN "public"."user_interface_preferences"."icon_name" IS 'The Lucide icon name (e.g., "Users", "Dumbbell", "LayoutDashboard")';



COMMENT ON COLUMN "public"."user_interface_preferences"."display_order" IS 'Display order for the interface (lower numbers appear first)';



CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "customer_id" "uuid",
    "lead_id" "uuid",
    "token_hash" "text" NOT NULL,
    "token_salt" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_invitations_email_user_id_check" CHECK ((("email" IS NOT NULL) OR ("user_id" IS NOT NULL))),
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Secure invitation system for trainee user creation without passwords';



COMMENT ON COLUMN "public"."user_invitations"."token_hash" IS 'SHA-256 hash of the invitation token (never store plaintext)';



COMMENT ON COLUMN "public"."user_invitations"."token_salt" IS 'Random salt used for token hashing';



COMMENT ON COLUMN "public"."user_invitations"."status" IS 'Invitation status: pending, sent, accepted, expired, revoked';



COMMENT ON COLUMN "public"."user_invitations"."expires_at" IS 'Token expiration timestamp (default 7 days from creation)';



CREATE OR REPLACE VIEW "public"."v_leads_with_customer" AS
 SELECT "l"."id",
    "l"."created_at",
    "l"."updated_at",
    "l"."assigned_to",
    "l"."customer_id",
    "l"."city",
    "l"."birth_date",
    "l"."age",
    "l"."gender",
    "l"."period",
    "l"."status_main",
    "l"."status_sub",
    "l"."height",
    "l"."weight",
    "l"."bmi",
    "l"."join_date",
    "l"."subscription_data",
    "l"."daily_protocol",
    "l"."workout_history",
    "l"."steps_history",
    "l"."source",
    "l"."fitness_goal",
    "l"."activity_level",
    "l"."preferred_time",
    "l"."notes",
    "c"."full_name" AS "customer_name",
    "c"."phone" AS "customer_phone",
    "c"."email" AS "customer_email",
    "to_char"("l"."created_at", 'YYYY-MM-DD'::"text") AS "created_date_formatted",
    "to_char"(("l"."birth_date")::timestamp with time zone, 'YYYY-MM-DD'::"text") AS "birth_date_formatted",
    (("l"."daily_protocol" ->> 'stepsGoal'::"text"))::integer AS "daily_steps_goal",
    (("l"."daily_protocol" ->> 'workoutGoal'::"text"))::integer AS "weekly_workouts",
        CASE
            WHEN (("l"."daily_protocol" -> 'supplements'::"text") IS NULL) THEN ARRAY[]::"text"[]
            WHEN ("jsonb_typeof"(("l"."daily_protocol" -> 'supplements'::"text")) = 'array'::"text") THEN ARRAY( SELECT "jsonb_array_elements_text"(("l"."daily_protocol" -> 'supplements'::"text")) AS "jsonb_array_elements_text")
            ELSE ARRAY[]::"text"[]
        END AS "daily_supplements",
    (("l"."subscription_data" ->> 'months'::"text"))::integer AS "subscription_months",
    (("l"."subscription_data" ->> 'initialPrice'::"text"))::numeric AS "subscription_initial_price",
    (("l"."subscription_data" ->> 'renewalPrice'::"text"))::numeric AS "subscription_renewal_price"
   FROM ("public"."leads" "l"
     LEFT JOIN "public"."customers" "c" ON (("l"."customer_id" = "c"."id")));


ALTER VIEW "public"."v_leads_with_customer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "customer_id" "uuid",
    "week_start_date" "date" NOT NULL,
    "week_end_date" "date" NOT NULL,
    "target_calories" integer,
    "target_protein" integer,
    "target_carbs" integer,
    "target_fat" integer,
    "target_fiber" integer,
    "target_steps" integer,
    "actual_calories_avg" numeric(10,2),
    "actual_protein_avg" numeric(10,2),
    "actual_carbs_avg" numeric(10,2),
    "actual_fat_avg" numeric(10,2),
    "actual_fiber_avg" numeric(10,2),
    "actual_calories_weekly_avg" numeric(10,2),
    "weekly_avg_weight" numeric(5,2),
    "waist_measurement" integer,
    "trainer_summary" "text",
    "action_plan" "text",
    "updated_steps_goal" integer,
    "updated_calories_target" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "target_weight" numeric(5,2),
    "target_waist" integer
);


ALTER TABLE "public"."weekly_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."weekly_reviews" IS 'Weekly strategy reviews linking trainer insights with client check-in data';



COMMENT ON COLUMN "public"."weekly_reviews"."week_start_date" IS 'First day of the week being reviewed';



COMMENT ON COLUMN "public"."weekly_reviews"."week_end_date" IS 'Last day of the week being reviewed';



COMMENT ON COLUMN "public"."weekly_reviews"."target_calories" IS 'Target calories from active budget/protocol at time of review';



COMMENT ON COLUMN "public"."weekly_reviews"."actual_calories_avg" IS 'Average daily calories from check-ins during the week';



COMMENT ON COLUMN "public"."weekly_reviews"."weekly_avg_weight" IS 'Average weight for the week from daily check-ins';



COMMENT ON COLUMN "public"."weekly_reviews"."waist_measurement" IS 'Latest waist measurement from body metrics section';



COMMENT ON COLUMN "public"."weekly_reviews"."trainer_summary" IS 'Trainer summary and insights (סיכום ומסקנות)';



COMMENT ON COLUMN "public"."weekly_reviews"."action_plan" IS 'Action plan for next week (דגשים לשבוע הקרוב)';



COMMENT ON COLUMN "public"."weekly_reviews"."target_weight" IS 'Target weight for the week (kg)';



COMMENT ON COLUMN "public"."weekly_reviews"."target_waist" IS 'Target waist circumference for the week (cm)';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_flow_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "flow_key" "text" NOT NULL,
    "template_content" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buttons" "jsonb" DEFAULT '[]'::"jsonb",
    "media" "jsonb",
    CONSTRAINT "check_buttons_max_count" CHECK (("jsonb_array_length"(COALESCE("buttons", '[]'::"jsonb")) <= 3))
);


ALTER TABLE "public"."whatsapp_flow_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_flow_templates" IS 'Stores WhatsApp message templates for automation flows';



COMMENT ON COLUMN "public"."whatsapp_flow_templates"."flow_key" IS 'Unique identifier for the flow (e.g., customer_journey_start, intro_questionnaire)';



COMMENT ON COLUMN "public"."whatsapp_flow_templates"."template_content" IS 'Message template with placeholders like {{name}}, {{phone}}, etc.';



COMMENT ON COLUMN "public"."whatsapp_flow_templates"."buttons" IS 'Array of interactive buttons: [{"id": "1", "text": "Button Text"}]';



COMMENT ON COLUMN "public"."whatsapp_flow_templates"."media" IS 'Media attachment for template (image, video, or GIF) stored as JSONB: { type: "image"|"video"|"gif", url: string }';



CREATE TABLE IF NOT EXISTS "public"."workout_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "start_date" "date" NOT NULL,
    "description" "text",
    "strength" integer DEFAULT 0,
    "cardio" integer DEFAULT 0,
    "intervals" integer DEFAULT 0,
    "custom_attributes" "jsonb" DEFAULT '{"data": {}, "schema": []}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "template_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "customer_id" "uuid" NOT NULL,
    "budget_id" "uuid"
);


ALTER TABLE "public"."workout_plans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workout_plans"."lead_id" IS 'DEPRECATED: Use customer_id instead. This column is kept for historical data only.';



COMMENT ON COLUMN "public"."workout_plans"."customer_id" IS 'Reference to the customer this workout plan belongs to (coaching data)';



COMMENT ON COLUMN "public"."workout_plans"."budget_id" IS 'Reference to the budget this workout plan was created from';



CREATE TABLE IF NOT EXISTS "public"."workout_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "goal_tags" "text"[] DEFAULT '{}'::"text"[],
    "routine_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."workout_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."workout_templates" IS 'Reusable workout templates that can be imported by users to create workout plans';



COMMENT ON COLUMN "public"."workout_templates"."name" IS 'Template name';



COMMENT ON COLUMN "public"."workout_templates"."description" IS 'Template description';



COMMENT ON COLUMN "public"."workout_templates"."goal_tags" IS 'Array of goal tags (e.g., ["חיטוב", "כוח", "סיבולת"])';



COMMENT ON COLUMN "public"."workout_templates"."routine_data" IS 'JSONB containing the workout routine data (matches workout_plans.custom_attributes.data.weeklyWorkout schema)';



COMMENT ON COLUMN "public"."workout_templates"."is_public" IS 'Whether the template is publicly visible to all users';



CREATE OR REPLACE VIEW "public"."workout_templates_with_leads" AS
 SELECT "id",
    "name",
    "description",
    "goal_tags",
    "routine_data",
    "is_public",
    "created_at",
    "updated_at",
    "created_by",
    (EXISTS ( SELECT 1
           FROM "public"."workout_plans" "wp"
          WHERE (("wp"."template_id" = "t"."id") AND ("wp"."lead_id" IS NOT NULL)))) AS "has_leads"
   FROM "public"."workout_templates" "t";


ALTER VIEW "public"."workout_templates_with_leads" OWNER TO "postgres";


COMMENT ON VIEW "public"."workout_templates_with_leads" IS 'Workout templates with has_leads flag for filtering.';



CREATE TABLE IF NOT EXISTS "supabase_migrations"."schema_migrations" (
    "version" "text" NOT NULL,
    "statements" "text"[],
    "name" "text"
);


ALTER TABLE "supabase_migrations"."schema_migrations" OWNER TO "postgres";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blood_tests"
    ADD CONSTRAINT "blood_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_in_field_configurations"
    ADD CONSTRAINT "check_in_field_configurations_customer_unique" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."check_in_field_configurations"
    ADD CONSTRAINT "check_in_field_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_check_ins"
    ADD CONSTRAINT "daily_check_ins_customer_id_check_in_date_key" UNIQUE ("customer_id", "check_in_date");



ALTER TABLE ONLY "public"."daily_check_ins"
    ADD CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_knowledge_base"
    ADD CONSTRAINT "external_knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fillout_submissions"
    ADD CONSTRAINT "fillout_submissions_fillout_submission_id_key" UNIQUE ("fillout_submission_id");



ALTER TABLE ONLY "public"."fillout_submissions"
    ADD CONSTRAINT "fillout_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."green_api_settings"
    ADD CONSTRAINT "green_api_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interface_folders"
    ADD CONSTRAINT "interface_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."internal_knowledge_base"
    ADD CONSTRAINT "internal_knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_audit_log"
    ADD CONSTRAINT "invitation_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_templates"
    ADD CONSTRAINT "nutrition_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_views"
    ADD CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_types"
    ADD CONSTRAINT "subscription_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interface_folders"
    ADD CONSTRAINT "unique_folder_name_per_interface_user" UNIQUE ("interface_key", "user_id", "name");



ALTER TABLE ONLY "public"."user_interface_preferences"
    ADD CONSTRAINT "unique_user_interface_preference" UNIQUE ("user_id", "interface_key");



ALTER TABLE ONLY "public"."saved_views"
    ADD CONSTRAINT "unique_view_name_per_resource_user" UNIQUE ("resource_key", "created_by", "view_name");



ALTER TABLE ONLY "public"."user_interface_preferences"
    ADD CONSTRAINT "user_interface_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_customer_id_week_start_date_key" UNIQUE ("customer_id", "week_start_date");



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_lead_id_week_start_date_key" UNIQUE ("lead_id", "week_start_date");



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_flow_templates"
    ADD CONSTRAINT "whatsapp_flow_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_flow_templates"
    ADD CONSTRAINT "whatsapp_flow_templates_user_id_flow_key_key" UNIQUE ("user_id", "flow_key");



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "idx_blood_tests_lead_id" ON "public"."blood_tests" USING "btree" ("lead_id");



CREATE INDEX "idx_blood_tests_upload_date" ON "public"."blood_tests" USING "btree" ("upload_date" DESC);



CREATE INDEX "idx_blood_tests_uploaded_by" ON "public"."blood_tests" USING "btree" ("uploaded_by");



CREATE INDEX "idx_budget_assignments_assigned_at" ON "public"."budget_assignments" USING "btree" ("assigned_at" DESC);



CREATE INDEX "idx_budget_assignments_budget_id" ON "public"."budget_assignments" USING "btree" ("budget_id");



CREATE INDEX "idx_budget_assignments_customer_id" ON "public"."budget_assignments" USING "btree" ("customer_id");



CREATE INDEX "idx_budget_assignments_is_active" ON "public"."budget_assignments" USING "btree" ("is_active");



CREATE INDEX "idx_budget_assignments_lead_id" ON "public"."budget_assignments" USING "btree" ("lead_id");



CREATE UNIQUE INDEX "idx_budget_assignments_unique_active_customer" ON "public"."budget_assignments" USING "btree" ("customer_id") WHERE (("is_active" = true) AND ("customer_id" IS NOT NULL));



CREATE UNIQUE INDEX "idx_budget_assignments_unique_active_lead" ON "public"."budget_assignments" USING "btree" ("lead_id") WHERE (("is_active" = true) AND ("lead_id" IS NOT NULL));



CREATE INDEX "idx_budgets_created_at" ON "public"."budgets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_budgets_created_by" ON "public"."budgets" USING "btree" ("created_by");



CREATE INDEX "idx_budgets_is_public" ON "public"."budgets" USING "btree" ("is_public");



CREATE INDEX "idx_budgets_nutrition_targets" ON "public"."budgets" USING "gin" ("nutrition_targets");



CREATE INDEX "idx_budgets_nutrition_template_id" ON "public"."budgets" USING "btree" ("nutrition_template_id");



CREATE INDEX "idx_budgets_supplements" ON "public"."budgets" USING "gin" ("supplements");



CREATE INDEX "idx_budgets_workout_template_id" ON "public"."budgets" USING "btree" ("workout_template_id");



CREATE INDEX "idx_check_in_field_configurations_customer_id" ON "public"."check_in_field_configurations" USING "btree" ("customer_id");



CREATE INDEX "idx_check_in_field_configurations_global" ON "public"."check_in_field_configurations" USING "btree" ((("customer_id" IS NULL)));



CREATE INDEX "idx_customer_notes_attachment_url" ON "public"."customer_notes" USING "btree" ("attachment_url") WHERE ("attachment_url" IS NOT NULL);



CREATE INDEX "idx_customer_notes_created_at" ON "public"."customer_notes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_customer_notes_customer_id" ON "public"."customer_notes" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_notes_lead_id" ON "public"."customer_notes" USING "btree" ("lead_id");



CREATE INDEX "idx_customers_created_at" ON "public"."customers" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_customers_daily_protocol" ON "public"."customers" USING "gin" ("daily_protocol");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_customers_membership_tier" ON "public"."customers" USING "btree" ("membership_tier");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_customers_steps_history" ON "public"."customers" USING "gin" ("steps_history");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_customers_user_id_unique" ON "public"."customers" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_customers_workout_history" ON "public"."customers" USING "gin" ("workout_history");



CREATE INDEX "idx_daily_check_ins_customer_date" ON "public"."daily_check_ins" USING "btree" ("customer_id", "check_in_date" DESC);



CREATE INDEX "idx_daily_check_ins_customer_id" ON "public"."daily_check_ins" USING "btree" ("customer_id");



CREATE INDEX "idx_daily_check_ins_date" ON "public"."daily_check_ins" USING "btree" ("check_in_date" DESC);



CREATE INDEX "idx_daily_check_ins_lead_id" ON "public"."daily_check_ins" USING "btree" ("lead_id");



CREATE INDEX "idx_external_kb_cover_image" ON "public"."external_knowledge_base" USING "btree" ("cover_image") WHERE ("cover_image" IS NOT NULL);



CREATE INDEX "idx_external_kb_created_at" ON "public"."external_knowledge_base" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_external_kb_created_by" ON "public"."external_knowledge_base" USING "btree" ("created_by");



CREATE INDEX "idx_external_kb_status" ON "public"."external_knowledge_base" USING "btree" ("status");



CREATE INDEX "idx_external_kb_status_published" ON "public"."external_knowledge_base" USING "btree" ("status", "created_at" DESC) WHERE ("status" = 'published'::"text");



CREATE INDEX "idx_external_kb_title" ON "public"."external_knowledge_base" USING "btree" ("title");



CREATE INDEX "idx_fillout_submissions_created_at" ON "public"."fillout_submissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fillout_submissions_customer_id" ON "public"."fillout_submissions" USING "btree" ("customer_id");



CREATE INDEX "idx_fillout_submissions_fillout_form_id" ON "public"."fillout_submissions" USING "btree" ("fillout_form_id");



CREATE INDEX "idx_fillout_submissions_fillout_submission_id" ON "public"."fillout_submissions" USING "btree" ("fillout_submission_id");



CREATE INDEX "idx_fillout_submissions_lead_id" ON "public"."fillout_submissions" USING "btree" ("lead_id");



CREATE INDEX "idx_fillout_submissions_submission_type" ON "public"."fillout_submissions" USING "btree" ("submission_type");



CREATE INDEX "idx_interface_folders_display_order" ON "public"."interface_folders" USING "btree" ("interface_key", "user_id", "display_order");



CREATE INDEX "idx_interface_folders_interface_key" ON "public"."interface_folders" USING "btree" ("interface_key");



CREATE INDEX "idx_interface_folders_interface_user" ON "public"."interface_folders" USING "btree" ("interface_key", "user_id");



CREATE INDEX "idx_interface_folders_user_id" ON "public"."interface_folders" USING "btree" ("user_id");



CREATE INDEX "idx_internal_kb_created_at" ON "public"."internal_knowledge_base" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_internal_kb_created_by" ON "public"."internal_knowledge_base" USING "btree" ("created_by");



CREATE INDEX "idx_internal_kb_tags" ON "public"."internal_knowledge_base" USING "gin" ("tags");



CREATE INDEX "idx_internal_kb_title" ON "public"."internal_knowledge_base" USING "btree" ("title");



CREATE INDEX "idx_invitation_audit_log_created_at" ON "public"."invitation_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invitation_audit_log_invitation_id" ON "public"."invitation_audit_log" USING "btree" ("invitation_id");



CREATE INDEX "idx_invitation_audit_log_performed_by" ON "public"."invitation_audit_log" USING "btree" ("performed_by");



CREATE INDEX "idx_leads_activity_level" ON "public"."leads" USING "btree" ("activity_level") WHERE ("activity_level" IS NOT NULL);



CREATE INDEX "idx_leads_age" ON "public"."leads" USING "btree" ("age") WHERE ("age" IS NOT NULL);



CREATE INDEX "idx_leads_assigned_to" ON "public"."leads" USING "btree" ("assigned_to");



CREATE INDEX "idx_leads_birth_date" ON "public"."leads" USING "btree" ("birth_date") WHERE ("birth_date" IS NOT NULL);



CREATE INDEX "idx_leads_created_at" ON "public"."leads" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_leads_customer_id" ON "public"."leads" USING "btree" ("customer_id");



CREATE INDEX "idx_leads_daily_protocol" ON "public"."leads" USING "gin" ("daily_protocol");



CREATE INDEX "idx_leads_fitness_goal" ON "public"."leads" USING "btree" ("fitness_goal") WHERE ("fitness_goal" IS NOT NULL);



CREATE INDEX "idx_leads_join_date" ON "public"."leads" USING "btree" ("join_date");



CREATE INDEX "idx_leads_nutrition_history" ON "public"."leads" USING "gin" ("nutrition_history");



CREATE INDEX "idx_leads_period" ON "public"."leads" USING "btree" ("period") WHERE ("period" IS NOT NULL);



CREATE INDEX "idx_leads_preferred_time" ON "public"."leads" USING "btree" ("preferred_time") WHERE ("preferred_time" IS NOT NULL);



CREATE INDEX "idx_leads_source" ON "public"."leads" USING "btree" ("source") WHERE ("source" IS NOT NULL);



CREATE INDEX "idx_leads_status_main" ON "public"."leads" USING "btree" ("status_main");



CREATE INDEX "idx_leads_status_source" ON "public"."leads" USING "btree" ("status_main", "source") WHERE (("status_main" IS NOT NULL) AND ("source" IS NOT NULL));



CREATE INDEX "idx_leads_status_sub" ON "public"."leads" USING "btree" ("status_sub");



CREATE INDEX "idx_leads_steps_history" ON "public"."leads" USING "gin" ("steps_history");



CREATE INDEX "idx_leads_subscription_data" ON "public"."leads" USING "gin" ("subscription_data");



CREATE INDEX "idx_leads_supplements_history" ON "public"."leads" USING "gin" ("supplements_history");



CREATE INDEX "idx_leads_workout_history" ON "public"."leads" USING "gin" ("workout_history");



CREATE INDEX "idx_meetings_created_at" ON "public"."meetings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_meetings_customer_id" ON "public"."meetings" USING "btree" ("customer_id");



CREATE INDEX "idx_meetings_fillout_submission_id" ON "public"."meetings" USING "btree" ("fillout_submission_id");



CREATE INDEX "idx_meetings_lead_id" ON "public"."meetings" USING "btree" ("lead_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_customer_id" ON "public"."notifications" USING "btree" ("customer_id");



CREATE INDEX "idx_notifications_lead_id" ON "public"."notifications" USING "btree" ("lead_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_nutrition_plans_budget_customer_perf" ON "public"."nutrition_plans" USING "btree" ("budget_id", "customer_id") WHERE (("budget_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE INDEX "idx_nutrition_plans_budget_id" ON "public"."nutrition_plans" USING "btree" ("budget_id");



CREATE INDEX "idx_nutrition_plans_budget_id_perf" ON "public"."nutrition_plans" USING "btree" ("budget_id") WHERE ("budget_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_nutrition_plans_budget_id_perf" IS 'Performance index for querying nutrition plans by budget_id';



CREATE INDEX "idx_nutrition_plans_budget_lead_perf" ON "public"."nutrition_plans" USING "btree" ("budget_id", "lead_id") WHERE (("budget_id" IS NOT NULL) AND ("lead_id" IS NOT NULL));



CREATE INDEX "idx_nutrition_plans_created_at" ON "public"."nutrition_plans" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_nutrition_plans_customer_id" ON "public"."nutrition_plans" USING "btree" ("customer_id");



CREATE INDEX "idx_nutrition_plans_deleted_at" ON "public"."nutrition_plans" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_nutrition_plans_is_active" ON "public"."nutrition_plans" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_nutrition_plans_lead_id" ON "public"."nutrition_plans" USING "btree" ("lead_id");



CREATE INDEX "idx_nutrition_plans_start_date" ON "public"."nutrition_plans" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_nutrition_plans_targets" ON "public"."nutrition_plans" USING "gin" ("targets");



CREATE INDEX "idx_nutrition_plans_template_id" ON "public"."nutrition_plans" USING "btree" ("template_id");



CREATE INDEX "idx_nutrition_plans_user_id" ON "public"."nutrition_plans" USING "btree" ("user_id");



CREATE INDEX "idx_nutrition_templates_activity_entries" ON "public"."nutrition_templates" USING "gin" ("activity_entries");



CREATE INDEX "idx_nutrition_templates_created_at" ON "public"."nutrition_templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_nutrition_templates_created_by" ON "public"."nutrition_templates" USING "btree" ("created_by");



CREATE INDEX "idx_nutrition_templates_is_public" ON "public"."nutrition_templates" USING "btree" ("is_public");



CREATE INDEX "idx_nutrition_templates_manual_fields" ON "public"."nutrition_templates" USING "gin" ("manual_fields");



CREATE INDEX "idx_nutrition_templates_manual_override" ON "public"."nutrition_templates" USING "gin" ("manual_override");



CREATE INDEX "idx_nutrition_templates_targets" ON "public"."nutrition_templates" USING "gin" ("targets");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_customer_id" ON "public"."payments" USING "btree" ("customer_id");



CREATE INDEX "idx_payments_lead_id" ON "public"."payments" USING "btree" ("lead_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_stripe_payment_id" ON "public"."payments" USING "btree" ("stripe_payment_id") WHERE ("stripe_payment_id" IS NOT NULL);



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_saved_views_created_by" ON "public"."saved_views" USING "btree" ("created_by");



CREATE INDEX "idx_saved_views_default" ON "public"."saved_views" USING "btree" ("resource_key", "created_by", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_saved_views_display_order" ON "public"."saved_views" USING "btree" ("resource_key", "created_by", "display_order");



CREATE INDEX "idx_saved_views_folder_id" ON "public"."saved_views" USING "btree" ("folder_id");



CREATE INDEX "idx_saved_views_resource_key" ON "public"."saved_views" USING "btree" ("resource_key");



CREATE INDEX "idx_saved_views_resource_user" ON "public"."saved_views" USING "btree" ("resource_key", "created_by");



CREATE UNIQUE INDEX "idx_saved_views_unique_default" ON "public"."saved_views" USING "btree" ("resource_key", "created_by") WHERE ("is_default" = true);



CREATE INDEX "idx_steps_plans_budget_customer_perf" ON "public"."steps_plans" USING "btree" ("budget_id", "customer_id") WHERE (("budget_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE INDEX "idx_steps_plans_budget_id" ON "public"."steps_plans" USING "btree" ("budget_id");



CREATE INDEX "idx_steps_plans_budget_id_perf" ON "public"."steps_plans" USING "btree" ("budget_id") WHERE ("budget_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_steps_plans_budget_id_perf" IS 'Performance index for querying steps plans by budget_id';



CREATE INDEX "idx_steps_plans_budget_lead_perf" ON "public"."steps_plans" USING "btree" ("budget_id", "lead_id") WHERE (("budget_id" IS NOT NULL) AND ("lead_id" IS NOT NULL));



CREATE INDEX "idx_steps_plans_created_at" ON "public"."steps_plans" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_steps_plans_customer_id" ON "public"."steps_plans" USING "btree" ("customer_id");



CREATE INDEX "idx_steps_plans_lead_id" ON "public"."steps_plans" USING "btree" ("lead_id");



CREATE INDEX "idx_steps_plans_start_date" ON "public"."steps_plans" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_steps_plans_user_id" ON "public"."steps_plans" USING "btree" ("user_id");



CREATE INDEX "idx_subscription_types_created_at" ON "public"."subscription_types" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_subscription_types_created_by" ON "public"."subscription_types" USING "btree" ("created_by");



CREATE INDEX "idx_subscription_types_currency" ON "public"."subscription_types" USING "btree" ("currency");



CREATE INDEX "idx_supplement_plans_budget_customer_perf" ON "public"."supplement_plans" USING "btree" ("budget_id", "customer_id") WHERE (("budget_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE INDEX "idx_supplement_plans_budget_id" ON "public"."supplement_plans" USING "btree" ("budget_id");



CREATE INDEX "idx_supplement_plans_budget_id_perf" ON "public"."supplement_plans" USING "btree" ("budget_id") WHERE ("budget_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_supplement_plans_budget_id_perf" IS 'Performance index for querying supplement plans by budget_id';



CREATE INDEX "idx_supplement_plans_budget_lead_perf" ON "public"."supplement_plans" USING "btree" ("budget_id", "lead_id") WHERE (("budget_id" IS NOT NULL) AND ("lead_id" IS NOT NULL));



CREATE INDEX "idx_supplement_plans_created_at" ON "public"."supplement_plans" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_supplement_plans_customer_id" ON "public"."supplement_plans" USING "btree" ("customer_id");



CREATE INDEX "idx_supplement_plans_lead_id" ON "public"."supplement_plans" USING "btree" ("lead_id");



CREATE INDEX "idx_supplement_plans_start_date" ON "public"."supplement_plans" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_supplement_plans_supplements" ON "public"."supplement_plans" USING "gin" ("supplements");



CREATE INDEX "idx_supplement_plans_user_id" ON "public"."supplement_plans" USING "btree" ("user_id");



CREATE INDEX "idx_user_interface_preferences_display_order" ON "public"."user_interface_preferences" USING "btree" ("user_id", "display_order");



CREATE INDEX "idx_user_interface_preferences_user_id" ON "public"."user_interface_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_invitations_customer_id" ON "public"."user_invitations" USING "btree" ("customer_id");



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_expires_at" ON "public"."user_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_invitations_token_hash" ON "public"."user_invitations" USING "btree" ("token_hash");



CREATE INDEX "idx_user_invitations_user_id" ON "public"."user_invitations" USING "btree" ("user_id");



CREATE INDEX "idx_weekly_reviews_created_at" ON "public"."weekly_reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_weekly_reviews_customer_id" ON "public"."weekly_reviews" USING "btree" ("customer_id");



CREATE INDEX "idx_weekly_reviews_lead_id" ON "public"."weekly_reviews" USING "btree" ("lead_id");



CREATE INDEX "idx_weekly_reviews_week_start" ON "public"."weekly_reviews" USING "btree" ("week_start_date" DESC);



CREATE INDEX "idx_whatsapp_flow_templates_media" ON "public"."whatsapp_flow_templates" USING "gin" ("media");



CREATE INDEX "idx_whatsapp_flow_templates_user_flow" ON "public"."whatsapp_flow_templates" USING "btree" ("user_id", "flow_key");



CREATE INDEX "idx_workout_plans_budget_customer_perf" ON "public"."workout_plans" USING "btree" ("budget_id", "customer_id") WHERE (("budget_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE INDEX "idx_workout_plans_budget_id" ON "public"."workout_plans" USING "btree" ("budget_id");



CREATE INDEX "idx_workout_plans_budget_id_perf" ON "public"."workout_plans" USING "btree" ("budget_id") WHERE ("budget_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_workout_plans_budget_id_perf" IS 'Performance index for querying workout plans by budget_id';



CREATE INDEX "idx_workout_plans_budget_lead_perf" ON "public"."workout_plans" USING "btree" ("budget_id", "lead_id") WHERE (("budget_id" IS NOT NULL) AND ("lead_id" IS NOT NULL));



CREATE INDEX "idx_workout_plans_created_at" ON "public"."workout_plans" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_workout_plans_custom_attributes" ON "public"."workout_plans" USING "gin" ("custom_attributes");



CREATE INDEX "idx_workout_plans_customer_id" ON "public"."workout_plans" USING "btree" ("customer_id");



CREATE INDEX "idx_workout_plans_deleted_at" ON "public"."workout_plans" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_workout_plans_is_active" ON "public"."workout_plans" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_workout_plans_lead_id" ON "public"."workout_plans" USING "btree" ("lead_id");



CREATE INDEX "idx_workout_plans_start_date" ON "public"."workout_plans" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_workout_plans_template_id" ON "public"."workout_plans" USING "btree" ("template_id");



CREATE INDEX "idx_workout_plans_user_id" ON "public"."workout_plans" USING "btree" ("user_id");



CREATE INDEX "idx_workout_templates_created_at" ON "public"."workout_templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_workout_templates_created_by" ON "public"."workout_templates" USING "btree" ("created_by");



CREATE INDEX "idx_workout_templates_goal_tags" ON "public"."workout_templates" USING "gin" ("goal_tags");



CREATE INDEX "idx_workout_templates_is_public" ON "public"."workout_templates" USING "btree" ("is_public");



CREATE INDEX "idx_workout_templates_routine_data" ON "public"."workout_templates" USING "gin" ("routine_data");



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "calculate_bmi_trigger" BEFORE INSERT OR UPDATE OF "height", "weight" ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_lead_bmi"();



CREATE OR REPLACE TRIGGER "customer_notes_updated_at" BEFORE UPDATE ON "public"."customer_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_notes_updated_at"();



CREATE OR REPLACE TRIGGER "set_green_api_settings_user_trigger" BEFORE INSERT OR UPDATE ON "public"."green_api_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_green_api_settings_user"();



CREATE OR REPLACE TRIGGER "update_blood_tests_updated_at" BEFORE UPDATE ON "public"."blood_tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_budget_assignments_updated_at" BEFORE UPDATE ON "public"."budget_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_check_in_field_configurations_updated_at" BEFORE UPDATE ON "public"."check_in_field_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_check_in_field_configurations_updated_at"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_check_ins_updated_at" BEFORE UPDATE ON "public"."daily_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_external_kb_updated_at" BEFORE UPDATE ON "public"."external_knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fillout_submissions_updated_at" BEFORE UPDATE ON "public"."fillout_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_fillout_submissions_updated_at"();



CREATE OR REPLACE TRIGGER "update_green_api_settings_updated_at" BEFORE UPDATE ON "public"."green_api_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interface_folders_updated_at" BEFORE UPDATE ON "public"."interface_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_internal_kb_updated_at" BEFORE UPDATE ON "public"."internal_knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meetings_updated_at" BEFORE UPDATE ON "public"."meetings" FOR EACH ROW EXECUTE FUNCTION "public"."update_meetings_updated_at"();



CREATE OR REPLACE TRIGGER "update_nutrition_plans_updated_at" BEFORE UPDATE ON "public"."nutrition_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_nutrition_templates_updated_at" BEFORE UPDATE ON "public"."nutrition_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_saved_views_updated_at" BEFORE UPDATE ON "public"."saved_views" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_steps_plans_updated_at" BEFORE UPDATE ON "public"."steps_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_types_updated_at" BEFORE UPDATE ON "public"."subscription_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_supplement_plans_updated_at" BEFORE UPDATE ON "public"."supplement_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_interface_preferences_updated_at" BEFORE UPDATE ON "public"."user_interface_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_invitations_updated_at" BEFORE UPDATE ON "public"."user_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weekly_reviews_updated_at" BEFORE UPDATE ON "public"."weekly_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_flow_templates_updated_at" BEFORE UPDATE ON "public"."whatsapp_flow_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_whatsapp_flow_templates_updated_at"();



CREATE OR REPLACE TRIGGER "update_workout_plans_updated_at" BEFORE UPDATE ON "public"."workout_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workout_templates_updated_at" BEFORE UPDATE ON "public"."workout_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blood_tests"
    ADD CONSTRAINT "blood_tests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blood_tests"
    ADD CONSTRAINT "blood_tests_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_nutrition_template_id_fkey" FOREIGN KEY ("nutrition_template_id") REFERENCES "public"."nutrition_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_workout_template_id_fkey" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."check_in_field_configurations"
    ADD CONSTRAINT "check_in_field_configurations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."check_in_field_configurations"
    ADD CONSTRAINT "check_in_field_configurations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_check_ins"
    ADD CONSTRAINT "daily_check_ins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_check_ins"
    ADD CONSTRAINT "daily_check_ins_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_check_ins"
    ADD CONSTRAINT "daily_check_ins_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."external_knowledge_base"
    ADD CONSTRAINT "external_knowledge_base_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fillout_submissions"
    ADD CONSTRAINT "fillout_submissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fillout_submissions"
    ADD CONSTRAINT "fillout_submissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fillout_submissions"
    ADD CONSTRAINT "fillout_submissions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."green_api_settings"
    ADD CONSTRAINT "green_api_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."green_api_settings"
    ADD CONSTRAINT "green_api_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interface_folders"
    ADD CONSTRAINT "interface_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."internal_knowledge_base"
    ADD CONSTRAINT "internal_knowledge_base_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitation_audit_log"
    ADD CONSTRAINT "invitation_audit_log_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."user_invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_audit_log"
    ADD CONSTRAINT "invitation_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."nutrition_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_templates"
    ADD CONSTRAINT "nutrition_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_views"
    ADD CONSTRAINT "saved_views_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_views"
    ADD CONSTRAINT "saved_views_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."interface_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."steps_plans"
    ADD CONSTRAINT "steps_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_types"
    ADD CONSTRAINT "subscription_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_plans"
    ADD CONSTRAINT "supplement_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interface_preferences"
    ADD CONSTRAINT "user_interface_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_reviews"
    ADD CONSTRAINT "weekly_reviews_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_flow_templates"
    ADD CONSTRAINT "whatsapp_flow_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins and users can delete meetings" ON "public"."meetings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Admins and users can insert meetings" ON "public"."meetings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Admins and users can update meetings" ON "public"."meetings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Admins and users can view all meetings" ON "public"."meetings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Admins can create invitations" ON "public"."user_invitations" FOR INSERT WITH CHECK ("public"."is_admin_or_manager"());



CREATE POLICY "Admins can delete Green API settings" ON "public"."green_api_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert Green API settings" ON "public"."green_api_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all check-in field configurations" ON "public"."check_in_field_configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins can read nutrition plans by customer" ON "public"."nutrition_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read workout plans by customer" ON "public"."workout_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update Green API settings" ON "public"."green_api_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update invitations" ON "public"."user_invitations" FOR UPDATE USING ("public"."is_admin_or_manager"()) WITH CHECK ("public"."is_admin_or_manager"());



CREATE POLICY "Admins can view all invitations" ON "public"."user_invitations" FOR SELECT USING ("public"."is_admin_or_manager"());



CREATE POLICY "Admins can view audit logs" ON "public"."invitation_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Admins have full access to budgets" ON "public"."budgets" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to customers" ON "public"."customers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to leads" ON "public"."leads" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins have full access to nutrition plans" ON "public"."nutrition_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to nutrition templates" ON "public"."nutrition_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to payments" ON "public"."payments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to profiles" ON "public"."profiles" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins have full access to steps plans" ON "public"."steps_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to subscription types" ON "public"."subscription_types" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to supplement plans" ON "public"."supplement_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to templates" ON "public"."workout_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to workout plans" ON "public"."workout_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow anonymous insert leads" ON "public"."leads" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anonymous read leads" ON "public"."leads" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Authenticated users can delete knowledge base" ON "public"."internal_knowledge_base" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert customers" ON "public"."customers" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert knowledge base" ON "public"."internal_knowledge_base" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert leads" ON "public"."leads" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read Green API settings" ON "public"."green_api_settings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can read customers" ON "public"."customers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read knowledge base" ON "public"."internal_knowledge_base" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read leads" ON "public"."leads" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read payments" ON "public"."payments" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE ("customers"."id" = "payments"."customer_id"))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))));



CREATE POLICY "Authenticated users can update customers" ON "public"."customers" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update knowledge base" ON "public"."internal_knowledge_base" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update leads" ON "public"."leads" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



COMMENT ON POLICY "Authenticated users can update leads" ON "public"."leads" IS 'Allows all authenticated users to update leads for CRM functionality';



CREATE POLICY "Authenticated users can update payments" ON "public"."payments" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Clients can read published articles" ON "public"."external_knowledge_base" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Clients can read their check-in field configuration" ON "public"."check_in_field_configurations" FOR SELECT USING ((("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))) OR ("customer_id" IS NULL)));



CREATE POLICY "Coaches can delete weekly reviews" ON "public"."weekly_reviews" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can insert check-ins" ON "public"."daily_check_ins" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can insert weekly reviews" ON "public"."weekly_reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can update check-ins" ON "public"."daily_check_ins" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can update weekly reviews" ON "public"."weekly_reviews" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can view all check-ins" ON "public"."daily_check_ins" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Coaches can view all weekly reviews" ON "public"."weekly_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Managers can delete blood tests" ON "public"."blood_tests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))));



CREATE POLICY "Managers can delete fillout submissions" ON "public"."fillout_submissions" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text"]))))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Managers can delete knowledge base articles" ON "public"."external_knowledge_base" FOR DELETE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))));



CREATE POLICY "Managers can insert blood tests" ON "public"."blood_tests" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))) AND (("auth"."uid"() = "uploaded_by") OR ("uploaded_by" IS NULL))));



CREATE POLICY "Managers can insert fillout submissions" ON "public"."fillout_submissions" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text"]))))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Managers can insert knowledge base articles" ON "public"."external_knowledge_base" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))));



CREATE POLICY "Managers can read all knowledge base articles" ON "public"."external_knowledge_base" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))));



CREATE POLICY "Managers can update fillout submissions" ON "public"."fillout_submissions" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text"]))))) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text"]))))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Managers can update knowledge base articles" ON "public"."external_knowledge_base" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"]))))))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))));



CREATE POLICY "Managers can view all fillout submissions" ON "public"."fillout_submissions" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text"]))))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Service role can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage fillout submissions" ON "public"."fillout_submissions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can insert audit logs" ON "public"."invitation_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Trainees can delete their own blood tests" ON "public"."blood_tests" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."leads"
     JOIN "public"."customers" ON (("customers"."id" = "leads"."customer_id")))
  WHERE (("leads"."id" = "blood_tests"."lead_id") AND ("customers"."id" IN ( SELECT "leads"."customer_id"
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'trainee'::"text"))))))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Trainees can insert blood tests for their customer" ON "public"."blood_tests" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."leads"
     JOIN "public"."customers" ON (("customers"."id" = "leads"."customer_id")))
  WHERE (("leads"."id" = "blood_tests"."lead_id") AND ("customers"."id" IN ( SELECT "leads"."customer_id"
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'trainee'::"text"))))))) AND ("auth"."uid"() = "uploaded_by")));



CREATE POLICY "Trainees can insert own check-ins" ON "public"."daily_check_ins" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "daily_check_ins"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can update own check-ins" ON "public"."daily_check_ins" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "daily_check_ins"."customer_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "daily_check_ins"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can update own customer" ON "public"."customers" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Trainees can update own leads" ON "public"."leads" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "leads"."customer_id") AND ("customers"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "leads"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can view own check-ins" ON "public"."daily_check_ins" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "daily_check_ins"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can view own customer" ON "public"."customers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Trainees can view own leads" ON "public"."leads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "leads"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can view own nutrition plans" ON "public"."nutrition_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "nutrition_plans"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can view own weekly reviews" ON "public"."weekly_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "weekly_reviews"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Trainees can view own workout plans" ON "public"."workout_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers"
  WHERE (("customers"."id" = "workout_plans"."customer_id") AND ("customers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete assigned leads" ON "public"."leads" FOR DELETE USING ((("assigned_to" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can delete budget assignments for own budgets" ON "public"."budget_assignments" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id" = "budget_assignments"."budget_id") AND ("budgets"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete customer notes" ON "public"."customer_notes" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete own budgets" ON "public"."budgets" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own nutrition plans" ON "public"."nutrition_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own nutrition templates" ON "public"."nutrition_templates" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own steps plans" ON "public"."steps_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own subscription types" ON "public"."subscription_types" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own supplement plans" ON "public"."supplement_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."whatsapp_flow_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."workout_templates" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own workout plans" ON "public"."workout_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folders" ON "public"."interface_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own interface preferences" ON "public"."user_interface_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own saved views" ON "public"."saved_views" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert budget assignments for own budgets" ON "public"."budget_assignments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id" = "budget_assignments"."budget_id") AND ("budgets"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can insert customer notes" ON "public"."customer_notes" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert own budgets" ON "public"."budgets" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own nutrition plans" ON "public"."nutrition_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own nutrition templates" ON "public"."nutrition_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own steps plans" ON "public"."steps_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own subscription types" ON "public"."subscription_types" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own supplement plans" ON "public"."supplement_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own templates" ON "public"."whatsapp_flow_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own templates" ON "public"."workout_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own workout plans" ON "public"."workout_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own folders" ON "public"."interface_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own interface preferences" ON "public"."user_interface_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own saved views" ON "public"."saved_views" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can read own nutrition plans" ON "public"."nutrition_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own steps plans" ON "public"."steps_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own supplement plans" ON "public"."supplement_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own workout plans" ON "public"."workout_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update assigned leads" ON "public"."leads" FOR UPDATE USING ((("assigned_to" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("assigned_to" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can update budget assignments for own budgets" ON "public"."budget_assignments" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id" = "budget_assignments"."budget_id") AND ("budgets"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id" = "budget_assignments"."budget_id") AND ("budgets"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can update customer notes" ON "public"."customer_notes" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can update own budgets" ON "public"."budgets" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own nutrition plans" ON "public"."nutrition_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own nutrition templates" ON "public"."nutrition_templates" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own steps plans" ON "public"."steps_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own subscription types" ON "public"."subscription_types" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own supplement plans" ON "public"."supplement_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."whatsapp_flow_templates" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."workout_templates" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own workout plans" ON "public"."workout_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own folders" ON "public"."interface_folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own interface preferences" ON "public"."user_interface_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own saved views" ON "public"."saved_views" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view blood tests for accessible leads" ON "public"."blood_tests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."leads"
  WHERE (("leads"."id" = "blood_tests"."lead_id") AND (("leads"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'user'::"text"]))))) OR (EXISTS ( SELECT 1
           FROM ("public"."customers"
             JOIN "public"."leads" "leads_1" ON (("leads_1"."customer_id" = "customers"."id")))
          WHERE (("leads_1"."id" = "blood_tests"."lead_id") AND ("customers"."id" IN ( SELECT "leads_1"."customer_id"
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'trainee'::"text"))))))))))));



CREATE POLICY "Users can view customer notes" ON "public"."customer_notes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view own invitation" ON "public"."user_invitations" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view own templates" ON "public"."whatsapp_flow_templates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view public or own budgets" ON "public"."budgets" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can view public or own nutrition templates" ON "public"."nutrition_templates" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can view public or own templates" ON "public"."workout_templates" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can view relevant budget assignments" ON "public"."budget_assignments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id" = "budget_assignments"."budget_id") AND (("budgets"."created_by" = "auth"."uid"()) OR ("budgets"."is_public" = true))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view subscription types" ON "public"."subscription_types" FOR SELECT USING (true);



CREATE POLICY "Users can view their own folders" ON "public"."interface_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own interface preferences" ON "public"."user_interface_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own saved views" ON "public"."saved_views" FOR SELECT USING (("auth"."uid"() = "created_by"));



ALTER TABLE "public"."blood_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."check_in_field_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_check_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fillout_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."green_api_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interface_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."internal_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nutrition_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nutrition_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."steps_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplement_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_interface_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_flow_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_templates" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_age_from_birth_date"("birth_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bmi"("height_cm" numeric, "weight_kg" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bmi"("height_cm" numeric, "weight_kg" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bmi"("height_cm" numeric, "weight_kg" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invitation_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text", "p_sort_by" "text", "p_sort_order" "text", "p_group_by_level1" "text", "p_group_by_level2" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text", "p_sort_by" "text", "p_sort_order" "text", "p_group_by_level1" "text", "p_group_by_level2" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_leads"("p_limit_count" integer, "p_offset_count" integer, "p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text", "p_sort_by" "text", "p_sort_order" "text", "p_group_by_level1" "text", "p_group_by_level2" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_leads_count"("p_search_query" "text", "p_status_main" "text", "p_status_sub" "text", "p_source" "text", "p_fitness_goal" "text", "p_activity_level" "text", "p_preferred_time" "text", "p_age" "text", "p_height" "text", "p_weight" "text", "p_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_lead_filter_options"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_lead_filter_options"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_lead_filter_options"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_invitation_token"("token" "text", "salt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_invitation_token"("token" "text", "salt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_invitation_token"("token" "text", "salt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_invitation_valid"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_invitation_valid"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_invitation_valid"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_weekly_review_template"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_green_api_settings_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_green_api_settings_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_green_api_settings_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_check_in_field_configurations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_check_in_field_configurations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_check_in_field_configurations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fillout_submissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fillout_submissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fillout_submissions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_bmi"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_bmi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_bmi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_meetings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_meetings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_meetings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_whatsapp_flow_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_whatsapp_flow_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_whatsapp_flow_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_invitation_token"("p_token_hash" "text", "p_token" "text", "p_salt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_invitation_token"("p_token_hash" "text", "p_token" "text", "p_salt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_invitation_token"("p_token_hash" "text", "p_token" "text", "p_salt" "text") TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_client_states" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;
SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "dashboard_user";
RESET SESSION AUTHORIZATION;



GRANT ALL ON TABLE "public"."blood_tests" TO "anon";
GRANT ALL ON TABLE "public"."blood_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."blood_tests" TO "service_role";



GRANT ALL ON TABLE "public"."budget_assignments" TO "anon";
GRANT ALL ON TABLE "public"."budget_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."check_in_field_configurations" TO "anon";
GRANT ALL ON TABLE "public"."check_in_field_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."check_in_field_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."customer_notes" TO "anon";
GRANT ALL ON TABLE "public"."customer_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_notes" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."customers_with_lead_counts" TO "anon";
GRANT ALL ON TABLE "public"."customers_with_lead_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."customers_with_lead_counts" TO "service_role";



GRANT ALL ON TABLE "public"."daily_check_ins" TO "anon";
GRANT ALL ON TABLE "public"."daily_check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."external_knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."external_knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."external_knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."fillout_submissions" TO "anon";
GRANT ALL ON TABLE "public"."fillout_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."fillout_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."green_api_settings" TO "anon";
GRANT ALL ON TABLE "public"."green_api_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."green_api_settings" TO "service_role";



GRANT ALL ON TABLE "public"."interface_folders" TO "anon";
GRANT ALL ON TABLE "public"."interface_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."interface_folders" TO "service_role";



GRANT ALL ON TABLE "public"."internal_knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."internal_knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."internal_knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."invitation_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_plans" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_templates" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_templates" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_templates_with_ranges" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_templates_with_ranges" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_templates_with_ranges" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saved_views" TO "anon";
GRANT ALL ON TABLE "public"."saved_views" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_views" TO "service_role";



GRANT ALL ON TABLE "public"."steps_plans" TO "anon";
GRANT ALL ON TABLE "public"."steps_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."steps_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_types" TO "anon";
GRANT ALL ON TABLE "public"."subscription_types" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_types" TO "service_role";



GRANT ALL ON TABLE "public"."supplement_plans" TO "anon";
GRANT ALL ON TABLE "public"."supplement_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."supplement_plans" TO "service_role";



GRANT ALL ON TABLE "public"."user_interface_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_interface_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interface_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."v_leads_with_customer" TO "anon";
GRANT ALL ON TABLE "public"."v_leads_with_customer" TO "authenticated";
GRANT ALL ON TABLE "public"."v_leads_with_customer" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_reviews" TO "anon";
GRANT ALL ON TABLE "public"."weekly_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_flow_templates" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_flow_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_flow_templates" TO "service_role";



GRANT ALL ON TABLE "public"."workout_plans" TO "anon";
GRANT ALL ON TABLE "public"."workout_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_plans" TO "service_role";



GRANT ALL ON TABLE "public"."workout_templates" TO "anon";
GRANT ALL ON TABLE "public"."workout_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_templates" TO "service_role";



GRANT ALL ON TABLE "public"."workout_templates_with_leads" TO "anon";
GRANT ALL ON TABLE "public"."workout_templates_with_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_templates_with_leads" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




