import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FilterGroup, ActiveFilter } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap, type FilterDnf } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

export interface Meeting {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  fillout_submission_id: string | null;
  meeting_data: Record<string, any>; // JSONB data from Fillout
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  lead?: {
    id: string;
    customer_id: string;
    customer?: {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
    } | null;
  } | null;
  customer?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
}

// Fetch all meetings with joined lead and customer data
const buildDateDnf = (filter: ActiveFilter, column: string, negate: boolean): FilterDnf => {
  const value = filter.values[0];

  if (filter.operator === 'equals') {
    return [[{ column, operator: 'eq', value, negate }]];
  }
  if (filter.operator === 'before') {
    return [[{ column, operator: 'lt', value, negate }]];
  }
  if (filter.operator === 'after') {
    return [[{ column, operator: 'gt', value, negate }]];
  }
  if (filter.operator === 'between') {
    const start = filter.values[0];
    const end = filter.values[1];
    if (!start || !end) return [];
    if (!negate) {
      return [[
        { column, operator: 'gte', value: start },
        { column, operator: 'lte', value: end },
      ]];
    }
    return [
      [{ column, operator: 'lt', value: start }],
      [{ column, operator: 'gt', value: end }],
    ];
  }
  return [];
};

export const useMeetings = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery<{ data: Meeting[]; totalCount: number }>({
    queryKey: ['meetings', filters],
    queryFn: async () => {
      const meetingDateKeys = [
        'meeting_data->>date',
        'meeting_data->>meeting_date',
        "meeting_data->>'תאריך'",
        "meeting_data->>'תאריך פגישה'",
      ];
      const meetingStatusKeys = ['meeting_data->>status', "meeting_data->>'סטטוס'"];

      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        meeting_date: {
          custom: (filter, negate) => {
            return meetingDateKeys.flatMap((column) => buildDateDnf(filter, column, negate));
          },
        },
        status: {
          custom: (filter, negate) => {
            const value = filter.values[0];
            if (!value) return [];
            return meetingStatusKeys.map((column) => [
              { column, operator: 'eq', value, negate: filter.operator === 'isNot' ? !negate : negate },
            ]);
          },
        },
        customer_name: { column: 'customer.full_name', type: 'text' },
        customer_phone: { column: 'customer.phone', type: 'text' },
        meeting_status_search: {
          custom: (filter) => {
            const value = filter.values[0];
            if (!value) return [];
            return meetingStatusKeys.map((column) => [
              { column, operator: 'ilike', value: `%${value}%` },
            ]);
          },
        },
        meeting_date_search: {
          custom: (filter) => {
            const value = filter.values[0];
            if (!value) return [];
            return meetingDateKeys.map((column) => [
              { column, operator: 'ilike', value: `%${value}%` },
            ]);
          },
        },
      };

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const searchGroup = filters?.search
        ? createSearchGroup(filters.search, [
            'customer_name',
            'customer_phone',
            'meeting_status_search',
            'meeting_date_search',
          ])
        : null;
      const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

      // When grouping is active, fetch ALL matching records (no pagination)
      const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
      
      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        created_at: 'created_at',
        status: 'meeting_data->>status',
        meeting_date: 'meeting_data->>date',
        customer_name: 'customer.full_name',
      };

      let query = supabase
        .from('meetings')
        .select(
          `
          *,
          lead:leads(id, customer_id, customer:customers(id, full_name, phone, email)),
          customer:customers(id, full_name, phone, email)
        `
        );

      // Only apply pagination if grouping is NOT active
      if (!isGroupingActive) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

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

      // Get total count for pagination (only when not grouping)
      let totalCount = 0;
      if (!isGroupingActive) {
        // Build count query with same JOINs and filters (needed for filters on joined tables)
        let countQuery = supabase
          .from('meetings')
          .select(
            `
            id,
            customer:customers(id)
            `,
            { count: 'exact', head: true }
          );

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        totalCount = count || 0;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map the data to ensure customer is populated from lead if not directly set
      const mappedData = (data || []).map((meeting: any) => {
        // If meeting doesn't have direct customer but has lead with customer, use lead's customer
        if (!meeting.customer && meeting.lead?.customer) {
          return {
            ...meeting,
            customer: meeting.lead.customer,
          };
        }
        return meeting;
      });
      
      // When grouping is active, totalCount is the length of all fetched data
      if (isGroupingActive) {
        totalCount = mappedData.length;
      }
      
      return { data: mappedData as Meeting[], totalCount };
    },
    // Refetch every 10 seconds to catch new meetings
    refetchInterval: 10000,
  });

  // Set up real-time subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'meetings',
        },
        (payload) => {
          // Invalidate and refetch meetings when any change occurs
          queryClient.invalidateQueries({ queryKey: ['meetings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch a single meeting by ID
export const useMeeting = (meetingId: string | null) => {
  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          lead:leads(id, customer_id, customer:customers(id, full_name, phone, email)),
          customer:customers(id, full_name, phone, email)
        `)
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      
      // If meeting doesn't have direct customer but has lead with customer, use lead's customer
      if (!data.customer && (data as any).lead?.customer) {
        return {
          ...data,
          customer: (data as any).lead.customer,
        } as Meeting;
      }
      
      return data as Meeting;
    },
    enabled: !!meetingId,
  });
};

// Delete a meeting
export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
};





