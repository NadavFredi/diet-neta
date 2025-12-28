-- Migration: Add lead_id column to customer_notes table
-- Created: 2024-01-02
-- Description: Allow notes to be associated with specific leads/inquiries

ALTER TABLE customer_notes 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customer_notes_lead_id ON customer_notes(lead_id);

-- Add comment
COMMENT ON COLUMN customer_notes.lead_id IS 'Optional reference to a specific lead/inquiry. NULL means the note applies to all inquiries for the customer.';
