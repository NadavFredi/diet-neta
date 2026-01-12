-- =====================================================
-- Create Payments Table
-- Created: 2026-01-04
-- Description: Secure payments table for tracking customer/lead payments
--              NO sensitive data (card numbers, CVV, passwords) stored
--              Links to both customers and leads
-- =====================================================

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'ILS',
    status TEXT NOT NULL CHECK (status IN ('שולם', 'ממתין', 'הוחזר', 'נכשל')),
    stripe_payment_id TEXT,
    transaction_id TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON public.payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON public.payments(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
-- Authenticated users can read payments for customers/leads they have access to
DROP POLICY IF EXISTS "Authenticated users can read payments" ON public.payments;
CREATE POLICY "Authenticated users can read payments"
    ON public.payments FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Users can see payments for customers they have access to
            EXISTS (
                SELECT 1 FROM public.customers
                WHERE customers.id = payments.customer_id
            )
            OR
            -- Admins can see all payments
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        )
    );

-- Authenticated users can insert payments
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update payments
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
CREATE POLICY "Authenticated users can update payments"
    ON public.payments FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Admins have full access to payments
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.payments;
CREATE POLICY "Admins have full access to payments"
    ON public.payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add comment to table
COMMENT ON TABLE public.payments IS 'Customer/lead payment records. NO sensitive payment data (card numbers, CVV, passwords) stored.';
COMMENT ON COLUMN public.payments.stripe_payment_id IS 'Stripe payment intent ID - external reference only';
COMMENT ON COLUMN public.payments.transaction_id IS 'Transaction ID for tracking purposes';
COMMENT ON COLUMN public.payments.receipt_url IS 'URL to receipt document (stored in secure storage)';
COMMENT ON COLUMN public.payments.status IS 'Payment status in Hebrew: שולם (paid), ממתין (pending), הוחזר (refunded), נכשל (failed)';

