-- =====================================================
-- Workout Plans Migration
-- Created: 2024-01-02
-- Description: User workout plans with dynamic custom attributes
-- =====================================================

-- =====================================================
-- TABLE: workout_plans
-- =====================================================

CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Standard fields
    start_date DATE NOT NULL,
    description TEXT,
    
    -- Metric columns
    strength INTEGER DEFAULT 0,
    cardio INTEGER DEFAULT 0,
    intervals INTEGER DEFAULT 0,
    
    -- Dynamic custom attributes (JSONB)
    -- Structure: { "schema": [{ "fieldName": "string", "fieldType": "text|number|date|boolean" }], "data": { "fieldName": "value" } }
    custom_attributes JSONB DEFAULT '{"schema": [], "data": {}}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_lead_id ON workout_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_start_date ON workout_plans(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_plans_created_at ON workout_plans(created_at DESC);

-- GIN index for JSONB column (enables fast queries on JSONB data)
CREATE INDEX IF NOT EXISTS idx_workout_plans_custom_attributes ON workout_plans USING GIN (custom_attributes);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_workout_plans_updated_at
    BEFORE UPDATE ON workout_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on workout_plans table
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own workout plans
CREATE POLICY "Users can read own workout plans"
    ON workout_plans FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own workout plans
CREATE POLICY "Users can insert own workout plans"
    ON workout_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workout plans
CREATE POLICY "Users can update own workout plans"
    ON workout_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workout plans
CREATE POLICY "Users can delete own workout plans"
    ON workout_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to workout plans
CREATE POLICY "Admins have full access to workout plans"
    ON workout_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

























