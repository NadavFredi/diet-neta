-- Migration: Add icon_name column to saved_views table
-- This allows users to customize the icon for each saved view

-- Add icon_name column (nullable, defaults to NULL for existing rows)
ALTER TABLE saved_views 
ADD COLUMN IF NOT EXISTS icon_name TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN saved_views.icon_name IS 'Name of the Lucide icon component to use for this view (e.g., "Users", "Dumbbell", "Flame"). If NULL, uses default icon for the resource_key.';



