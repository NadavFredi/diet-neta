-- Migration: Add user_interface_preferences table for storing custom interface icons
-- This allows users to customize icons for main interface items (e.g., "ניהול לידים", "ניהול לקוחות")

CREATE TABLE IF NOT EXISTS user_interface_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interface_key TEXT NOT NULL, -- e.g., 'leads', 'customers', 'templates', etc.
    icon_name TEXT NOT NULL, -- e.g., 'Users', 'Dumbbell', 'LayoutDashboard', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one preference per interface per user
    CONSTRAINT unique_user_interface_preference 
        UNIQUE (user_id, interface_key)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_interface_preferences_user_id 
    ON user_interface_preferences(user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_interface_preferences_updated_at
    BEFORE UPDATE ON user_interface_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_interface_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own interface preferences"
    ON user_interface_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own interface preferences"
    ON user_interface_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own interface preferences"
    ON user_interface_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete their own interface preferences"
    ON user_interface_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_interface_preferences IS 'User preferences for customizing interface icons';
COMMENT ON COLUMN user_interface_preferences.interface_key IS 'The interface identifier (e.g., "leads", "customers", "templates")';
COMMENT ON COLUMN user_interface_preferences.icon_name IS 'The Lucide icon name (e.g., "Users", "Dumbbell", "LayoutDashboard")';
