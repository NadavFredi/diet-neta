-- =====================================================
-- Fix Duplicate Plans Per Budget Migration
-- Created: 2026-01-21
-- Description: Removes duplicate plans per budget and ensures only one plan per budget_id
--              This fixes the issue where the same plan appears twice when both customer_id and lead_id are set
-- =====================================================

-- =====================================================
-- STEP 1: Clean up existing duplicates
-- Keep only the most recent plan per budget_id + customer_id/lead_id combination
-- =====================================================

-- Clean up duplicate workout_plans - keep only one per budget_id per customer/lead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE '
    WITH ranked_plans AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY budget_id, COALESCE(customer_id::text, ''''), COALESCE(lead_id::text, '''')
          ORDER BY COALESCE(start_date, created_at) DESC, created_at DESC
        ) as rn
      FROM workout_plans
      WHERE budget_id IS NOT NULL
    )
    DELETE FROM workout_plans
    WHERE id IN (
      SELECT id FROM ranked_plans WHERE rn > 1
    )';
  END IF;
END $$;

-- Clean up duplicate nutrition_plans - keep only one per budget_id per customer/lead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nutrition_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE '
    WITH ranked_plans AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY budget_id, COALESCE(customer_id::text, ''''), COALESCE(lead_id::text, '''')
          ORDER BY COALESCE(start_date, created_at) DESC, created_at DESC
        ) as rn
      FROM nutrition_plans
      WHERE budget_id IS NOT NULL
    )
    DELETE FROM nutrition_plans
    WHERE id IN (
      SELECT id FROM ranked_plans WHERE rn > 1
    )';
  END IF;
END $$;

-- Clean up duplicate steps_plans - keep only one per budget_id per customer/lead
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    EXECUTE '
    WITH ranked_plans AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY budget_id, COALESCE(customer_id::text, ''''), COALESCE(lead_id::text, '''')
          ORDER BY COALESCE(start_date, created_at) DESC, created_at DESC
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

-- Clean up duplicate supplement_plans - keep only one per budget_id per customer/lead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplement_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE '
    WITH ranked_plans AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY budget_id, COALESCE(customer_id::text, ''''), COALESCE(lead_id::text, '''')
          ORDER BY COALESCE(start_date, created_at) DESC, created_at DESC
        ) as rn
      FROM supplement_plans
      WHERE budget_id IS NOT NULL
    )
    DELETE FROM supplement_plans
    WHERE id IN (
      SELECT id FROM ranked_plans WHERE rn > 1
    )';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add unique constraint to prevent future duplicates
-- One plan per budget_id per customer_id/lead_id combination
-- Using a single expression index that handles both customer_id and lead_id
-- =====================================================

-- Drop existing indexes if they exist and create new unique constraint for workout_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_plans' 
    AND column_name = 'budget_id'
  ) THEN
    -- Drop old indexes if they exist
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget';
    
    -- Create unique constraint using expression: one plan per budget_id + (customer_id or lead_id)
    -- This handles cases where plan has customer_id only, lead_id only, or both
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_unique_budget_customer
    ON workout_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_unique_budget_lead
    ON workout_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Drop existing indexes if they exist and create new unique constraint for nutrition_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nutrition_plans' 
    AND column_name = 'budget_id'
  ) THEN
    -- Drop old indexes if they exist
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget';
    
    -- Create new unique constraint: one plan per budget_id + customer_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_plans_unique_budget_customer
    ON nutrition_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    -- Create new unique constraint: one plan per budget_id + lead_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_plans_unique_budget_lead
    ON nutrition_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Drop existing indexes if they exist and create new unique constraint for steps_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    -- Drop old indexes if they exist
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget';
    
    -- Create new unique constraint: one plan per budget_id + customer_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_plans_unique_budget_customer
    ON steps_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    -- Create new unique constraint: one plan per budget_id + lead_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_plans_unique_budget_lead
    ON steps_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Drop existing indexes if they exist and create new unique constraint for supplement_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplement_plans' 
    AND column_name = 'budget_id'
  ) THEN
    -- Drop old indexes if they exist
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget';
    
    -- Create new unique constraint: one plan per budget_id + customer_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_supplement_plans_unique_budget_customer
    ON supplement_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    -- Create new unique constraint: one plan per budget_id + lead_id
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_supplement_plans_unique_budget_lead
    ON supplement_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_plans_unique_budget_customer') THEN
    EXECUTE 'COMMENT ON INDEX idx_workout_plans_unique_budget_customer IS ''Ensures only one workout plan per budget_id + customer_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_plans_unique_budget_lead') THEN
    EXECUTE 'COMMENT ON INDEX idx_workout_plans_unique_budget_lead IS ''Ensures only one workout plan per budget_id + lead_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nutrition_plans_unique_budget_customer') THEN
    EXECUTE 'COMMENT ON INDEX idx_nutrition_plans_unique_budget_customer IS ''Ensures only one nutrition plan per budget_id + customer_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nutrition_plans_unique_budget_lead') THEN
    EXECUTE 'COMMENT ON INDEX idx_nutrition_plans_unique_budget_lead IS ''Ensures only one nutrition plan per budget_id + lead_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_steps_plans_unique_budget_customer') THEN
    EXECUTE 'COMMENT ON INDEX idx_steps_plans_unique_budget_customer IS ''Ensures only one steps plan per budget_id + customer_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_steps_plans_unique_budget_lead') THEN
    EXECUTE 'COMMENT ON INDEX idx_steps_plans_unique_budget_lead IS ''Ensures only one steps plan per budget_id + lead_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplement_plans_unique_budget_customer') THEN
    EXECUTE 'COMMENT ON INDEX idx_supplement_plans_unique_budget_customer IS ''Ensures only one supplement plan per budget_id + customer_id combination''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplement_plans_unique_budget_lead') THEN
    EXECUTE 'COMMENT ON INDEX idx_supplement_plans_unique_budget_lead IS ''Ensures only one supplement plan per budget_id + lead_id combination''';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
