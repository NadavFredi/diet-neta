-- =====================================================
-- Add attachment_url column to customer_notes table
-- Created: 2026-01-04
-- Description: Allow notes to have file attachments stored in Supabase Storage
-- =====================================================

-- Add attachment_url column to store the file path in Supabase Storage
ALTER TABLE customer_notes 
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create index for faster queries on notes with attachments
CREATE INDEX IF NOT EXISTS idx_customer_notes_attachment_url 
  ON customer_notes(attachment_url) 
  WHERE attachment_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_notes.attachment_url IS 'URL/path to file attachment in Supabase Storage (client-assets bucket)';

-- =====================================================
-- Migration Complete
-- =====================================================

