/**
 * useAllPayments Hook
 * 
 * Fetches all payments from Stripe with customer and lead information.
 * Joins with customers and leads tables to get names.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface AllPaymentRecord {
  id: string;
  date: string;
  product_name: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  receipt_url?: string | null;
  transaction_id?: string;
  customer_id: string;
  customer_name?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
}

export const useAllPayments = () => {
  return useQuery({
    queryKey: ['all-payments'],
    queryFn: async (): Promise<AllPaymentRecord[]> => {
      try {
        // Query payments table with JOINs to customers and leads
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            customer:customers!payments_customer_id_fkey(id, full_name),
            lead:leads!payments_lead_id_fkey(id)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist yet, return empty array (graceful degradation)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('[useAllPayments] Payments table not found. Returning empty array.');
            return [];
          }
          throw error;
        }

        // Get lead names separately (if lead_id exists)
        // We need to fetch leads to get the customer name from the lead's customer relationship
        const leadIds = (data || [])
          .map((p: any) => p.lead_id)
          .filter((id: string | null) => id !== null) as string[];

        let leadNamesMap: Record<string, string> = {};
        if (leadIds.length > 0) {
          // Fetch leads with customer data
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select(`
              id,
              customer:customers!leads_customer_id_fkey(full_name)
            `)
            .in('id', leadIds);

          if (!leadsError && leadsData) {
            // Map lead IDs to customer names (since leads don't have a name field directly)
            leadsData.forEach((lead: any) => {
              if (lead.customer?.full_name) {
                leadNamesMap[lead.id] = lead.customer.full_name;
              }
            });
          }
        }

        // Map Hebrew status to English for internal use
        const statusMap: Record<string, 'paid' | 'pending' | 'refunded' | 'failed'> = {
          'שולם': 'paid',
          'ממתין': 'pending',
          'הוחזר': 'refunded',
          'נכשל': 'failed',
        };

        return (data || []).map((record: any) => ({
          id: record.id,
          date: record.created_at,
          product_name: record.product_name || 'ללא שם מוצר',
          amount: Number(record.amount) || 0,
          currency: record.currency || 'ILS',
          status: statusMap[record.status] || 'pending',
          receipt_url: record.receipt_url || null,
          transaction_id: record.transaction_id || record.stripe_payment_id || record.id,
          customer_id: record.customer_id,
          customer_name: record.customer?.full_name || null,
          lead_id: record.lead_id || null,
          lead_name: record.lead_id ? leadNamesMap[record.lead_id] || null : null,
        })) as AllPaymentRecord[];
      } catch (error: any) {
        // Graceful degradation if payments table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[useAllPayments] Payments table not found. Returning empty array.');
          return [];
        }
        
        console.error('[useAllPayments] Error fetching payments:', error);
        throw error;
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });
};
