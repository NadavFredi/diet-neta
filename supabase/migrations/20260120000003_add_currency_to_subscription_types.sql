-- =====================================================
-- Add currency field to subscription_types table
-- Created: 2026-01-20
-- Description: Adds currency column to subscription types
--              Supports ILS, USD, EUR currencies
--              Defaults to 'ILS' for backward compatibility
-- =====================================================

SET search_path TO public;

-- Add currency column to subscription_types table
ALTER TABLE public.subscription_types 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS' NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR'));

-- Create index for currency column
CREATE INDEX IF NOT EXISTS idx_subscription_types_currency ON public.subscription_types(currency);

-- Update comment for price column
COMMENT ON COLUMN public.subscription_types.price IS 'Price amount (value varies based on currency)';
COMMENT ON COLUMN public.subscription_types.currency IS 'Currency code: ILS (Israeli Shekel), USD (US Dollar), or EUR (Euro)';
