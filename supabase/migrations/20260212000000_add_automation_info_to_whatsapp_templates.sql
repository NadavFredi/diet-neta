-- Migration: Add Automation Info to WhatsApp Flow Templates
-- Description: Adds name and status fields to store ALL automation information and text in the database
-- Created: 2026-02-12
-- This migration ensures ALL automation data and text is stored in DB:
--   - flow_key (unique identifier)
--   - name (Hebrew description/label)
--   - status (configuration status)
--   - template_content (full message text with HTML formatting)
--   - buttons (JSONB with all button text, actions, and action configs including reply messages, URLs, etc.)
--   - media (JSONB with media type and URL)

-- Add name column to store the Hebrew description/label of the automation
-- This is the editable name shown in the automation list (e.g., "תחילת מסע לקוח ותיאום פגישה")
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add status column to track automation configuration status (e.g., 'מוגדר', 'לא מוגדר')
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'לא מוגדר';

-- Add description column for additional descriptive text about the automation
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure template_content column can store rich text (HTML) - it's already TEXT, but add comment
-- This stores ALL the message text including HTML formatting, placeholders, and any text content
COMMENT ON COLUMN public.whatsapp_flow_templates.template_content IS 'Full message template text with HTML formatting from rich text editor. Contains ALL text content including placeholders like {{name}}, {{phone}}, {{email}}, {{password}}, {{login_url}}, {{city}}, {{gender}}, {{payment_link}}, {{status}}, {{lead_id}}, etc. This is the complete message that will be sent.';

-- Ensure buttons JSONB column stores ALL button text and configurations
-- Buttons structure: [{"id": "string", "text": "button text", "action": "reply|flow|url|none", "actionConfig": {"replyMessage": "...", "url": "...", "flowKey": "..."}}]
-- This stores ALL button-related text: button labels, reply messages, URLs, flow keys, etc.
COMMENT ON COLUMN public.whatsapp_flow_templates.buttons IS 'Array of interactive buttons storing ALL button text: [{"id": "string", "text": "button label text (up to 25 chars)", "action": "reply|flow|url|none", "actionConfig": {"replyMessage": "auto reply message text", "url": "https://...", "flowKey": "..."}}]. Stores ALL button-related text including button labels, reply messages, URLs, flow keys, and any other button configuration text.';

-- Add comments for all text fields to document that ALL text is stored
COMMENT ON COLUMN public.whatsapp_flow_templates.name IS 'Hebrew name/description of the automation (e.g., "תחילת מסע לקוח ותיאום פגישה"). This is the editable label shown in the automation list. Stores the display name of the automation.';
COMMENT ON COLUMN public.whatsapp_flow_templates.description IS 'Optional additional descriptive text about the automation. Can contain any explanatory text about what the automation does.';
COMMENT ON COLUMN public.whatsapp_flow_templates.status IS 'Status of automation configuration (e.g., "מוגדר" for configured, "לא מוגדר" for not configured, "מושעה" for suspended).';
COMMENT ON COLUMN public.whatsapp_flow_templates.flow_key IS 'Unique identifier for the automation flow (e.g., customer_journey_start, intro_questionnaire, budget, payment_request, trainee_user_credentials, weekly_review).';
COMMENT ON COLUMN public.whatsapp_flow_templates.media IS 'Media attachment information stored as JSONB: {"type": "image|video|gif", "url": "..."}. Stores media-related text/URLs if applicable.';

-- Summary comment on the table to document that ALL automation text is stored
COMMENT ON TABLE public.whatsapp_flow_templates IS 'Stores ALL automation information and ALL text content: flow_key (identifier), name (display name), description (optional description), status (configuration status), template_content (full message text with HTML), buttons (all button text and configs), media (media URLs). Every piece of text in the automation is persisted in this table.';

-- Create index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_templates_status 
ON public.whatsapp_flow_templates(user_id, status);

-- Create index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_templates_name 
ON public.whatsapp_flow_templates(user_id, name);

-- Update existing templates to set status based on whether they have content
-- If template_content is not empty, set status to 'מוגדר', otherwise 'לא מוגדר'
UPDATE public.whatsapp_flow_templates
SET status = CASE 
  WHEN template_content IS NOT NULL AND TRIM(template_content) != '' THEN 'מוגדר'
  ELSE 'לא מוגדר'
END
WHERE status IS NULL OR status = 'לא מוגדר';

-- Set default names for known flow keys if they don't have names yet
-- This seeds the database with default automation names
UPDATE public.whatsapp_flow_templates
SET name = CASE flow_key
  WHEN 'customer_journey_start' THEN 'תחילת מסע לקוח ותיאום פגישה'
  WHEN 'intro_questionnaire' THEN 'אוטומטי שליחת שאלון הכרות לאחר קביעת שיחה'
  WHEN 'budget' THEN 'שליחת תכנית פעולה'
  WHEN 'payment_request' THEN 'בקשת תשלום'
  WHEN 'trainee_user_credentials' THEN 'שליחת פרטי משתמש'
  WHEN 'weekly_review' THEN 'סיכום שבועי ויעדים'
  ELSE name
END
WHERE name IS NULL OR name = '';

-- Add constraint to ensure status is one of the valid values
DO $$
BEGIN
    -- Drop constraint if it exists (in case of re-running migration)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_whatsapp_template_status' 
        AND conrelid = 'public.whatsapp_flow_templates'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_flow_templates DROP CONSTRAINT check_whatsapp_template_status;
    END IF;
    
    -- Add the constraint
    ALTER TABLE public.whatsapp_flow_templates
    ADD CONSTRAINT check_whatsapp_template_status 
    CHECK (status IN ('מוגדר', 'לא מוגדר', 'מושעה'));
EXCEPTION
    WHEN others THEN
        -- If constraint creation fails, log but don't fail the migration
        RAISE NOTICE 'Could not add check_whatsapp_template_status constraint: %', SQLERRM;
END $$;

-- Create a function to automatically update status when template_content changes
CREATE OR REPLACE FUNCTION update_whatsapp_template_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on template_content
  IF NEW.template_content IS NOT NULL AND TRIM(NEW.template_content) != '' THEN
    NEW.status = 'מוגדר';
  ELSE
    NEW.status = 'לא מוגדר';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status when template_content is updated
DROP TRIGGER IF EXISTS trigger_update_whatsapp_template_status ON public.whatsapp_flow_templates;
CREATE TRIGGER trigger_update_whatsapp_template_status
  BEFORE INSERT OR UPDATE OF template_content ON public.whatsapp_flow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_template_status();

-- Add updated_at trigger if it doesn't exist (for consistency)
-- This ensures updated_at is always updated when any field changes
CREATE OR REPLACE FUNCTION update_whatsapp_flow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS update_whatsapp_flow_templates_updated_at ON public.whatsapp_flow_templates;
CREATE TRIGGER update_whatsapp_flow_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_flow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_flow_templates_updated_at();
