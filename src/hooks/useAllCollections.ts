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
import { applySort } from '@/utils/supabaseSort';

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

export const useAllCollections = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
  sortBy?: string | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}) => {
  return useQuery<{ data: AllCollectionRecord[]; totalCount: number }>({
    queryKey: ['all-collections', filters],
    queryFn: async () => {
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

        const groupByMap: Record<string, string> = {
          created_at: 'created_at',
          due_date: 'due_date',
          status: 'status',
          customer: 'customer_id',
          lead: 'lead_id',
          total_amount: 'total_amount',
          paid_amount: 'total_amount',
          remaining_amount: 'total_amount',
          description: 'description',
        };
        const sortMap: Record<string, string> = {
          created_at: 'created_at',
          due_date: 'due_date',
          status: 'status',
          customer: 'customer.full_name',
          lead: 'lead_id',
          total_amount: 'total_amount',
          paid_amount: 'total_amount',
          remaining_amount: 'total_amount',
          description: 'description',
        };

        const page = filters?.page ?? 1;
        const pageSize = filters?.pageSize ?? 50;

        // Build count query first (same filters, no pagination)
        let countQuery = supabase
          .from('collections')
          .select('id', { count: 'exact', head: true });

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          throw countError;
        }
        const totalCount = count || 0;

        let query = supabase
          .from('collections')
          .select(
            `
            *,
            lead:leads(id, customer:customers(full_name)),
            customer:customers(full_name)
          `
          );

        // Apply grouping as ORDER BY (for proper sorting before client-side grouping)
        if (filters?.groupByLevel1 && groupByMap[filters.groupByLevel1]) {
          query = query.order(groupByMap[filters.groupByLevel1], { ascending: true });
        }
        if (filters?.groupByLevel2 && groupByMap[filters.groupByLevel2]) {
          query = query.order(groupByMap[filters.groupByLevel2], { ascending: true });
        }

        if (filters?.sortBy && filters?.sortOrder) {
          query = applySort(query, filters.sortBy, filters.sortOrder, sortMap);
        } else if (!filters?.groupByLevel1 && !filters?.groupByLevel2) {
          query = query.order('created_at', { ascending: false });
        }

        if (combinedGroup) {
          query = applyFilterGroupToQuery(query, combinedGroup, fieldConfigs);
        }

        // Always apply pagination limit (max 100 records per request for performance)
        const maxPageSize = Math.min(pageSize, 100);
        const from = (page - 1) * maxPageSize;
        const to = from + maxPageSize - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) {
          // If table doesn't exist yet, return empty array (graceful degradation)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return { data: [], totalCount: 0 };
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

        return { data: collectionsWithPayments, totalCount };
      } catch (error: any) {
        // Graceful degradation if collections table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return { data: [], totalCount: 0 };
        }
        
        throw error;
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });
};
