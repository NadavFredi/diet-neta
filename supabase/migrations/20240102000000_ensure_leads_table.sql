-- =====================================================
-- Ensure Leads Table Exists
-- Created: 2024-01-02
-- Description: This migration ensures the leads table exists
--              and is properly accessible in the public schema
-- =====================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- Drop table if it exists (only if you want to recreate it)
-- Uncomment the next line if you need to recreate the table
-- DROP TABLE IF EXISTS leads CASCADE;

-- Create the leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
    -- Meta Data
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
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
    workout_history JSONB DEFAULT '[]'::jsonb,
    steps_history JSONB DEFAULT '[]'::jsonb,
    
    -- Additional fields from the application
    source TEXT,
    fitness_goal TEXT,
    activity_level TEXT,
    preferred_time TEXT,
    notes TEXT
);

-- Ensure the table is in the public schema
ALTER TABLE IF EXISTS public.leads SET SCHEMA public;

-- Grant necessary permissions
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status_main ON public.leads(status_main);
CREATE INDEX IF NOT EXISTS idx_leads_status_sub ON public.leads(status_sub);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_join_date ON public.leads(join_date);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_leads_daily_protocol ON public.leads USING GIN (daily_protocol);
CREATE INDEX IF NOT EXISTS idx_leads_workout_history ON public.leads USING GIN (workout_history);
CREATE INDEX IF NOT EXISTS idx_leads_steps_history ON public.leads USING GIN (steps_history);
CREATE INDEX IF NOT EXISTS idx_leads_subscription_data ON public.leads USING GIN (subscription_data);

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure BMI calculation function exists
CREATE OR REPLACE FUNCTION public.calculate_bmi(height_cm DECIMAL, weight_kg DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 OR weight_kg <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger for auto-calculating BMI
DROP TRIGGER IF EXISTS calculate_bmi_trigger ON public.leads;
CREATE OR REPLACE FUNCTION public.update_lead_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
        NEW.bmi = public.calculate_bmi(NEW.height, NEW.weight);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_bmi_trigger
    BEFORE INSERT OR UPDATE OF height, weight ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_bmi();

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete assigned leads" ON public.leads;

-- Recreate RLS policies
CREATE POLICY "Authenticated users can read leads"
    ON public.leads FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert leads"
    ON public.leads FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update assigned leads"
    ON public.leads FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to leads"
    ON public.leads FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete assigned leads"
    ON public.leads FOR DELETE
    USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE public.leads IS 'Central entity for CRM leads/trainees with flexible JSONB columns for dynamic data';









