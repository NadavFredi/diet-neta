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

export const useAllPayments = (filters?: { search?: string; filterGroup?: FilterGroup | null }) => {
  return useQuery({
    queryKey: ['all-payments', filters],
    queryFn: async (): Promise<AllPaymentRecord[]> => {
      try {
        const fieldConfigs: FilterFieldConfigMap = {
          created_at: { column: 'created_at', type: 'date' },
          status: { column: 'status', type: 'multiselect' },
          amount: { column: 'amount', type: 'number' },
          currency: { column: 'currency', type: 'multiselect' },
          product_name: { column: 'product_name', type: 'text' },
          customer_name: { column: 'customer.full_name', type: 'text' },
          lead_id: { column: 'lead_id', type: 'text' },
        };

        const searchGroup = filters?.search
          ? createSearchGroup(filters.search, ['product_name', 'customer_name', 'lead_id'])
          : null;
        const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

        let query = supabase
          .from('payments')
          .select(
            `
            *,
            customer:customers(full_name),
            lead:leads(id)
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
          lead_name: record.lead_id ? `ליד ${record.lead_id.slice(0, 8)}` : null,
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
