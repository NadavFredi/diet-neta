-- Migration: Add buttons support to WhatsApp Flow Templates
-- Description: Adds JSONB column to store interactive buttons for WhatsApp messages
-- Created: 2024-01-02
-- Migration number: 20240102000031 (must be last in sequence)

-- Add buttons column to store interactive buttons array
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.whatsapp_flow_templates.buttons IS 'Array of interactive buttons: [{"id": "1", "text": "Button Text"}]';

-- Ensure any existing data complies with max 3 buttons rule before adding constraint
-- This is safe because the column was just added, so there should be no existing data
-- But we do this defensively in case the migration is run multiple times
UPDATE public.whatsapp_flow_templates
SET buttons = '[]'::jsonb
WHERE buttons IS NULL 
   OR (jsonb_typeof(buttons) = 'array' AND jsonb_array_length(COALESCE(buttons, '[]'::jsonb)) > 3);

-- Add constraint to ensure buttons array has max 3 items (idempotent)
-- Use DO block to safely handle constraint creation/dropping
DO $$
BEGIN
    -- Drop constraint if it exists (in case of re-running migration)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_buttons_max_count' 
        AND conrelid = 'public.whatsapp_flow_templates'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_flow_templates DROP CONSTRAINT check_buttons_max_count;
    END IF;
    
    -- Add the constraint
    ALTER TABLE public.whatsapp_flow_templates
    ADD CONSTRAINT check_buttons_max_count 
    CHECK (jsonb_array_length(COALESCE(buttons, '[]'::jsonb)) <= 3);
EXCEPTION
    WHEN others THEN
        -- If constraint creation fails, log but don't fail the migration
        RAISE NOTICE 'Could not add check_buttons_max_count constraint: %', SQLERRM;
END $$;
