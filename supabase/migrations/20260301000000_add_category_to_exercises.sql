-- =====================================================
-- Add Category Column to Exercises Table
-- Created: 2026-03-01
-- Description: Adds a category field (like a tag) to exercises for filtering and organization
-- =====================================================

-- Add category column to exercises table
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);

-- Add comment
COMMENT ON COLUMN public.exercises.category IS 'Exercise category/tag for filtering and organization';

-- =====================================================
-- Migration Complete
-- =====================================================
