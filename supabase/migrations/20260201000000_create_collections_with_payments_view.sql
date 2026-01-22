-- Create a view for collections with aggregated payment totals
-- This enables server-side sorting/pagination on paid/remaining amounts.

CREATE OR REPLACE VIEW public.collections_with_payments AS
SELECT
  c.*,
  lead_customer.full_name AS lead_name,
  customer.full_name AS customer_name,
  COALESCE(SUM(CASE WHEN p.status = 'שולם' THEN p.amount ELSE 0 END), 0) AS paid_amount,
  GREATEST(
    COALESCE(c.total_amount, 0) - COALESCE(SUM(CASE WHEN p.status = 'שולם' THEN p.amount ELSE 0 END), 0),
    0
  ) AS remaining_amount
FROM public.collections c
LEFT JOIN public.leads l ON l.id = c.lead_id
LEFT JOIN public.customers lead_customer ON lead_customer.id = l.customer_id
LEFT JOIN public.customers customer ON customer.id = c.customer_id
LEFT JOIN public.payments p ON p.collection_id = c.id
GROUP BY c.id, lead_customer.full_name, customer.full_name;

ALTER VIEW public.collections_with_payments SET (security_invoker = true);
