-- =====================================================
-- Initial Schema Migration for Diet Neta CRM
-- Created: 2024-01-01
-- Description: Production-ready schema with RLS, JSONB flexibility, and auto-triggers
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================

-- Enable UUID generation
-- Note: Using gen_random_uuid() (built-in PostgreSQL 13+) instead of uuid_generate_v4() for better Supabase compatibility
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. UTILITY FUNCTIONS
-- =====================================================

-- Generic function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TABLE: profiles
-- =====================================================

-- Profiles table links to auth.users and manages user roles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. TABLE: leads (The Central Entity)
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
    -- Meta Data
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Personal Info
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    city TEXT,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')) DEFAULT NULL,
    
    -- Status Management
    status_main TEXT,
    status_sub TEXT,
    
    -- Physical Metrics
    height DECIMAL(5, 2), -- in cm
    weight DECIMAL(5, 2), -- in kg
    bmi DECIMAL(4, 2), -- calculated or stored
    
    -- Business/Subscription
    join_date TIMESTAMP WITH TIME ZONE,
    subscription_data JSONB DEFAULT '{}'::jsonb,
    
    -- Dynamic Data Columns (JSONB for flexibility)
    daily_protocol JSONB DEFAULT '{}'::jsonb,
    -- Structure: { "stepsGoal": 8000, "workoutGoal": 3, "supplements": ["Omega 3", "Magnesium"] }
    
    workout_history JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ "name": "Plan A", "startDate": "2024-01-01", "validUntil": "2024-04-01", 
    --              "duration": "3 months", "description": "...", 
    --              "strengthCount": 3, "cardioCount": 1, "intervalsCount": 1 }]
    
    steps_history JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ "weekNumber": 1, "startDate": "2024-01-01", "endDate": "2024-01-07", "target": 7000 }]
    
    -- Additional fields from the application
    source TEXT,
    fitness_goal TEXT,
    activity_level TEXT,
    preferred_time TEXT,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status_main ON leads(status_main);
CREATE INDEX IF NOT EXISTS idx_leads_status_sub ON leads(status_sub);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_join_date ON leads(join_date);

-- GIN indexes for JSONB columns (enables fast queries on JSONB data)
CREATE INDEX IF NOT EXISTS idx_leads_daily_protocol ON leads USING GIN (daily_protocol);
CREATE INDEX IF NOT EXISTS idx_leads_workout_history ON leads USING GIN (workout_history);
CREATE INDEX IF NOT EXISTS idx_leads_steps_history ON leads USING GIN (steps_history);
CREATE INDEX IF NOT EXISTS idx_leads_subscription_data ON leads USING GIN (subscription_data);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES: profiles
-- =====================================================

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins have full access to profiles
CREATE POLICY "Admins have full access to profiles"
    ON profiles FOR ALL
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

-- =====================================================
-- 7. RLS POLICIES: leads
-- =====================================================

-- Policy: Authenticated users can read all leads (adjust based on business logic)
CREATE POLICY "Authenticated users can read leads"
    ON leads FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert leads
CREATE POLICY "Authenticated users can insert leads"
    ON leads FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update leads assigned to them
CREATE POLICY "Users can update assigned leads"
    ON leads FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins have full access to leads
CREATE POLICY "Admins have full access to leads"
    ON leads FOR ALL
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

-- Policy: Users can delete leads (only admins or assigned users)
CREATE POLICY "Users can delete assigned leads"
    ON leads FOR DELETE
    USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 8. HELPER FUNCTIONS (Optional but useful)
-- =====================================================

-- Function to calculate BMI (can be used in triggers or application layer)
CREATE OR REPLACE FUNCTION calculate_bmi(height_cm DECIMAL, weight_kg DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 OR weight_kg <= 0 THEN
        RETURN NULL;
    END IF;
    -- BMI = weight (kg) / (height (m))^2
    RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Optional: Trigger to auto-calculate BMI when height or weight changes
CREATE OR REPLACE FUNCTION update_lead_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
        NEW.bmi = calculate_bmi(NEW.height, NEW.weight);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_bmi_trigger
    BEFORE INSERT OR UPDATE OF height, weight ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_bmi();

-- =====================================================
-- 9. COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE profiles IS 'User profiles linked to auth.users, manages roles and user metadata';
COMMENT ON TABLE leads IS 'Central entity for CRM leads/trainees with flexible JSONB columns for dynamic data';

COMMENT ON COLUMN leads.daily_protocol IS 'JSONB: { "stepsGoal": number, "workoutGoal": number, "supplements": string[] }';
COMMENT ON COLUMN leads.workout_history IS 'JSONB: Array of workout program objects with dates, splits, and descriptions';
COMMENT ON COLUMN leads.steps_history IS 'JSONB: Array of step tracking objects with week numbers, dates, and targets';
COMMENT ON COLUMN leads.subscription_data IS 'JSONB: Flexible subscription information including pricing and package details';

-- =====================================================
-- Migration Complete
-- =====================================================























