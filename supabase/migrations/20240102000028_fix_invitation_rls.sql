-- Migration: Fix RLS Policies for user_invitations
-- Created: 2024-01-02
-- Description: Fixes RLS policies that were trying to access auth.users directly

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own invitation" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;

-- Create a helper function to check if user is admin/manager
-- This avoids repeated subqueries in policies
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'user')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy: Admins/managers can view all invitations
CREATE POLICY "Admins can view all invitations"
    ON public.user_invitations FOR SELECT
    USING (public.is_admin_or_manager());

-- Policy: Users can view their own invitation (by user_id or email from profile)
CREATE POLICY "Users can view own invitation"
    ON public.user_invitations FOR SELECT
    USING (
        user_id = auth.uid()
        OR (
            email = (SELECT email FROM profiles WHERE id = auth.uid())
        )
    );

-- Policy: Admins/managers can create invitations
CREATE POLICY "Admins can create invitations"
    ON public.user_invitations FOR INSERT
    WITH CHECK (public.is_admin_or_manager());

-- Policy: Admins/managers can update invitations (for resend, revoke)
CREATE POLICY "Admins can update invitations"
    ON public.user_invitations FOR UPDATE
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());
