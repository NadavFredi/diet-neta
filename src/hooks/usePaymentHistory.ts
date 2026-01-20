/**
 * usePaymentHistory Hook
 * 
 * Fetches payment history for a customer/lead from the payments table.
 * Handles Hebrew status values and maps them to internal status types.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface PaymentRecord {
  id: string;
  date: string;
  product_name: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  receipt_url?: string | null;
  currency?: string;
  transaction_id?: string;
  customer_id?: string;
  lead_id?: string | null;
  collection_id?: string | null;
}

export const usePaymentHistory = (customerId: string, leadId?: string | null) => {
  return useQuery({
    queryKey: ['payment-history', customerId, leadId],
    queryFn: async (): Promise<PaymentRecord[]> => {
      if (!customerId) {
        return [];
      }

      try {
        // Query payments table with proper schema
        let query = supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        // If leadId is provided, filter by lead_id as well
        if (leadId) {
          query = query.eq('lead_id', leadId);
        }

        const { data, error } = await query;

        if (error) {
          // If table doesn't exist yet, return empty array (graceful degradation)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return [];
          }
          throw error;
        }

        // Transform data to match PaymentRecord interface
        // Map Hebrew status to English for internal use, but display Hebrew in UI
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
          status: statusMap[record.status] || 'pending',
          receipt_url: record.receipt_url || null,
          currency: record.currency || 'ILS',
          transaction_id: record.transaction_id || record.stripe_payment_id || record.id,
          customer_id: record.customer_id,
          lead_id: record.lead_id || null,
          collection_id: record.collection_id || null,
        })) as PaymentRecord[];
      } catch (error: any) {
        // Graceful degradation if payments table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        
        throw error;
      }
    },
    enabled: !!customerId,
    retry: false, // Don't retry if table doesn't exist
  });
};

