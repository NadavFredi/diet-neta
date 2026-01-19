-- =====================================================
-- Migration: Create Fillout Submissions Table
-- Created: 2026-01-21
-- Description: Stores all Fillout form submissions with submission type for easy categorization
-- =====================================================

-- Create fillout_submissions table
CREATE TABLE IF NOT EXISTS public.fillout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fillout_submission_id TEXT NOT NULL UNIQUE, -- Unique identifier from Fillout
  fillout_form_id TEXT NOT NULL, -- Form ID from Fillout
  submission_type TEXT, -- Type of submission (e.g., 'meeting', 'questionnaire', etc.)
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Flexible JSONB to store all form data
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_fillout_submission_id ON public.fillout_submissions(fillout_submission_id);
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_fillout_form_id ON public.fillout_submissions(fillout_form_id);
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_submission_type ON public.fillout_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_lead_id ON public.fillout_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_customer_id ON public.fillout_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_fillout_submissions_created_at ON public.fillout_submissions(created_at DESC);

-- Add RLS policies
ALTER TABLE public.fillout_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view all submissions
CREATE POLICY "Managers can view all fillout submissions"
  ON public.fillout_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Managers can insert submissions
CREATE POLICY "Managers can insert fillout submissions"
  ON public.fillout_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Managers can update submissions
CREATE POLICY "Managers can update fillout submissions"
  ON public.fillout_submissions
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

-- Policy: Managers can delete submissions
CREATE POLICY "Managers can delete fillout submissions"
  ON public.fillout_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'manager'
    )
  );

-- Policy: Allow service role (edge functions) to insert/update submissions
CREATE POLICY "Service role can manage fillout submissions"
  ON public.fillout_submissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fillout_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_fillout_submissions_updated_at
  BEFORE UPDATE ON public.fillout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_fillout_submissions_updated_at();

-- Add comments
COMMENT ON TABLE public.fillout_submissions IS 'Stores all Fillout form submissions with type for easy categorization';
COMMENT ON COLUMN public.fillout_submissions.fillout_submission_id IS 'Unique identifier from Fillout submission';
COMMENT ON COLUMN public.fillout_submissions.fillout_form_id IS 'Form ID from Fillout';
COMMENT ON COLUMN public.fillout_submissions.submission_type IS 'Type of submission (e.g., meeting, questionnaire) - extracted from form submission';
COMMENT ON COLUMN public.fillout_submissions.submission_data IS 'Flexible JSONB containing all form submission data';
COMMENT ON COLUMN public.fillout_submissions.lead_id IS 'Link to the lead that the submission is associated with';
COMMENT ON COLUMN public.fillout_submissions.customer_id IS 'Link to the customer that the submission is associated with';

-- =====================================================
-- Migration Complete
-- =====================================================
