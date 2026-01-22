CREATE OR REPLACE VIEW "public"."v_leads_with_customer" AS
 SELECT l.id,
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
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    to_char(l.created_at, 'YYYY-MM-DD'::text) AS created_date_formatted,
    to_char(l.birth_date::timestamp with time zone, 'YYYY-MM-DD'::text) AS birth_date_formatted,
    (l.daily_protocol ->> 'stepsGoal'::text)::integer AS daily_steps_goal,
    (l.daily_protocol ->> 'workoutGoal'::text)::integer AS weekly_workouts,
        CASE
            WHEN ((l.daily_protocol -> 'supplements'::text) IS NULL) THEN ARRAY[]::text[]
            WHEN (jsonb_typeof((l.daily_protocol -> 'supplements'::text)) = 'array'::text) THEN ARRAY( SELECT jsonb_array_elements_text((l.daily_protocol -> 'supplements'::text)) AS jsonb_array_elements_text)
            ELSE ARRAY[]::text[]
        END AS daily_supplements,
    (l.subscription_data ->> 'months'::text)::integer AS subscription_months,
    (l.subscription_data ->> 'initialPrice'::text)::numeric AS subscription_initial_price,
    (l.subscription_data ->> 'renewalPrice'::text)::numeric AS subscription_renewal_price,
    
    -- Flattened Related Entities
    b.name as budget_name,
    b.steps_goal as budget_steps_goal,
    b.is_public as budget_is_public,
    nt.name as menu_name,
    (nt.targets->>'calories')::integer as menu_calories,
    (nt.targets->>'protein')::integer as menu_protein

   FROM public.leads l
     LEFT JOIN public.customers c ON l.customer_id = c.id
     LEFT JOIN (
        SELECT DISTINCT ON (lead_id) lead_id, budget_id
        FROM public.budget_assignments
        ORDER BY lead_id, created_at DESC
     ) ba ON l.id = ba.lead_id
     LEFT JOIN public.budgets b ON ba.budget_id = b.id
     LEFT JOIN public.nutrition_templates nt ON b.nutrition_template_id = nt.id;
