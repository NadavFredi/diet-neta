-- Migration: Create Meetings Table
-- Description: Stores meeting data from Fillout form submissions
-- Created: 2026-01-04

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  fillout_submission_id TEXT, -- ID from Fillout submission
  meeting_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Flexible JSONB to store all form data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_customer_id ON public.meetings(customer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON public.meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_fillout_submission_id ON public.meetings(fillout_submission_id);

-- Add RLS policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view all meetings
CREATE POLICY "Managers can view all meetings"
  ON public.meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Managers can insert meetings
CREATE POLICY "Managers can insert meetings"
  ON public.meetings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Managers can update meetings
CREATE POLICY "Managers can update meetings"
  ON public.meetings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Managers can delete meetings
CREATE POLICY "Managers can delete meetings"
  ON public.meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Add comments
COMMENT ON TABLE public.meetings IS 'Stores meeting data from Fillout form submissions';
COMMENT ON COLUMN public.meetings.lead_id IS 'Link to the lead that the meeting is associated with';
COMMENT ON COLUMN public.meetings.customer_id IS 'Link to the customer that the meeting is associated with';
COMMENT ON COLUMN public.meetings.fillout_submission_id IS 'Unique identifier from Fillout submission';
COMMENT ON COLUMN public.meetings.meeting_data IS 'Flexible JSONB containing all meeting data from Fillout form';






