-- =====================================================
-- Fix Meetings RLS Policies
-- Created: 2026-01-04
-- Description: Update RLS policies to use 'admin' and 'user' roles instead of 'manager'
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can view all meetings" ON public.meetings;
DROP POLICY IF EXISTS "Managers can insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Managers can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Managers can delete meetings" ON public.meetings;

-- Policy: Admins and users (managers) can view all meetings
CREATE POLICY "Admins and users can view all meetings"
  ON public.meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user')
    )
  );

-- Policy: Admins and users can insert meetings
CREATE POLICY "Admins and users can insert meetings"
  ON public.meetings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user')
    )
  );

-- Policy: Admins and users can update meetings
CREATE POLICY "Admins and users can update meetings"
  ON public.meetings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user')
    )
  );

-- Policy: Admins and users can delete meetings
CREATE POLICY "Admins and users can delete meetings"
  ON public.meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user')
    )
  );

-- =====================================================
-- Migration Complete
-- =====================================================

