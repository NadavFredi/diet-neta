import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

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
export const useNutritionTemplates = (filters?: { search?: string; isPublic?: boolean }) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['nutritionTemplates', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call
      let query = supabase
        .from('nutrition_templates')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply public filter
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      const { data, error } = await query;

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as NutritionTemplate[];
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













