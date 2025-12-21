-- Migration: Add customer_notes table for unified customer notes system
-- Created: 2024-01-02
-- Description: Customer-centric notes that are unified across all leads belonging to the same customer

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to manage notes
-- Adjust these policies based on your specific requirements

CREATE POLICY "Users can view customer notes" ON customer_notes
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert customer notes" ON customer_notes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update customer notes" ON customer_notes
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete customer notes" ON customer_notes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER customer_notes_updated_at
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_notes_updated_at();


