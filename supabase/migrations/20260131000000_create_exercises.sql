-- =====================================================
-- Create Exercises Table
-- Created: 2026-01-31
-- Description: Stores exercise library with name, repetitions, weight, image, and video link
-- =====================================================

-- =====================================================
-- TABLE: exercises
-- =====================================================

CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    repetitions INTEGER, -- Default repetitions/reps
    weight DECIMAL(5, 2), -- Default weight in kg
    image TEXT, -- URL or path to image
    video_link TEXT, -- URL to video (YouTube, Vimeo, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_created_at ON public.exercises(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on exercises table
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all exercises
CREATE POLICY "Authenticated users can view exercises"
    ON public.exercises FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert exercises
CREATE POLICY "Authenticated users can insert exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update exercises
CREATE POLICY "Authenticated users can update exercises"
    ON public.exercises FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete exercises
CREATE POLICY "Authenticated users can delete exercises"
    ON public.exercises FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.exercises IS 'Exercise library that can be selected and used in workout templates';
COMMENT ON COLUMN public.exercises.name IS 'Exercise name';
COMMENT ON COLUMN public.exercises.repetitions IS 'Default number of repetitions/reps';
COMMENT ON COLUMN public.exercises.weight IS 'Default weight in kg';
COMMENT ON COLUMN public.exercises.image IS 'URL or path to exercise image';
COMMENT ON COLUMN public.exercises.video_link IS 'URL to exercise video (YouTube, Vimeo, etc.)';

-- =====================================================
-- Migration Complete
-- =====================================================
