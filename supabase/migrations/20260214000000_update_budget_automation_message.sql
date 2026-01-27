-- Migration: Update Budget Automation Message
-- Description: Updates the budget WhatsApp automation message to the new simplified format
-- Created: 2026-02-14
-- This migration must be the LAST one in the list for migration up to work correctly

-- Update all existing budget automation templates to use the new message format
-- Old format: "שלום אנדרי שצוקין, התקציב שלך מוכן! 📋 שם התקציב: {{budget_name}} לצפייה בתקציב המלא: {{budget_link}} בברכה, צוות DietNeta"
-- New format: "שלום אנדרי שצוקין, התקציב שלך מוכן בפורטל! 📋 בברכה, צוות DietNeta"
-- This updates all budget templates that contain the old format with budget_name and budget_link placeholders
UPDATE public.whatsapp_flow_templates
SET 
  template_content = 'שלום אנדרי שצוקין, התקציב שלך מוכן בפורטל! 📋 בברכה, צוות DietNeta',
  updated_at = NOW()
WHERE 
  flow_key = 'budget'
  AND (
    template_content LIKE '%{{budget_name}}%'
    OR template_content LIKE '%{{budget_link}}%'
    OR template_content LIKE '%שם התקציב:%'
    OR template_content LIKE '%לצפייה בתקציב המלא:%'
  );

-- Add comment
COMMENT ON COLUMN public.whatsapp_flow_templates.template_content IS 'Full message template text with HTML formatting from rich text editor. Contains ALL text content including placeholders like {{name}}, {{phone}}, {{email}}, {{password}}, {{login_url}}, {{city}}, {{gender}}, {{payment_link}}, {{status}}, {{lead_id}}, etc. This is the complete message that will be sent.';

-- =====================================================
-- Migration Complete
-- =====================================================
