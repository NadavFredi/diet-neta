-- =====================================================
-- Normalize Database: Separate Customers from Leads
-- Created: 2024-01-02
-- Description: Create customers table and normalize leads table
--              Decouple Identity (Customer) from Opportunity (Lead)
--              Unique identifier: phone number
-- =====================================================

-- =====================================================
-- STEP A: Create customers table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;

CREATE POLICY "Authenticated users can read customers"
    ON public.customers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
    ON public.customers FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to customers"
    ON public.customers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- STEP B: Data Migration (Backfill Script)
-- =====================================================
-- Since we're resetting the DB, this step is not needed
-- But we'll include it for completeness in case of future migrations

-- This would migrate existing data if needed:
-- INSERT INTO public.customers (full_name, phone, email, created_at, updated_at)
-- SELECT DISTINCT ON (phone)
--     full_name,
--     phone,
--     email,
--     MIN(created_at) as created_at,
--     NOW() as updated_at
-- FROM public.leads
-- WHERE phone IS NOT NULL
-- GROUP BY phone, full_name, email
-- ON CONFLICT (phone) DO NOTHING;

-- =====================================================
-- STEP C: Update leads table
-- =====================================================

-- Add customer_id column
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- Create index for customer_id
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON public.leads(customer_id);

-- Link existing data (if any exists)
-- UPDATE public.leads l
-- SET customer_id = c.id
-- FROM public.customers c
-- WHERE l.phone = c.phone;

-- Make customer_id NOT NULL (since we're resetting, we can set it immediately)
ALTER TABLE public.leads ALTER COLUMN customer_id SET NOT NULL;

-- Remove old columns (since we're resetting, we can drop them immediately)
ALTER TABLE public.leads
    DROP COLUMN IF EXISTS full_name,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS email;

-- Drop old indexes that are no longer needed
DROP INDEX IF EXISTS public.idx_leads_phone;
DROP INDEX IF EXISTS public.idx_leads_email;

-- Add comment for documentation
COMMENT ON TABLE public.customers IS 'Customer identity table - unique by phone number';
COMMENT ON COLUMN public.customers.phone IS 'Unique identifier for customer identity';
COMMENT ON TABLE public.leads IS 'Lead/Opportunity table - linked to customers via customer_id';
COMMENT ON COLUMN public.leads.customer_id IS 'Foreign key to customers table - one customer can have many leads';

-- =====================================================
-- Migration Complete
-- =====================================================
