-- Migration: Fix Numeric Field Overflow in daily_check_ins
-- Created: 2026-02-13
-- Description: Changes INTEGER fields to BIGINT and increases NUMERIC precision
--              to prevent overflow errors when entering large numbers

SET search_path TO public;

-- Change INTEGER fields to BIGINT to support larger values
-- This prevents overflow for fields like steps (can be 50,000+), 
-- circumference values, calories, protein, etc.

-- Update steps_actual if it exists (it was created in the original table as INTEGER)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'daily_check_ins' 
    AND column_name = 'steps_actual'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE daily_check_ins
      ALTER COLUMN steps_actual TYPE BIGINT;
  END IF;
END $$;

-- Update all INTEGER fields that were added in expand_daily_check_ins migration
-- Use DO block to safely alter columns only if they exist
DO $$
BEGIN
  -- Change INTEGER fields to BIGINT
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'belly_circumference' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN belly_circumference TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'waist_circumference' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN waist_circumference TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'thigh_circumference' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN thigh_circumference TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'arm_circumference' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN arm_circumference TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'neck_circumference' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN neck_circumference TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'exercises_count' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN exercises_count TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'cardio_amount' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN cardio_amount TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'intervals_count' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN intervals_count TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'calories_daily' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN calories_daily TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'protein_daily' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN protein_daily TYPE BIGINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'fiber_daily' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN fiber_daily TYPE BIGINT;
  END IF;
  
  -- Increase NUMERIC precision for weight (allow up to 9999.99 kg for edge cases)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'weight') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN weight TYPE NUMERIC(10,2);
  END IF;
  
  -- Increase NUMERIC precision for water_amount (allow up to 9999.99 liters)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'water_amount') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN water_amount TYPE NUMERIC(10,2);
  END IF;
  
  -- Increase NUMERIC precision for sleep_hours (allow up to 999.99 hours for edge cases)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'sleep_hours') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN sleep_hours TYPE NUMERIC(6,2);
  END IF;
  
  -- Keep stress_level, hunger_level, and energy_level as SMALLINT for efficiency
  -- (range -32,768 to 32,767, more than enough for 1-10)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'stress_level' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN stress_level TYPE SMALLINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'hunger_level' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN hunger_level TYPE SMALLINT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_check_ins' AND column_name = 'energy_level' AND data_type = 'integer') THEN
    ALTER TABLE daily_check_ins ALTER COLUMN energy_level TYPE SMALLINT;
  END IF;
END $$;

-- Update comments to reflect the changes
COMMENT ON COLUMN daily_check_ins.weight IS 'Weight measurement in kg (משקל). Supports up to 9999.99 kg';
COMMENT ON COLUMN daily_check_ins.belly_circumference IS 'Belly circumference in cm (היקף בטן). Supports large values';
COMMENT ON COLUMN daily_check_ins.waist_circumference IS 'Waist circumference in cm (היקף מותן). Supports large values';
COMMENT ON COLUMN daily_check_ins.thigh_circumference IS 'Thigh circumference in cm (היקף ירכיים). Supports large values';
COMMENT ON COLUMN daily_check_ins.arm_circumference IS 'Arm circumference in cm (היקף יד). Supports large values';
COMMENT ON COLUMN daily_check_ins.neck_circumference IS 'Neck circumference in cm (היקף צוואר). Supports large values';
COMMENT ON COLUMN daily_check_ins.exercises_count IS 'Number of exercises completed (כמה תרגילים עשית). Supports large values';
COMMENT ON COLUMN daily_check_ins.cardio_amount IS 'Cardio duration in minutes (כמה אירובי עשית). Supports large values';
COMMENT ON COLUMN daily_check_ins.intervals_count IS 'Number of interval training sessions (כמה אינטרוולים). Supports large values';
COMMENT ON COLUMN daily_check_ins.calories_daily IS 'Daily calorie intake (קלוריות יומי). Supports large values';
COMMENT ON COLUMN daily_check_ins.protein_daily IS 'Daily protein intake in grams (חלבון יומי). Supports large values';
COMMENT ON COLUMN daily_check_ins.fiber_daily IS 'Daily fiber intake in grams (סיבים יומי). Supports large values';
COMMENT ON COLUMN daily_check_ins.water_amount IS 'Water consumed in liters (כמה מים שתית). Supports up to 9999.99 liters';
COMMENT ON COLUMN daily_check_ins.sleep_hours IS 'Hours of sleep (כמה שעות ישנת). Supports up to 999.99 hours';

-- =====================================================
-- Migration Complete
-- =====================================================
