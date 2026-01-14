-- Add customer_id to profiles for trainee/customer linkage
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON public.profiles(customer_id);

COMMENT ON COLUMN public.profiles.customer_id IS 'Linked customer for trainee users';

-- Backfill existing links from customers.user_id
UPDATE public.profiles p
SET customer_id = c.id
FROM public.customers c
WHERE c.user_id = p.id
  AND p.customer_id IS NULL;
