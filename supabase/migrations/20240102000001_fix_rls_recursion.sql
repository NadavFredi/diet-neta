-- =====================================================
-- Fix RLS Infinite Recursion Issue
-- Created: 2024-01-02
-- Description: Fixes the infinite recursion in profiles RLS policies
-- =====================================================

-- Drop the problematic admin policy on profiles that causes recursion
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Create a security definer function to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin policy using the function (avoids recursion)
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Also fix the leads policies to use the function
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete assigned leads" ON public.leads;

-- Recreate leads policies using the function
CREATE POLICY "Users can update assigned leads"
    ON public.leads FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        public.is_admin(auth.uid())
    )
    WITH CHECK (
        assigned_to = auth.uid() OR
        public.is_admin(auth.uid())
    );

CREATE POLICY "Admins have full access to leads"
    ON public.leads FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can delete assigned leads"
    ON public.leads FOR DELETE
    USING (
        assigned_to = auth.uid() OR
        public.is_admin(auth.uid())
    );

-- For local development, also allow anonymous access to insert leads
-- (Remove this in production or adjust based on your needs)
DROP POLICY IF EXISTS "Allow anonymous insert leads" ON public.leads;
CREATE POLICY "Allow anonymous insert leads"
    ON public.leads FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous read leads" ON public.leads;
CREATE POLICY "Allow anonymous read leads"
    ON public.leads FOR SELECT
    TO anon
    USING (true);



























