-- =====================================================
-- Remove Weight and RPE from Workout Plans
-- Created: 2024-01-02
-- Description: Clean up JSONB data to remove weight and rpe fields from exercises
-- =====================================================

-- Update existing workout plans to remove weight and rpe from exercises in JSONB
-- This function processes each workout plan and removes weight/rpe from all exercises
DO $$
DECLARE
    plan_record RECORD;
    updated_days JSONB;
    day_key TEXT;
    day_data JSONB;
    updated_exercises JSONB;
    exercise JSONB;
BEGIN
    FOR plan_record IN 
        SELECT id, custom_attributes 
        FROM workout_plans 
        WHERE custom_attributes->'data'->'weeklyWorkout'->'days' IS NOT NULL
    LOOP
        updated_days := '{}'::JSONB;
        
        -- Process each day
        FOR day_key, day_data IN 
            SELECT * FROM jsonb_each(plan_record.custom_attributes->'data'->'weeklyWorkout'->'days')
        LOOP
            -- Process exercises in this day - remove weight and rpe fields
            updated_exercises := (
                SELECT jsonb_agg(exercise - 'weight' - 'rpe')
                FROM jsonb_array_elements(day_data->'exercises') AS exercise
            );
            
            -- Update day with cleaned exercises
            day_data := jsonb_set(day_data, '{exercises}', COALESCE(updated_exercises, '[]'::JSONB));
            updated_days := updated_days || jsonb_build_object(day_key, day_data);
        END LOOP;
        
        -- Update the workout plan
        UPDATE workout_plans
        SET custom_attributes = jsonb_set(
            plan_record.custom_attributes,
            '{data,weeklyWorkout,days}',
            updated_days
        )
        WHERE id = plan_record.id;
    END LOOP;
END $$;

-- Note: Since weight and rpe are stored in JSONB (not as table columns),
-- we only need to clean the JSONB data. No columns need to be dropped from the table.
