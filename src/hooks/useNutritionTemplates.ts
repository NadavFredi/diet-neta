import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ManualOverride {
  calories?: boolean;
  protein?: boolean;
  carbs?: boolean;
  fat?: boolean;
  fiber?: boolean;
}

export interface ManualFields {
  steps?: number | null;
  workouts?: string | null;
  supplements?: string | null;
}

export interface NutritionTemplate {
  id: string;
  name: string;
  description: string | null;
  targets: NutritionTargets;
  manual_override?: ManualOverride;
  manual_fields?: ManualFields;
  activity_entries?: any[]; // Activity entries for METs calculation
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Note: We now use user.id from Redux auth state instead of getUserIdFromEmail
// This eliminates redundant API calls to getUser() and profiles table

// Fetch all templates (public + user's own)
export const useNutritionTemplates = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['nutritionTemplates', filters, user?.id], // filters includes groupByLevel1 and groupByLevel2
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        is_public: { column: 'is_public', type: 'select', valueMap: (value) => (value === 'כן' ? true : value === 'לא' ? false : value) },
        calories_range: {
          custom: (filter, negate) => {
            const value = filter.values[0];
            if (!value) return [];
            const [minStr, maxStr] = value.split('-');
            const column = 'calories_value';
            if (value.endsWith('+')) {
              const min = Number(value.replace('+', ''));
              return [[{ column, operator: 'gte', value: min, negate }]];
            }
            const min = Number(minStr);
            const max = Number(maxStr);
            if (!negate) {
              return [[
                { column, operator: 'gte', value: min },
                { column, operator: 'lte', value: max },
              ]];
            }
            return [
              [{ column, operator: 'lt', value: min }],
              [{ column, operator: 'gt', value: max }],
            ];
          },
        },
        protein_range: {
          custom: (filter, negate) => {
            const value = filter.values[0];
            if (!value) return [];
            const [minStr, maxStr] = value.split('-');
            const column = 'protein_value';
            if (value.endsWith('+')) {
              const min = Number(value.replace('+', ''));
              return [[{ column, operator: 'gte', value: min, negate }]];
            }
            const min = Number(minStr);
            const max = Number(maxStr);
            if (!negate) {
              return [[
                { column, operator: 'gte', value: min },
                { column, operator: 'lte', value: max },
              ]];
            }
            return [
              [{ column, operator: 'lt', value: min }],
              [{ column, operator: 'gt', value: max }],
            ];
          },
        },
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

      // When grouping is active, fetch ALL matching records (no pagination)
      const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
      
      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        is_public: 'is_public',
        created_at: 'created_at',
      };

      let query = supabase
        .from('nutrition_templates_with_ranges')
        .select('*');

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
        let countQuery = supabase
          .from('nutrition_templates_with_ranges')
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
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      // When grouping is active, totalCount is the length of all fetched data
      if (isGroupingActive) {
        totalCount = (data || []).length;
      }

      return { data: (data || []) as NutritionTemplate[], totalCount };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single template by ID
export const useNutritionTemplate = (templateId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['nutritionTemplate', templateId, user?.id],
    queryFn: async () => {
      if (!templateId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { data, error } = await supabase
        .from('nutrition_templates')
        .select('*')
        .eq('id', templateId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as NutritionTemplate | null;
    },
    enabled: !!templateId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Create a new template
export const useCreateNutritionTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      description,
      targets,
      manual_override,
      manual_fields,
      activity_entries,
      is_public = false,
    }: {
      name: string;
      description?: string;
      targets: NutritionTargets;
      manual_override?: ManualOverride;
      manual_fields?: ManualFields;
      activity_entries?: any[]; // Activity entries for METs calculation
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      // Build insert data object - always include all fields with defaults
      const insertData: any = {
        name,
        description: description || null,
        targets,
        is_public,
        created_by: userId,
        manual_override: manual_override ?? {},
        manual_fields: manual_fields ?? {},
        activity_entries: activity_entries ?? [],
      };

      const { data, error } = await supabase
        .from('nutrition_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        if (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === '42703') {
          throw new Error(`עמודות חסרות בטבלה: ${error.message}. אנא ודא שהמיגרציה האחרונה הופעלה: 20260121000006_add_activity_entries_to_nutrition_templates`);
        }
        throw new Error(error.message || 'שגיאה ביצירת התבנית');
      }
      return data as NutritionTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionTemplates'] });
    },
  });
};

// Update an existing template
export const useUpdateNutritionTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      description,
      targets,
      manual_override,
      manual_fields,
      activity_entries,
      is_public,
    }: {
      templateId: string;
      name?: string;
      description?: string;
      targets?: NutritionTargets;
      manual_override?: ManualOverride;
      manual_fields?: ManualFields;
      activity_entries?: any[]; // Activity entries for METs calculation
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const updateData: any = {}; // Use 'any' to allow activity_entries which may not be in NutritionTemplate type
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (targets !== undefined) updateData.targets = targets;
      if (manual_override !== undefined) updateData.manual_override = manual_override;
      if (manual_fields !== undefined) updateData.manual_fields = manual_fields;
      if (activity_entries !== undefined) updateData.activity_entries = activity_entries;
      if (is_public !== undefined) updateData.is_public = is_public;

      const { data, error } = await supabase
        .from('nutrition_templates')
        .update(updateData)
        .eq('id', templateId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data as NutritionTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutritionTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionTemplate', data.id] });
    },
  });
};

// Delete a template
export const useDeleteNutritionTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { error } = await supabase
        .from('nutrition_templates')
        .delete()
        .eq('id', templateId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionTemplates'] });
    },
  });
};










