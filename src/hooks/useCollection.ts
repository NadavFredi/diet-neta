/**
 * useCollection Hook
 * 
 * Fetches a single collection by ID with all related information.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { AllCollectionRecord } from './useAllCollections';

export const useCollection = (collectionId: string | null) => {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async (): Promise<AllCollectionRecord | null> => {
      if (!collectionId) return null;

      try {
        const { data, error } = await supabase
          .from('collections')
          .select(
            `
            *,
            lead:leads(id, customer:customers(full_name)),
            customer:customers(full_name)
          `
          )
          .eq('id', collectionId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Not found
          }
          throw error;
        }

        if (!data) return null;

        // Get all payments linked to this collection
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('collection_id', collectionId);

        // Calculate paid amount (only from paid payments)
        const paidAmount = (payments || [])
          .filter((p: any) => p.status === 'שולם')
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        const remainingAmount = Math.max(0, Number(data.total_amount) - paidAmount);

        return {
          id: data.id,
          lead_id: data.lead_id,
          customer_id: data.customer_id || data.lead?.customer?.id || null,
          lead_name: data.lead?.customer?.full_name || null,
          customer_name: data.customer?.full_name || data.lead?.customer?.full_name || null,
          total_amount: Number(data.total_amount) || 0,
          due_date: data.due_date || null,
          status: data.status || 'ממתין',
          description: data.description || null,
          notes: data.notes || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
        } as AllCollectionRecord;
      } catch (error: any) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!collectionId,
    retry: false,
  });
};
