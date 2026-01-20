/**
 * useAllCollections Hook
 * 
 * Fetches all collections (גבייה) from the database with lead and customer information.
 * Joins with leads and customers tables to get names.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

export interface AllCollectionRecord {
  id: string;
  lead_id: string;
  customer_id?: string | null;
  lead_name?: string | null;
  customer_name?: string | null;
  total_amount: number;
  due_date?: string | null;
  status: 'ממתין' | 'חלקי' | 'הושלם' | 'בוטל';
  description?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  paid_amount?: number; // Calculated from linked payments
  remaining_amount?: number; // Calculated: total_amount - paid_amount
}

export const useAllCollections = (filters?: { search?: string; filterGroup?: FilterGroup | null }) => {
  return useQuery({
    queryKey: ['all-collections', filters],
    queryFn: async (): Promise<AllCollectionRecord[]> => {
      try {
        const fieldConfigs: FilterFieldConfigMap = {
          created_at: { column: 'created_at', type: 'date' },
          due_date: { column: 'due_date', type: 'date' },
          status: { column: 'status', type: 'multiselect' },
          total_amount: { column: 'total_amount', type: 'number' },
          description: { column: 'description', type: 'text' },
          customer_name: { column: 'customer.full_name', type: 'text' },
          lead_id_text: {
            custom: (filter, negate) => {
              const value = filter.values[0];
              if (!value) return [];
              return [[{ column: 'lead_id::text', operator: 'ilike', value: `%${value}%`, negate }]];
            },
          },
        };

        const searchGroup = filters?.search
          ? createSearchGroup(filters.search, ['description', 'customer_name', 'lead_id_text'])
          : null;
        const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

        let query = supabase
          .from('collections')
          .select(
            `
            *,
            lead:leads(id, customer:customers(full_name)),
            customer:customers(full_name)
          `
          )
          .order('created_at', { ascending: false });

        if (combinedGroup) {
          query = applyFilterGroupToQuery(query, combinedGroup, fieldConfigs);
        }

        const { data, error } = await query;

        if (error) {
          // If table doesn't exist yet, return empty array (graceful degradation)
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
        // Graceful degradation if collections table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        
        throw error;
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });
};
