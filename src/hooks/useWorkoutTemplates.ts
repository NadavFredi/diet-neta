import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

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

  // SECURITY: Do not create users with temporary passwords
  // Users must be created through the secure invitation system
  throw new Error(
    `User profile not found for email: ${email}. ` +
    `Please contact an administrator to create your account via the secure invitation system.`
  );
};

// Fetch all templates (public + user's own)
export const useWorkoutTemplates = (filters?: { search?: string; goalTags?: string[]; isPublic?: boolean }) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['workoutTemplates', filters, user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);
      let query = supabase
        .from('workout_templates')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply goal tags filter
      if (filters?.goalTags && filters.goalTags.length > 0) {
        query = query.contains('goal_tags', filters.goalTags);
      }

      // Apply public filter
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching workout templates:', error);
        // If table doesn't exist, provide a helpful error message
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התבניות לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as WorkoutTemplate[];
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch a single template by ID
export const useWorkoutTemplate = (templateId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['workoutTemplate', templateId, user?.email],
    queryFn: async () => {
      if (!templateId) return null;
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as WorkoutTemplate | null;
    },
    enabled: !!templateId && !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
        console.error('Error creating workout template:', error);
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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

