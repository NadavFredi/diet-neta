import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';
import { applySort } from '@/utils/supabaseSort';
import type { Supplement } from '@/store/slices/budgetSlice';

export interface SupplementTemplate {
  id: string;
  name: string;
  description: string | null;
  supplements: Supplement[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fetch all templates (public + user's own)
export const useSupplementTemplates = (filters?: { 
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

  return useQuery<{ data: SupplementTemplate[]; totalCount: number }>({
    queryKey: ['supplementTemplates', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        is_public: { column: 'is_public', type: 'select', valueMap: (value) => (value === 'כן' ? true : value === 'לא' ? false : value) },
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

      const groupByMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        is_public: 'is_public',
        created_at: 'created_at',
      };
      const sortMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        created_at: 'created_at',
      };

      let query = supabase
        .from('supplement_templates')
        .select('*');

      const maxPageSize = Math.min(pageSize, 100);
      const from = (page - 1) * maxPageSize;
      const to = from + maxPageSize - 1;
      query = query.range(from, to);

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

      let totalCount = 0;
      let countQuery = supabase
        .from('supplement_templates')
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
          throw new Error('טבלת תבניות התוספים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      return { data: (data || []) as SupplementTemplate[], totalCount };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Fetch a single template by ID
export const useSupplementTemplate = (templateId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['supplementTemplate', templateId, user?.id],
    queryFn: async () => {
      if (!templateId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { data, error } = await supabase
        .from('supplement_templates')
        .select('*')
        .eq('id', templateId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as SupplementTemplate | null;
    },
    enabled: !!templateId && !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Create a new template
export const useCreateSupplementTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      description,
      supplements,
      is_public = false,
    }: {
      name: string;
      description?: string;
      supplements: Supplement[];
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { data, error } = await supabase
        .from('supplement_templates')
        .insert({
          name,
          description: description || null,
          supplements,
          is_public,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת תבניות התוספים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as SupplementTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementTemplates'] });
    },
  });
};

// Update an existing template
export const useUpdateSupplementTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      description,
      supplements,
      is_public,
    }: {
      templateId: string;
      name?: string;
      description?: string;
      supplements?: Supplement[];
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const updateData: Partial<SupplementTemplate> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (supplements !== undefined) updateData.supplements = supplements;
      if (is_public !== undefined) updateData.is_public = is_public;

      const { data: existingTemplate, error: checkError } = await supabase
        .from('supplement_templates')
        .select('id, created_by')
        .eq('id', templateId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          throw new Error('תבנית התוספים לא נמצאה');
        }
        throw checkError;
      }

      const isOwner = existingTemplate?.created_by === userId;
      const isPublicTemplate = existingTemplate?.created_by === null;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isPublicTemplate && !isAdmin) {
        throw new Error('אין לך הרשאה לערוך תבנית זו');
      }

      let updateQuery = supabase
        .from('supplement_templates')
        .update(updateData)
        .eq('id', templateId);

      if (!isPublicTemplate && !isAdmin) {
        updateQuery = updateQuery.eq('created_by', userId);
      }

      const { data, error } = await updateQuery.select().single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('תבנית התוספים לא נמצאה או אין לך הרשאה לערוך אותה');
        }
        throw error;
      }
      
      if (!data) {
        throw new Error('תבנית התוספים לא נמצאה');
      }
      
      return data as SupplementTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplementTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['supplementTemplate', data.id] });
    },
  });
};

// Delete a template
export const useDeleteSupplementTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id;

      const { error } = await supabase
        .from('supplement_templates')
        .delete()
        .eq('id', templateId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplementTemplates'] });
    },
  });
};
