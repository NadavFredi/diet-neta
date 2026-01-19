-- =====================================================
-- Fix Fillout Submissions RLS Policies
-- Created: 2026-01-21
-- Description: Fixes RLS policies to avoid "permission denied for table users" error
--              Uses auth.jwt() instead of querying auth.users directly
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can view all fillout submissions" ON public.fillout_submissions;
DROP POLICY IF EXISTS "Managers can insert fillout submissions" ON public.fillout_submissions;
DROP POLICY IF EXISTS "Managers can update fillout submissions" ON public.fillout_submissions;
DROP POLICY IF EXISTS "Managers can delete fillout submissions" ON public.fillout_submissions;

-- Policy: Managers can view all submissions
-- Uses profiles table to check role (same pattern as other tables)
CREATE POLICY "Managers can view all fillout submissions"
  ON public.fillout_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user', 'manager')
    )
    OR auth.role() = 'service_role'
  );

-- Policy: Managers can insert submissions
CREATE POLICY "Managers can insert fillout submissions"
  ON public.fillout_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user', 'manager')
    )
    OR auth.role() = 'service_role'
  );

-- Policy: Managers can update submissions
CREATE POLICY "Managers can update fillout submissions"
  ON public.fillout_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user', 'manager')
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user', 'manager')
    )
    OR auth.role() = 'service_role'
  );

-- Policy: Managers can delete submissions
CREATE POLICY "Managers can delete fillout submissions"
  ON public.fillout_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'user', 'manager')
    )
    OR auth.role() = 'service_role'
  );

-- =====================================================
-- Migration Complete
-- =====================================================
