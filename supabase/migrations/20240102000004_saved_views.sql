-- =====================================================
-- Saved Views Migration
-- Created: 2024-01-02
-- Description: Table for storing user-defined saved views/filters for resources
-- =====================================================

-- =====================================================
-- TABLE: saved_views
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_key TEXT NOT NULL CHECK (resource_key IN ('leads', 'workouts', 'customers')),
    view_name TEXT NOT NULL,
    filter_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique view names per resource per user
    CONSTRAINT unique_view_name_per_resource_user 
        UNIQUE (resource_key, created_by, view_name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_views_resource_key ON saved_views(resource_key);
CREATE INDEX IF NOT EXISTS idx_saved_views_created_by ON saved_views(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_views_resource_user ON saved_views(resource_key, created_by);
CREATE INDEX IF NOT EXISTS idx_saved_views_default ON saved_views(resource_key, created_by, is_default) WHERE is_default = TRUE;

-- Unique partial index to ensure only one default view per resource per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_views_unique_default 
    ON saved_views(resource_key, created_by) 
    WHERE is_default = TRUE;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_saved_views_updated_at
    BEFORE UPDATE ON saved_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved views
CREATE POLICY "Users can view their own saved views"
    ON saved_views
    FOR SELECT
    USING (auth.uid() = created_by);

-- Policy: Users can insert their own saved views
CREATE POLICY "Users can insert their own saved views"
    ON saved_views
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own saved views
CREATE POLICY "Users can update their own saved views"
    ON saved_views
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own saved views
CREATE POLICY "Users can delete their own saved views"
    ON saved_views
    FOR DELETE
    USING (auth.uid() = created_by);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE saved_views IS 'User-defined saved views/filters for different resources (leads, workouts, etc.)';
COMMENT ON COLUMN saved_views.resource_key IS 'The resource type this view applies to (e.g., "leads", "workouts")';
COMMENT ON COLUMN saved_views.view_name IS 'User-friendly name for the saved view';
COMMENT ON COLUMN saved_views.filter_config IS 'JSONB object storing the complete filter/sort state for this view';
COMMENT ON COLUMN saved_views.is_default IS 'Whether this is the default view for the resource (only one default per resource per user)';

-- =====================================================
-- Migration Complete
-- =====================================================

