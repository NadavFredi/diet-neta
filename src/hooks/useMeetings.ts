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

export const useMeetings = (filters?: { search?: string; filterGroup?: FilterGroup | null }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
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

      const searchGroup = filters?.search
        ? createSearchGroup(filters.search, [
            'customer_name',
            'customer_phone',
            'meeting_status_search',
            'meeting_date_search',
          ])
        : null;
      const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

      let query = supabase
        .from('meetings')
        .select(
          `
          *,
          lead:leads(id, customer_id),
          customer:customers(id, full_name, phone, email)
        `
        )
        .order('created_at', { ascending: false });

      if (combinedGroup) {
        query = applyFilterGroupToQuery(query, combinedGroup, fieldConfigs);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Meeting[];
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
          lead:leads(id, customer_id),
          customer:customers(id, full_name, phone, email)
        `)
        .eq('id', meetingId)
        .single();

      if (error) throw error;
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





