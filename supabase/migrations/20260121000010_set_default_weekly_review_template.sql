-- =====================================================
-- Set Default Weekly Review WhatsApp Template
-- Created: 2026-01-21
-- Description: Sets default template for weekly_review automation
--              This template matches the format used when sending weekly goals
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Create a function to set default weekly_review template for a user
CREATE OR REPLACE FUNCTION set_default_weekly_review_template(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert or update the weekly_review template for the user
  INSERT INTO public.whatsapp_flow_templates (user_id, flow_key, template_content, buttons, media)
  VALUES (
    p_user_id,
    'weekly_review',
    '📊 סיכום שבועי - שבוע {{week_start}} - {{week_end}}

🎯 יעדים:
קלוריות: {{target_calories}} קק"ל
חלבון: {{target_protein}} גרם
סיבים: {{target_fiber}} גרם
צעדים: {{target_steps}}

📈 בפועל (ממוצע):
קלוריות: {{actual_calories}} קק"ל
משקל ממוצע: {{actual_weight}} ק"ג',
    '[]'::jsonb,
    NULL
  )
  ON CONFLICT (user_id, flow_key)
  DO UPDATE SET
    template_content = EXCLUDED.template_content,
    updated_at = NOW()
  WHERE whatsapp_flow_templates.template_content = '' OR whatsapp_flow_templates.template_content IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set default template for all existing users (coaches/managers)
-- This will only set templates for users who don't already have a weekly_review template
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users
    WHERE id NOT IN (
      SELECT DISTINCT user_id 
      FROM public.whatsapp_flow_templates 
      WHERE flow_key = 'weekly_review' 
      AND template_content IS NOT NULL 
      AND template_content != ''
    )
  LOOP
    PERFORM set_default_weekly_review_template(user_record.id);
  END LOOP;
END $$;

-- Add comment
COMMENT ON FUNCTION set_default_weekly_review_template(UUID) IS 'Sets default weekly_review WhatsApp template for a user. Only updates if template is empty or null.';

-- =====================================================
-- Migration Complete
-- =====================================================
