/**
 * useCollectionsByLead Hook
 * 
 * Fetches all collections for a specific lead.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { AllCollectionRecord } from './useAllCollections';

export const useCollectionsByLead = (leadId: string | null) => {
  return useQuery({
    queryKey: ['collections-by-lead', leadId],
    queryFn: async (): Promise<AllCollectionRecord[]> => {
      if (!leadId) return [];

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
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return [];
          }
          throw error;
        }

        // Fetch payment amounts for each collection
        const collectionsWithPayments = await Promise.all(
          (data || []).map(async (record: any) => {
            // Get all payments linked to this collection
            const { data: payments } = await supabase
              .from('payments')
              .select('amount, status')
              .eq('collection_id', record.id);

            // Calculate paid amount (only from paid payments)
            const paidAmount = (payments || [])
              .filter((p: any) => p.status === 'שולם')
              .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

            const remainingAmount = Math.max(0, Number(record.total_amount) - paidAmount);

            return {
              id: record.id,
              lead_id: record.lead_id,
              customer_id: record.customer_id || record.lead?.customer?.id || null,
              lead_name: record.lead?.customer?.full_name || null,
              customer_name: record.customer?.full_name || record.lead?.customer?.full_name || null,
              total_amount: Number(record.total_amount) || 0,
              due_date: record.due_date || null,
              status: record.status || 'ממתין',
              description: record.description || null,
              notes: record.notes || null,
              created_at: record.created_at,
              updated_at: record.updated_at,
              paid_amount: paidAmount,
              remaining_amount: remainingAmount,
            } as AllCollectionRecord;
          })
        );

        return collectionsWithPayments;
      } catch (error: any) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!leadId,
    retry: false,
  });
};
