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
        // Query payments table
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist yet, return empty array (graceful degradation)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return [];
          }
          throw error;
        }

        // Get unique customer IDs and lead IDs
        const customerIds = [...new Set((data || []).map((p: any) => p.customer_id).filter(Boolean))];
        const leadIds = [...new Set((data || []).map((p: any) => p.lead_id).filter(Boolean))];

        // Fetch customer names
        let customerNamesMap: Record<string, string> = {};
        if (customerIds.length > 0) {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, full_name')
            .in('id', customerIds);

          if (!customersError && customersData) {
            customersData.forEach((customer: any) => {
              if (customer.full_name) {
                customerNamesMap[customer.id] = customer.full_name;
              }
            });
          }
        }

        // Fetch lead names (leads don't have a direct name, but we can show lead ID or customer name from lead)
        // For now, we'll just show lead ID if available
        let leadNamesMap: Record<string, string> = {};
        if (leadIds.length > 0) {
          // Leads don't have a direct name field, so we'll just mark them as having a lead
          leadIds.forEach((leadId) => {
            leadNamesMap[leadId] = `ליד ${leadId.slice(0, 8)}`;
          });
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
          customer_name: customerNamesMap[record.customer_id] || null,
          lead_id: record.lead_id || null,
          lead_name: record.lead_id ? leadNamesMap[record.lead_id] || null : null,
        })) as AllPaymentRecord[];
      } catch (error: any) {
        // Graceful degradation if payments table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        
        throw error;
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });
};
