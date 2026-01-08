-- =====================================================
-- Prevent Duplicate Plans Per Budget Migration
-- Created: 2026-01-04
-- Description: Prevents duplicate plans (workout, nutrition, steps, supplement) 
--              for the same budget + customer/lead combination
-- =====================================================

-- =====================================================
-- STEP 1: Clean up existing duplicates
-- Keep only the most recent plan per budget_id + customer_id/lead_id combination
-- =====================================================

-- Clean up duplicate workout_plans
WITH ranked_plans AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY budget_id, COALESCE(customer_id::text, ''), COALESCE(lead_id::text, '')
      ORDER BY created_at DESC
    ) as rn
  FROM workout_plans
  WHERE budget_id IS NOT NULL
)
DELETE FROM workout_plans
WHERE id IN (
  SELECT id FROM ranked_plans WHERE rn > 1
);

-- Clean up duplicate nutrition_plans
WITH ranked_plans AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY budget_id, COALESCE(customer_id::text, ''), COALESCE(lead_id::text, '')
      ORDER BY created_at DESC
    ) as rn
  FROM nutrition_plans
  WHERE budget_id IS NOT NULL
)
DELETE FROM nutrition_plans
WHERE id IN (
  SELECT id FROM ranked_plans WHERE rn > 1
);

-- Clean up duplicate steps_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    EXECUTE '
    WITH ranked_plans AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY budget_id, COALESCE(customer_id::text, ''''), COALESCE(lead_id::text, '''')
          ORDER BY created_at DESC
        ) as rn
      FROM steps_plans
      WHERE budget_id IS NOT NULL
    )
    DELETE FROM steps_plans
    WHERE id IN (
      SELECT id FROM ranked_plans WHERE rn > 1
    )';
  END IF;
END $$;

-- Clean up duplicate supplement_plans
WITH ranked_plans AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY budget_id, COALESCE(customer_id::text, ''), COALESCE(lead_id::text, '')
      ORDER BY created_at DESC
    ) as rn
  FROM supplement_plans
  WHERE budget_id IS NOT NULL
)
DELETE FROM supplement_plans
WHERE id IN (
  SELECT id FROM ranked_plans WHERE rn > 1
);

-- =====================================================
-- STEP 2: Create unique partial indexes to prevent future duplicates
-- These indexes ensure only one plan per budget + customer/lead combination
-- =====================================================

-- Unique index for workout_plans (when budget_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_unique_budget_customer
ON workout_plans (budget_id, customer_id)
WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_unique_budget_lead
ON workout_plans (budget_id, lead_id)
WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL;

-- Unique index for nutrition_plans (when budget_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_plans_unique_budget_customer
ON nutrition_plans (budget_id, customer_id)
WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_plans_unique_budget_lead
ON nutrition_plans (budget_id, lead_id)
WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL;

-- Unique index for steps_plans (when budget_id is set)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_plans_unique_budget_customer
    ON steps_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_plans_unique_budget_lead
    ON steps_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Unique index for supplement_plans (when budget_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplement_plans_unique_budget_customer
ON supplement_plans (budget_id, customer_id)
WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplement_plans_unique_budget_lead
ON supplement_plans (budget_id, lead_id)
WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_workout_plans_unique_budget_customer IS 'Ensures only one workout plan per budget + customer combination';
COMMENT ON INDEX idx_workout_plans_unique_budget_lead IS 'Ensures only one workout plan per budget + lead combination';
COMMENT ON INDEX idx_nutrition_plans_unique_budget_customer IS 'Ensures only one nutrition plan per budget + customer combination';
COMMENT ON INDEX idx_nutrition_plans_unique_budget_lead IS 'Ensures only one nutrition plan per budget + lead combination';
COMMENT ON INDEX idx_supplement_plans_unique_budget_customer IS 'Ensures only one supplement plan per budget + customer combination';
COMMENT ON INDEX idx_supplement_plans_unique_budget_lead IS 'Ensures only one supplement plan per budget + lead combination';

-- =====================================================
-- Migration Complete
-- =====================================================




