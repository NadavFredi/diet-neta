-- Migration: Expand daily_check_ins table with comprehensive metrics
-- This adds 19 new fields for luxury daily check-in tracking

-- Physical measurements (6 fields)
ALTER TABLE daily_check_ins
  ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2), -- Weight in kg
  ADD COLUMN IF NOT EXISTS belly_circumference INTEGER, -- היקף בטן in cm
  ADD COLUMN IF NOT EXISTS waist_circumference INTEGER, -- היקף מותן in cm
  ADD COLUMN IF NOT EXISTS thigh_circumference INTEGER, -- היקף ירכיים in cm
  ADD COLUMN IF NOT EXISTS arm_circumference INTEGER, -- היקף יד in cm
  ADD COLUMN IF NOT EXISTS neck_circumference INTEGER, -- היקף צוואר in cm
  -- Activity metrics (3 new fields, steps_actual already exists)
  ADD COLUMN IF NOT EXISTS exercises_count INTEGER, -- כמה תרגילים עשית
  ADD COLUMN IF NOT EXISTS cardio_amount INTEGER, -- כמה אירובי עשית (minutes)
  ADD COLUMN IF NOT EXISTS intervals_count INTEGER, -- כמה אינטרוולים
  -- Nutrition and Hydration (4 fields)
  ADD COLUMN IF NOT EXISTS calories_daily INTEGER, -- קלוריות יומי
  ADD COLUMN IF NOT EXISTS protein_daily INTEGER, -- חלבון יומי in grams
  ADD COLUMN IF NOT EXISTS fiber_daily INTEGER, -- סיבים יומי in grams
  ADD COLUMN IF NOT EXISTS water_amount NUMERIC(5,2), -- כמה מים שתית in liters
  -- Well-being scales 1-10 (3 fields)
  ADD COLUMN IF NOT EXISTS stress_level INTEGER, -- רמת הלחץ היומי
  ADD COLUMN IF NOT EXISTS hunger_level INTEGER, -- רמת הרעב שלך
  ADD COLUMN IF NOT EXISTS energy_level INTEGER, -- רמת האנרגיה שלך
  -- Rest (1 field)
  ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(4,2); -- כמה שעות ישנת

-- Add CHECK constraints for well-being scales (must be done separately after columns exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_check_ins_stress_level_check'
  ) THEN
    ALTER TABLE daily_check_ins
      ADD CONSTRAINT daily_check_ins_stress_level_check 
        CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_check_ins_hunger_level_check'
  ) THEN
    ALTER TABLE daily_check_ins
      ADD CONSTRAINT daily_check_ins_hunger_level_check 
        CHECK (hunger_level IS NULL OR (hunger_level >= 1 AND hunger_level <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_check_ins_energy_level_check'
  ) THEN
    ALTER TABLE daily_check_ins
      ADD CONSTRAINT daily_check_ins_energy_level_check 
        CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN daily_check_ins.weight IS 'Weight measurement in kg (משקל)';
COMMENT ON COLUMN daily_check_ins.belly_circumference IS 'Belly circumference in cm (היקף בטן)';
COMMENT ON COLUMN daily_check_ins.waist_circumference IS 'Waist circumference in cm (היקף מותן)';
COMMENT ON COLUMN daily_check_ins.thigh_circumference IS 'Thigh circumference in cm (היקף ירכיים)';
COMMENT ON COLUMN daily_check_ins.arm_circumference IS 'Arm circumference in cm (היקף יד)';
COMMENT ON COLUMN daily_check_ins.neck_circumference IS 'Neck circumference in cm (היקף צוואר)';
COMMENT ON COLUMN daily_check_ins.exercises_count IS 'Number of exercises completed (כמה תרגילים עשית)';
COMMENT ON COLUMN daily_check_ins.cardio_amount IS 'Cardio duration in minutes (כמה אירובי עשית)';
COMMENT ON COLUMN daily_check_ins.intervals_count IS 'Number of interval training sessions (כמה אינטרוולים)';
COMMENT ON COLUMN daily_check_ins.calories_daily IS 'Daily calorie intake (קלוריות יומי)';
COMMENT ON COLUMN daily_check_ins.protein_daily IS 'Daily protein intake in grams (חלבון יומי)';
COMMENT ON COLUMN daily_check_ins.fiber_daily IS 'Daily fiber intake in grams (סיבים יומי)';
COMMENT ON COLUMN daily_check_ins.water_amount IS 'Water consumed in liters (כמה מים שתית)';
COMMENT ON COLUMN daily_check_ins.stress_level IS 'Daily stress level 1-10 (רמת הלחץ היומי)';
COMMENT ON COLUMN daily_check_ins.hunger_level IS 'Hunger level 1-10 (רמת הרעב שלך)';
COMMENT ON COLUMN daily_check_ins.energy_level IS 'Energy level 1-10 (רמת האנרגיה שלך)';
COMMENT ON COLUMN daily_check_ins.sleep_hours IS 'Hours of sleep (כמה שעות ישנת)';

