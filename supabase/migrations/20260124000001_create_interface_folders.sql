-- Migration: Create interface_folders table for organizing pages into folders
-- This allows users to create folders under interfaces and organize pages into them

-- =====================================================
-- TABLE: interface_folders
-- =====================================================

CREATE TABLE IF NOT EXISTS interface_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    interface_key TEXT NOT NULL, -- e.g., 'leads', 'customers', 'templates', etc.
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique folder names per interface per user
    CONSTRAINT unique_folder_name_per_interface_user 
        UNIQUE (interface_key, user_id, name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interface_folders_interface_key ON interface_folders(interface_key);
CREATE INDEX IF NOT EXISTS idx_interface_folders_user_id ON interface_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_interface_folders_interface_user ON interface_folders(interface_key, user_id);
CREATE INDEX IF NOT EXISTS idx_interface_folders_display_order ON interface_folders(interface_key, user_id, display_order);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_interface_folders_updated_at
    BEFORE UPDATE ON interface_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE interface_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own folders
CREATE POLICY "Users can view their own folders"
    ON interface_folders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own folders
CREATE POLICY "Users can insert their own folders"
    ON interface_folders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own folders
CREATE POLICY "Users can update their own folders"
    ON interface_folders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own folders
CREATE POLICY "Users can delete their own folders"
    ON interface_folders
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Add folder_id to saved_views
-- =====================================================

-- Add folder_id column to saved_views (nullable - pages can be in a folder or not)
ALTER TABLE saved_views 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES interface_folders(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_views_folder_id ON saved_views(folder_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE interface_folders IS 'User-defined folders for organizing pages under interfaces';
COMMENT ON COLUMN interface_folders.name IS 'Name of the folder';
COMMENT ON COLUMN interface_folders.interface_key IS 'The interface this folder belongs to (e.g., "leads", "customers")';
COMMENT ON COLUMN interface_folders.display_order IS 'Display order for the folder (lower numbers appear first)';
COMMENT ON COLUMN saved_views.folder_id IS 'Optional folder this page belongs to. NULL means the page is directly under the interface.';

-- =====================================================
-- Migration Complete
-- =====================================================
