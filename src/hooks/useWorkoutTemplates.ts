import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  goal_tags: string[];
  routine_data: any; // JSONB matching workout_plans.custom_attributes.data.weeklyWorkout schema
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Note: We now use user.id from Redux auth state instead of getUserIdFromEmail
// This eliminates redundant API calls to getUser() and profiles table

// Fetch all templates (public + user's own)
export const useWorkoutTemplates = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery<{ data: WorkoutTemplate[]; totalCount: number }>({
    queryKey: ['workoutTemplates', filters, user?.id], // filters includes groupByLevel1 and groupByLevel2
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        goal_tags: { column: 'goal_tags', type: 'multiselect', isArray: true },
        is_public: { column: 'is_public', type: 'select', valueMap: (value) => (value === 'כן' ? true : value === 'לא' ? false : value) },
        has_leads: { column: 'has_leads', type: 'select', valueMap: (value) => (value === 'כן' ? true : value === 'לא' ? false : value) },
        name: { column: 'name', type: 'text' },
        description: { column: 'description', type: 'text' },
      };

      const accessGroup: FilterGroup = {
        id: `access-${userId}`,
        operator: 'or',
        children: [
          {
            id: `public-${userId}`,
            fieldId: 'is_public',
            fieldLabel: 'is_public',
            operator: 'is',
            values: ['כן'],
            type: 'select',
          },
          {
            id: `owner-${userId}`,
            fieldId: 'created_by',
            fieldLabel: 'created_by',
            operator: 'is',
            values: [userId],
            type: 'select',
          },
        ],
      };

      const searchGroup = filters?.search ? createSearchGroup(filters.search, ['name', 'description']) : null;
      const combinedGroup = mergeFilterGroups(accessGroup, mergeFilterGroups(filters?.filterGroup || null, searchGroup));

      // When grouping is active, we still limit to pageSize for performance
      const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
      
      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        is_public: 'is_public',
        has_leads: 'has_leads',
        created_at: 'created_at',
      };

      let query = supabase
        .from('workout_templates_with_leads')
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

      // Get total count for pagination (only when not grouping)
      let totalCount = 0;
      if (!isGroupingActive) {
        let countQuery = supabase
          .from('workout_templates_with_leads')
          .select('id', { count: 'exact', head: true });

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        totalCount = count || 0;
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, provide a helpful error message
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      // When grouping is active, totalCount is the length of all fetched data
      if (isGroupingActive) {
        totalCount = (data || []).length;
      }

      return { data: (data || []) as WorkoutTemplate[], totalCount };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single template by ID
export const useWorkoutTemplate = (templateId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['workoutTemplate', templateId, user?.id],
    queryFn: async () => {
      if (!templateId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as WorkoutTemplate | null;
    },
    enabled: !!templateId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Create a new template
export const useCreateWorkoutTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      description,
      goal_tags,
      routine_data,
      is_public = false,
    }: {
      name: string;
      description?: string;
      goal_tags?: string[];
      routine_data: any;
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          name,
          description: description || null,
          goal_tags: goal_tags || [],
          routine_data,
          is_public,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as WorkoutTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates'] });
    },
  });
};

// Update an existing template
export const useUpdateWorkoutTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      description,
      goal_tags,
      routine_data,
      is_public,
    }: {
      templateId: string;
      name?: string;
      description?: string;
      goal_tags?: string[];
      routine_data?: any;
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const updateData: Partial<WorkoutTemplate> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (goal_tags !== undefined) updateData.goal_tags = goal_tags;
      if (routine_data !== undefined) updateData.routine_data = routine_data;
      if (is_public !== undefined) updateData.is_public = is_public;

      const { data, error } = await supabase
        .from('workout_templates')
        .update(updateData)
        .eq('id', templateId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['workoutTemplate', data.id] });
    },
  });
};

// Delete a template
export const useDeleteWorkoutTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', templateId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates'] });
    },
  });
};
