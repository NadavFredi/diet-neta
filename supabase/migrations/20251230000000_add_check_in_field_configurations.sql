-- Migration: Add check-in field configurations table
-- Allows admins to customize which fields and sections are visible in client check-in forms

-- Create check_in_field_configurations table
CREATE TABLE IF NOT EXISTS check_in_field_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  -- If customer_id is NULL, this is a global/default configuration
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one configuration per customer (or one global)
  CONSTRAINT check_in_field_configurations_customer_unique UNIQUE (customer_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_check_in_field_configurations_customer_id 
  ON check_in_field_configurations(customer_id);

-- Add index for global configurations
CREATE INDEX IF NOT EXISTS idx_check_in_field_configurations_global 
  ON check_in_field_configurations((customer_id IS NULL));

-- Enable RLS
ALTER TABLE check_in_field_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can read/write all configurations
CREATE POLICY "Admins can manage all check-in field configurations"
  ON check_in_field_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Clients can read their own configuration
CREATE POLICY "Clients can read their check-in field configuration"
  ON check_in_field_configurations
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE user_id = auth.uid()
    )
    OR customer_id IS NULL -- Also allow reading global/default config
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_check_in_field_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_check_in_field_configurations_updated_at
  BEFORE UPDATE ON check_in_field_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_check_in_field_configurations_updated_at();

-- Add comments
COMMENT ON TABLE check_in_field_configurations IS 'Stores configuration for check-in field visibility and labels per customer or globally';
COMMENT ON COLUMN check_in_field_configurations.customer_id IS 'Customer ID for customer-specific config, NULL for global/default config';
COMMENT ON COLUMN check_in_field_configurations.configuration IS 'JSONB object containing field visibility, labels, and section visibility settings';

-- Example configuration structure:
-- {
--   "sections": {
--     "body": { "visible": true, "label": "מדדי גוף" },
--     "activity": { "visible": true, "label": "פעילות" },
--     "nutrition": { "visible": true, "label": "תזונה" },
--     "wellness": { "visible": true, "label": "בריאות" }
--   },
--   "fields": {
--     "weight": { "visible": true, "label": "משקל", "section": "body" },
--     "bellyCircumference": { "visible": true, "label": "היקף בטן", "section": "body" },
--     "waistCircumference": { "visible": true, "label": "היקף מותן", "section": "body" },
--     "thighCircumference": { "visible": true, "label": "היקף ירכיים", "section": "body" },
--     "armCircumference": { "visible": true, "label": "היקף יד", "section": "body" },
--     "neckCircumference": { "visible": true, "label": "היקף צוואר", "section": "body" },
--     "stepsActual": { "visible": true, "label": "מס' צעדים יומי", "section": "activity" },
--     "exercisesCount": { "visible": true, "label": "כמה תרגילים עשית", "section": "activity" },
--     "cardioAmount": { "visible": true, "label": "כמה אירובי עשית", "section": "activity" },
--     "intervalsCount": { "visible": true, "label": "כמה אינטרוולים", "section": "activity" },
--     "caloriesDaily": { "visible": true, "label": "קלוריות יומי", "section": "nutrition" },
--     "proteinDaily": { "visible": true, "label": "חלבון יומי", "section": "nutrition" },
--     "fiberDaily": { "visible": true, "label": "סיבים יומי", "section": "nutrition" },
--     "waterAmount": { "visible": true, "label": "כמה מים שתית", "section": "nutrition" },
--     "stressLevel": { "visible": true, "label": "רמת הלחץ היומי", "section": "wellness" },
--     "hungerLevel": { "visible": true, "label": "רמת הרעב שלך", "section": "wellness" },
--     "energyLevel": { "visible": true, "label": "רמת האנרגיה שלך", "section": "wellness" },
--     "sleepHours": { "visible": true, "label": "כמה שעות ישנת", "section": "wellness" }
--   }
-- }

