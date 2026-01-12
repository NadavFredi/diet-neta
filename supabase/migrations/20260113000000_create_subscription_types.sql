-- =====================================================
-- Subscription Types (Sugei Menuyim) Migration
-- Created: 2026-01-13
-- Description: Master subscription type templates for leads
-- =====================================================

-- =====================================================
-- TABLE: subscription_types
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    duration INTEGER NOT NULL, -- Duration in months
    price NUMERIC(10, 2) NOT NULL, -- Price in NIS
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_types_created_by ON subscription_types(created_by);
CREATE INDEX IF NOT EXISTS idx_subscription_types_created_at ON subscription_types(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_subscription_types_updated_at
    BEFORE UPDATE ON subscription_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on subscription_types table
ALTER TABLE subscription_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all subscription types
CREATE POLICY "Users can view subscription types"
    ON subscription_types FOR SELECT
    USING (true);

-- Policy: Users can insert their own subscription types
CREATE POLICY "Users can insert own subscription types"
    ON subscription_types FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own subscription types
CREATE POLICY "Users can update own subscription types"
    ON subscription_types FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own subscription types
CREATE POLICY "Users can delete own subscription types"
    ON subscription_types FOR DELETE
    USING (auth.uid() = created_by);

-- Policy: Admins have full access to subscription types
CREATE POLICY "Admins have full access to subscription types"
    ON subscription_types FOR ALL
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
-- COMMENTS
-- =====================================================

COMMENT ON TABLE subscription_types IS 'Master subscription type templates that can be used to populate lead subscription data';
COMMENT ON COLUMN subscription_types.duration IS 'Duration in months (e.g., 3, 6, 12)';
COMMENT ON COLUMN subscription_types.price IS 'Price in NIS (e.g., 299.99)';

-- =====================================================
-- Migration Complete
-- =====================================================
