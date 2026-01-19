-- Migration: Add display_order columns for drag-and-drop ordering
-- This allows users to customize the order of interfaces and pages/views

-- Add display_order to user_interface_preferences (for interfaces)
ALTER TABLE user_interface_preferences 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_user_interface_preferences_display_order 
    ON user_interface_preferences(user_id, display_order);

-- Add display_order to saved_views (for pages/views)
ALTER TABLE saved_views 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_saved_views_display_order 
    ON saved_views(resource_key, created_by, display_order);

-- Initialize display_order for existing interfaces based on current interface_key order
-- This sets a default order for existing preferences
DO $$
DECLARE
    interface_order RECORD;
    order_num INTEGER := 1;
BEGIN
    FOR interface_order IN 
        SELECT DISTINCT user_id, interface_key
        FROM user_interface_preferences
        ORDER BY user_id, interface_key
    LOOP
        UPDATE user_interface_preferences
        SET display_order = order_num
        WHERE user_id = interface_order.user_id 
          AND interface_key = interface_order.interface_key
          AND display_order IS NULL;
        order_num := order_num + 1;
    END LOOP;
END $$;

-- Initialize display_order for existing saved_views
-- Default views always get order 0, then others by creation date
DO $$
DECLARE
    view_order RECORD;
    order_num INTEGER;
BEGIN
    FOR view_order IN 
        SELECT id, resource_key, created_by, is_default, created_at
        FROM saved_views
        ORDER BY resource_key, created_by, is_default DESC, created_at
    LOOP
        IF view_order.is_default THEN
            order_num := 0;
        ELSE
            -- Get max order for this resource/user, or start from 1
            SELECT COALESCE(MAX(display_order), 0) + 1
            INTO order_num
            FROM saved_views
            WHERE resource_key = view_order.resource_key
              AND created_by = view_order.created_by
              AND id != view_order.id;
        END IF;
        
        UPDATE saved_views
        SET display_order = order_num
        WHERE id = view_order.id
          AND display_order IS NULL;
    END LOOP;
END $$;

-- Comments
COMMENT ON COLUMN user_interface_preferences.display_order IS 'Display order for the interface (lower numbers appear first)';
COMMENT ON COLUMN saved_views.display_order IS 'Display order for the page/view (0 for default view, higher numbers appear later)';
