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
          paid_amount: { column: 'paid_amount', type: 'number' },
          remaining_amount: { column: 'remaining_amount', type: 'number' },
          description: { column: 'description', type: 'text' },
          customer_name: { column: 'customer_name', type: 'text' },
          lead_name: { column: 'lead_name', type: 'text' },
          lead_id_text: {
            custom: (filter, negate) => {
              const value = filter.values[0];
              if (!value) return [];
              return [[{ column: 'lead_id::text', operator: 'ilike', value: `%${value}%`, negate }]];
            },
          },
        };

        const searchGroup = filters?.search
          ? createSearchGroup(filters.search, ['description', 'customer_name', 'lead_name', 'lead_id_text'])
          : null;
        const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

        const groupByMap: Record<string, string> = {
          created_at: 'created_at',
          due_date: 'due_date',
          status: 'status',
          customer: 'customer_name',
          lead: 'lead_name',
          total_amount: 'total_amount',
          paid_amount: 'paid_amount',
          remaining_amount: 'remaining_amount',
          description: 'description',
        };
        const sortMap: Record<string, string> = {
          created_at: 'created_at',
          due_date: 'due_date',
          status: 'status',
          customer: 'customer_name',
          lead: 'lead_name',
          total_amount: 'total_amount',
          paid_amount: 'paid_amount',
          remaining_amount: 'remaining_amount',
          description: 'description',
        };

        const page = filters?.page ?? 1;
        const pageSize = filters?.pageSize ?? 50;

        // Build count query first (same filters, no pagination)
        let countQuery = supabase
          .from('collections_with_payments')
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
          .from('collections_with_payments')
          .select('*');

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

        const mappedData = (data || []).map((record: any) => ({
          id: record.id,
          lead_id: record.lead_id,
          customer_id: record.customer_id || null,
          lead_name: record.lead_name || null,
          customer_name: record.customer_name || null,
          total_amount: Number(record.total_amount) || 0,
          due_date: record.due_date || null,
          status: record.status || 'ממתין',
          description: record.description || null,
          notes: record.notes || null,
          created_at: record.created_at,
          updated_at: record.updated_at,
          paid_amount: Number(record.paid_amount) || 0,
          remaining_amount: Number(record.remaining_amount) || 0,
        })) as AllCollectionRecord[];

        return { data: mappedData, totalCount };
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
