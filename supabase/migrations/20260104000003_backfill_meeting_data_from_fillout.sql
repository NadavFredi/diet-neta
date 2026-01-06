-- Migration: Backfill Meeting Data from Fillout
-- Description: This migration provides a function to re-sync meeting_data from Fillout API
--              for existing meetings that only have metadata. Run this manually via Supabase SQL editor
--              or create an Edge Function to trigger it.
-- Created: 2026-01-04

-- Note: This migration doesn't automatically backfill data.
-- To backfill existing meetings, you need to:
-- 1. Call the sync-fillout-meetings Edge Function which will update existing meetings
-- 2. Or manually update meetings via the Supabase dashboard
-- 3. Or create a one-time script to fetch from Fillout API and update meeting_data

-- The sync-fillout-meetings function has been updated to properly extract all question data
-- including the Schedule field. When you run the sync, it will update existing meetings
-- with the full meeting_data including all form fields.

-- This migration file serves as documentation that the extraction logic has been improved.
-- No database schema changes are needed as meeting_data is already JSONB and can store any structure.

COMMENT ON COLUMN public.meetings.meeting_data IS 'Flexible JSONB containing all meeting data from Fillout form, including Schedule field for actual meeting date/time';



