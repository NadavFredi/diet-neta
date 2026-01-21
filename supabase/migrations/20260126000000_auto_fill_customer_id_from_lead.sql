-- =====================================================
-- Auto-fill customer_id from lead_id in payments
-- Created: 2026-01-26
-- Description: Automatically populate customer_id from lead_id when lead_id is provided
--              This ensures payments are properly linked to both lead and customer
-- =====================================================

-- Create function to auto-fill customer_id from lead_id
CREATE OR REPLACE FUNCTION public.auto_fill_payment_customer_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If customer_id is not provided but lead_id is, get customer_id from lead
    IF NEW.customer_id IS NULL AND NEW.lead_id IS NOT NULL THEN
        SELECT customer_id INTO NEW.customer_id
        FROM public.leads
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before insert
DROP TRIGGER IF EXISTS trigger_auto_fill_payment_customer_id ON public.payments;
CREATE TRIGGER trigger_auto_fill_payment_customer_id
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_payment_customer_id();

-- Also handle updates in case lead_id is changed
DROP TRIGGER IF EXISTS trigger_auto_fill_payment_customer_id_update ON public.payments;
CREATE TRIGGER trigger_auto_fill_payment_customer_id_update
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    WHEN (OLD.lead_id IS DISTINCT FROM NEW.lead_id OR NEW.customer_id IS NULL)
    EXECUTE FUNCTION public.auto_fill_payment_customer_id();

-- Add comment
COMMENT ON FUNCTION public.auto_fill_payment_customer_id() IS 'Automatically populates customer_id from lead_id when inserting or updating payments';
