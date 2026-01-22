-- Migration: Add numeric_value column to user_interface_preferences
-- This allows storing numeric preferences like sidebar width alongside icon preferences

-- Make icon_name nullable to support numeric-only preferences
ALTER TABLE user_interface_preferences
ALTER COLUMN icon_name DROP NOT NULL;

-- Add numeric_value column
ALTER TABLE user_interface_preferences
ADD COLUMN IF NOT EXISTS numeric_value INTEGER;

-- Add comment
COMMENT ON COLUMN user_interface_preferences.numeric_value IS 'Numeric preference value (e.g., sidebar width in pixels)';

-- Update the unique constraint to allow same interface_key with different value types
-- Note: The existing constraint on (user_id, interface_key) still applies
-- This means one preference per interface per user, but now it can be either icon_name or numeric_value
