-- Migration: Allow authenticated users to update leads
-- This ensures that any authenticated user can update leads they can read
-- Required for the inline editing functionality to work properly

-- Note: We keep the existing admin policy which uses is_admin() function
-- This new policy allows any authenticated user to update leads

-- Create new policy that allows authenticated users to update leads
-- Since we already have a SELECT policy allowing authenticated users to read leads,
-- we should allow them to update leads as well for the CRM functionality
-- The admin policy (created in 20240102000001) will still apply for admins
CREATE POLICY "Authenticated users can update leads"
    ON public.leads FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can update leads" ON public.leads IS 
    'Allows all authenticated users to update leads for CRM functionality';




