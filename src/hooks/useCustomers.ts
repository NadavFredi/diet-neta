import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  user_id?: string | null; // Link to auth.users for trainee access
  created_at: string;
  updated_at: string;
  total_leads?: number; // Aggregated count
  avatar_url?: string | null;
  total_spent?: number;
  membership_tier?: 'New' | 'Standard' | 'Premium' | 'VIP';
}

export interface CustomerWithLeads extends Customer {
  daily_protocol?: {
    stepsGoal?: number;
    workoutGoal?: number;
    supplements?: string[];
  };
  workout_history?: Array<{
    name?: string;
    startDate?: string;
    validUntil?: string;
    duration?: string;
    description?: string;
    split?: {
      strength?: number;
      cardio?: number;
      intervals?: number;
    };
    strengthCount?: number;
    cardioCount?: number;
    intervalsCount?: number;
  }>;
  steps_history?: Array<{
    weekNumber?: string;
    week?: string;
    startDate?: string;
    dates?: string;
    endDate?: string;
    target?: number;
  }>;
  leads: Array<{
    id: string;
    created_at: string;
    status_main: string | null;
    status_sub: string | null;
    source: string | null;
    fitness_goal: string | null;
    birth_date: string | null;
    age: number | null;
    height: number | null;
    weight: number | null;
    activity_level: string | null;
    preferred_time: string | null;
    notes: string | null;
    city: string | null;
    gender: string | null;
    subscription_data?: any;
  }>;
}

// Fetch all customers with lead counts (with pagination)
export const useCustomers = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 100;

  return useQuery({
    queryKey: ['customers', filters, user?.email], // filters includes groupByLevel1 and groupByLevel2, so query will refetch when grouping changes
    queryFn: async () => {
      if (!user?.email) {
        return { data: [], totalCount: 0 };
      }

      try {
        const fieldConfigs: FilterFieldConfigMap = {
          created_at: { column: 'created_at', type: 'date' },
          full_name: { column: 'full_name', type: 'text' },
          phone: { column: 'phone', type: 'text' },
          email: { column: 'email', type: 'text' },
          total_leads: { column: 'total_leads', type: 'number' },
          total_spent: { column: 'total_spent', type: 'number' },
          membership_tier: { column: 'membership_tier', type: 'select' },
        };

        const searchGroup = filters?.search ? createSearchGroup(filters.search, ['full_name', 'phone', 'email']) : null;
        const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

        // Get total count first (for pagination)
        let countQuery = supabase
          .from('customers_with_lead_counts')
          .select('*', { count: 'exact', head: true });

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
          throw countError;
        }

        const totalCount = count ?? 0;

        // Map groupBy columns to database columns
        const groupByMap: Record<string, string> = {
          full_name: 'full_name',
          phone: 'phone',
          email: 'email',
          total_leads: 'total_leads',
          total_spent: 'total_spent',
          membership_tier: 'membership_tier',
          created_at: 'created_at',
        };

        // When grouping is active, we still limit to pageSize for performance
        const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
        
        let query = supabase
          .from('customers_with_lead_counts')
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
        
        // Apply default sorting if no grouping
        if (!filters?.groupByLevel1 && !filters?.groupByLevel2) {
          query = query.order('created_at', { ascending: false });
        }

        if (combinedGroup) {
          query = applyFilterGroupToQuery(query, combinedGroup, fieldConfigs);
        }

        const { data: customersData, error: customersError } = await query;

        if (customersError) {
          throw customersError;
        }

        return {
          data: (customersData || []) as Customer[],
          totalCount,
        };
      } catch (error: any) {
        return { data: [], totalCount: 0 };
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single customer with all their leads
export const useCustomer = (customerId: string | undefined) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['customer', customerId, user?.email],
    queryFn: async () => {
      if (!customerId || !user?.email) return null;

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          leads(*, age)
        `)
        .eq('id', customerId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        user_id: data.user_id || null, // Include user_id for trainee account link
        created_at: data.created_at,
        updated_at: data.updated_at,
        daily_protocol: data.daily_protocol || {},
        workout_history: data.workout_history || [],
        steps_history: data.steps_history || [],
        leads: (data.leads || []).map((lead: any) => ({
          id: lead.id,
          created_at: lead.created_at,
          status_main: lead.status_main,
          status_sub: lead.status_sub,
          source: lead.source,
          fitness_goal: lead.fitness_goal,
          birth_date: lead.birth_date,
          age: lead.age,
          height: lead.height,
          weight: lead.weight,
          activity_level: lead.activity_level,
          preferred_time: lead.preferred_time,
          notes: lead.notes,
          city: lead.city,
          gender: lead.gender,
          subscription_data: lead.subscription_data,
        })),
      } as CustomerWithLeads;
    },
    enabled: !!customerId && !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes - customer data changes more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
};
