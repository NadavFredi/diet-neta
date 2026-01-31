import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';
import { applySort } from '@/utils/supabaseSort';

export interface Exercise {
  id: string;
  name: string;
  repetitions: number | null;
  weight: number | null;
  image: string | null;
  video_link: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fetch all exercises
export const useExercises = (filters?: { 
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

  return useQuery<{ data: Exercise[]; totalCount: number }>({
    queryKey: ['exercises', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        name: { column: 'name', type: 'text' },
        repetitions: { column: 'repetitions', type: 'number' },
        weight: { column: 'weight', type: 'number' },
        category: { column: 'category', type: 'text' },
      };

      const searchGroup = filters?.search ? createSearchGroup(filters.search, ['name']) : null;
      const combinedGroup = mergeFilterGroups(filters?.filterGroup || null, searchGroup);

      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        name: 'name',
        created_at: 'created_at',
        category: 'category',
      };
      const sortMap: Record<string, string | string[]> = {
        name: 'name',
        repetitions: 'repetitions',
        weight: 'weight',
        media: ['image', 'video_link'],
        created_at: 'created_at',
        category: 'category',
      };

      let query = supabase
        .from('exercises')
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
        .from('exercises')
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
          throw new Error('טבלת התרגילים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      return { data: (data || []) as Exercise[], totalCount };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch a single exercise by ID
export const useExercise = (exerciseId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['exercise', exerciseId, user?.id],
    queryFn: async () => {
      if (!exerciseId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;
      return data as Exercise | null;
    },
    enabled: !!exerciseId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create a new exercise
export const useCreateExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      repetitions,
      weight,
      image,
      video_link,
      category,
    }: {
      name: string;
      repetitions?: number | null;
      weight?: number | null;
      image?: string | null;
      video_link?: string | null;
      category?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name,
          repetitions: repetitions ?? null,
          weight: weight ?? null,
          image: image ?? null,
          video_link: video_link ?? null,
          category: category ?? null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התרגילים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};

// Update an existing exercise
export const useUpdateExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      exerciseId,
      name,
      repetitions,
      weight,
      image,
      video_link,
      category,
    }: {
      exerciseId: string;
      name?: string;
      repetitions?: number | null;
      weight?: number | null;
      image?: string | null;
      video_link?: string | null;
      category?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: Partial<Exercise> = {};
      if (name !== undefined) updateData.name = name;
      if (repetitions !== undefined) updateData.repetitions = repetitions;
      if (weight !== undefined) updateData.weight = weight;
      if (image !== undefined) updateData.image = image;
      if (video_link !== undefined) updateData.video_link = video_link;
      if (category !== undefined) updateData.category = category;

      const { data, error } = await supabase
        .from('exercises')
        .update(updateData)
        .eq('id', exerciseId)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise', data.id] });
    },
  });
};

// Delete an exercise
export const useDeleteExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};

// Bulk update exercises (for category assignment)
export const useBulkUpdateExercises = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      exerciseIds,
      updates,
    }: {
      exerciseIds: string[];
      updates: { category?: string | null };
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: Partial<Exercise> = {};
      if (updates.category !== undefined) {
        updateData.category = updates.category;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid updates provided');
      }

      const { error } = await supabase
        .from('exercises')
        .update(updateData)
        .in('id', exerciseIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};
