/**
 * Subscription Types Hooks
 * 
 * React Query hooks for subscription type data fetching and mutations
 * Follows the same pattern as useBudgets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';
import { applySort } from '@/utils/supabaseSort';

// =====================================================
// Types
// =====================================================

import type { Currency, DurationUnit } from '@/store/slices/subscriptionTypesSlice';

export interface SubscriptionType {
  id: string;
  name: string;
  duration: number; // Duration value (interpreted based on duration_unit)
  duration_unit: DurationUnit; // Unit for duration: days, weeks, or months
  price: number; // Price amount
  currency: Currency; // Currency code: ILS, USD, or EUR
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// =====================================================
// Hooks
// =====================================================

// Fetch all subscription types
export const useSubscriptionTypes = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
  sortBy?: string | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery<{ data: SubscriptionType[]; totalCount: number }>({
    queryKey: ['subscriptionTypes', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        name: { column: 'name', type: 'text' },
      };

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const searchGroup = filters?.search ? createSearchGroup(filters.search, ['name']) : null;
      const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        name: 'name',
        created_at: 'created_at',
      };
      const sortMap: Record<string, string> = {
        name: 'name',
        duration: 'duration',
        price: 'price',
        created_at: 'created_at',
      };

      let query = supabase
        .from('subscription_types')
        .select('*');

      // Always apply pagination limit (max 100 records per request for performance)
      const maxPageSize = Math.min(pageSize, 100);
      const from = (page - 1) * maxPageSize;
      const to = from + maxPageSize - 1;
      query = query.range(from, to);

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

      // Get total count for pagination
      let totalCount = 0;
      let countQuery = supabase
        .from('subscription_types')
        .select('id', { count: 'exact', head: true });

      if (combinedGroup) {
        countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      totalCount = count || 0;

      const { data, error } = await query;

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת סוגי המנויים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      return { data: (data || []) as SubscriptionType[], totalCount };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single subscription type by ID
export const useSubscriptionType = (subscriptionTypeId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['subscriptionType', subscriptionTypeId, user?.id],
    queryFn: async () => {
      if (!subscriptionTypeId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscription_types')
        .select('*')
        .eq('id', subscriptionTypeId)
        .single();

      if (error) throw error;
      return data as SubscriptionType | null;
    },
    enabled: !!subscriptionTypeId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Create a new subscription type
export const useCreateSubscriptionType = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      duration,
      duration_unit = 'months',
      price,
      currency = 'ILS',
    }: {
      name: string;
      duration: number;
      duration_unit?: DurationUnit;
      price: number;
      currency?: Currency;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { data, error } = await supabase
        .from('subscription_types')
        .insert({
          name,
          duration,
          duration_unit,
          price,
          currency,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת סוגי המנויים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as SubscriptionType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionTypes'] });
    },
  });
};

// Update an existing subscription type
export const useUpdateSubscriptionType = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      subscriptionTypeId,
      ...updates
    }: {
      subscriptionTypeId: string;
      name?: string;
      duration?: number;
      duration_unit?: DurationUnit;
      price?: number;
      currency?: Currency;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const updateData: Partial<SubscriptionType> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== 'subscriptionTypeId' && updates[key as keyof typeof updates] !== undefined) {
          (updateData as any)[key] = updates[key as keyof typeof updates];
        }
      });

      const { data, error } = await supabase
        .from('subscription_types')
        .update(updateData)
        .eq('id', subscriptionTypeId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionType;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionTypes'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionType', data.id] });
    },
  });
};

// Delete a subscription type
export const useDeleteSubscriptionType = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (subscriptionTypeId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { error } = await supabase
        .from('subscription_types')
        .delete()
        .eq('id', subscriptionTypeId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionTypes'] });
    },
  });
};
