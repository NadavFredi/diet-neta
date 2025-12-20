-- =====================================================
-- Add Profile Fields to Customers Table
-- Created: 2024-01-02
-- Description: Add fields for Rich Profile Hero view
--              - total_spent: Calculated from leads subscription_data
--              - membership_tier: Derived from total_spent
--              - avatar_url: URL for customer avatar image
-- =====================================================

-- Add new columns to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'New' CHECK (membership_tier IN ('New', 'Standard', 'Premium', 'VIP'));

-- Create index for membership_tier for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_membership_tier ON public.customers(membership_tier);

-- Add comments for documentation
COMMENT ON COLUMN public.customers.avatar_url IS 'URL to customer avatar/profile image';
COMMENT ON COLUMN public.customers.total_spent IS 'Total amount spent across all leads (calculated field)';
COMMENT ON COLUMN public.customers.membership_tier IS 'Customer membership tier based on total_spent: New (<500), Standard (500-1999), Premium (2000-4999), VIP (5000+)';

-- =====================================================
-- Migration Complete
-- =====================================================



