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

export interface NutritionTemplate {
  id: string;
  name: string;
  description: string | null;
  targets: NutritionTargets;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Helper function to get user ID from email
const getUserIdFromEmail = async (email: string): Promise<string> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user && !authError) return user.id;
  } catch (e) {
    // Auth session not available, continue to profile lookup
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile && profile.id) {
    return profile.id;
  }

  try {
    const tempPassword = `temp_${Math.random().toString(36).slice(2)}${Date.now()}`;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signUpError) {
      const { data: retryProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (retryProfile?.id) {
        return retryProfile.id;
      }
      throw new Error(`Unable to create user account: ${signUpError.message}`);
    }

    if (authData?.user?.id) {
      return authData.user.id;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (newProfile?.id) {
      return newProfile.id;
    }
  } catch (signUpErr: any) {
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (finalProfile?.id) {
      return finalProfile.id;
    }
  }

  throw new Error(`Unable to find or create user account for email: ${email}`);
};

// Fetch all templates (public + user's own)
export const useNutritionTemplates = (filters?: { search?: string; isPublic?: boolean }) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['nutritionTemplates', filters, user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);
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
        console.error('Error fetching nutrition templates:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as NutritionTemplate[];
    },
    enabled: !!user?.email,
  });
};

// Fetch a single template by ID
export const useNutritionTemplate = (templateId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['nutritionTemplate', templateId, user?.email],
    queryFn: async () => {
      if (!templateId) return null;
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('nutrition_templates')
        .select('*')
        .eq('id', templateId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as NutritionTemplate | null;
    },
    enabled: !!templateId && !!user?.email,
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
      is_public = false,
    }: {
      name: string;
      description?: string;
      targets: NutritionTargets;
      is_public?: boolean;
    }) => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('nutrition_templates')
        .insert({
          name,
          description: description || null,
          targets,
          is_public,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating nutrition template:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
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
      is_public,
    }: {
      templateId: string;
      name?: string;
      description?: string;
      targets?: NutritionTargets;
      is_public?: boolean;
    }) => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const updateData: Partial<NutritionTemplate> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (targets !== undefined) updateData.targets = targets;
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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







