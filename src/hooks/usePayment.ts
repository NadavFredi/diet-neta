/**
 * usePayment Hook
 * 
 * Fetches a single payment by ID with customer and lead information.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Payment {
  id: string;
  customer_id: string;
  lead_id?: string | null;
  product_name: string;
  amount: number;
  currency: string;
  status: string; // Hebrew: שולם, ממתין, הוחזר, נכשל
  stripe_payment_id?: string | null;
  transaction_id?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined data
  customer?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  };
  lead?: {
    id: string;
    customer_id: string;
  };
}

export const usePayment = (paymentId: string | null) => {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async (): Promise<Payment | null> => {
      if (!paymentId) return null;

      try {
        const { data, error } = await supabase
          .from('payments')
          .select(
            `
            *,
            customer:customers(id, full_name, phone, email),
            lead:leads(id, customer_id, customer:customers(full_name))
          `
          )
          .eq('id', paymentId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Not found
          }
          throw error;
        }

        return data as Payment;
      } catch (error: any) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return null; // Table doesn't exist
        }
        throw error;
      }
    },
    enabled: !!paymentId,
    retry: false,
  });
};
