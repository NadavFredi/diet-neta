/**
 * useAllPayments Hook
 * 
 * Fetches all payments from Stripe with customer and lead information.
 * Joins with customers and leads tables to get names.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

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

export const useAllPayments = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  return useQuery<{ data: AllPaymentRecord[]; totalCount: number }>({
    queryKey: ['all-payments', filters],
    queryFn: async () => {
      try {
        const fieldConfigs: FilterFieldConfigMap = {
          created_at: { column: 'created_at', type: 'date' },
          status: { column: 'status', type: 'multiselect' },
          amount: { column: 'amount', type: 'number' },
          currency: { column: 'currency', type: 'multiselect' },
          product_name: { column: 'product_name', type: 'text' },
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
          ? createSearchGroup(filters.search, ['product_name', 'customer_name', 'lead_id_text'])
          : null;
        const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

        // When grouping is active, we still limit to max 100 records per request for performance
        const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
        const page = filters?.page ?? 1;
        const pageSize = filters?.pageSize ?? 50;

        // Build count query first (same filters, no pagination)
        let countQuery = supabase
          .from('payments')
          .select('*', { count: 'exact', head: true });

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          throw countError;
        }
        const totalCount = count || 0;

        // Build data query with pagination
        let query = supabase
          .from('payments')
          .select(
            `
            *,
            customer:customers(full_name),
            lead:leads(id, customer:customers(full_name))
          `
          )
          .order('created_at', { ascending: false });

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
          // If table doesn't exist yet, return empty data with 0 count (graceful degradation)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return { data: [], totalCount: 0 };
          }
          throw error;
        }

        // Map Hebrew status to English for internal use
        const statusMap: Record<string, 'paid' | 'pending' | 'refunded' | 'failed'> = {
          'שולם': 'paid',
          'ממתין': 'pending',
          'הוחזר': 'refunded',
          'נכשל': 'failed',
        };

        const mappedData = (data || []).map((record: any) => ({
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
          // Use the lead's customer name if available, otherwise fall back to ID
          lead_name: record.lead?.customer?.full_name || (record.lead_id ? `ליד ${record.lead_id.slice(0, 8)}` : null),
        })) as AllPaymentRecord[];

        return { data: mappedData, totalCount };
      } catch (error: any) {
        // Graceful degradation if payments table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return { data: [], totalCount: 0 };
        }
        
        throw error;
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });
};
