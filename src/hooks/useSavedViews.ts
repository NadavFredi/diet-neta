import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface SavedView {
  id: string;
  resource_key: string;
  view_name: string;
  filter_config: Record<string, any>;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FilterConfig {
  searchQuery?: string;
  selectedDate?: string | null;
  selectedStatus?: string | null;
  selectedAge?: string | null;
  selectedHeight?: string | null;
  selectedWeight?: string | null;
  selectedFitnessGoal?: string | null;
  selectedActivityLevel?: string | null;
  selectedPreferredTime?: string | null;
  selectedSource?: string | null;
  selectedTags?: string[];
  selectedHasLeads?: string;
  columnVisibility?: Record<string, boolean>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Helper function to get or create user ID from email
const getUserIdFromEmail = async (email: string): Promise<string> => {
  // First try to get from auth.users (if there's an active session)
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user && !authError) return user.id;
  } catch (e) {
    // Auth session not available, continue to profile lookup
  }

  // Try to find user by email in profiles
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile && profile.id) {
    return profile.id;
  }

  // If user doesn't exist, try to sign them up with Supabase Auth
  // This will create both auth.users entry and profile entry via trigger
  try {
    // Generate a random password for the user (they won't need it for mock auth)
    const tempPassword = `temp_${Math.random().toString(36).slice(2)}${Date.now()}`;
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      // If signup fails, try to find the user again (might have been created)
      const { data: retryProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (retryProfile?.id) {
        return retryProfile.id;
      }
      
      console.error('Error creating user:', signUpError);
      throw new Error(`Unable to create user account: ${signUpError.message}`);
    }

    if (authData?.user?.id) {
      return authData.user.id;
    }

    // Wait a bit for the trigger to create the profile, then retry
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
    console.error('Error in user creation process:', signUpErr);
    // If signup fails but user might exist, try one more lookup
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (finalProfile?.id) {
      return finalProfile.id;
    }
  }

  throw new Error(`Unable to find or create user account for email: ${email}. Please try logging in again.`);
};

// Fetch saved views for a specific resource
export const useSavedViews = (resourceKey: string) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['savedViews', resourceKey, user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('resource_key', resourceKey)
        .eq('created_by', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedView[];
    },
    enabled: !!user?.email,
  });
};

// Fetch a single saved view by ID
export const useSavedView = (viewId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['savedView', viewId, user?.email],
    queryFn: async () => {
      if (!viewId) return null;
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('id', viewId)
        .eq('created_by', userId)
        .single();

      if (error) throw error;
      return data as SavedView | null;
    },
    enabled: !!viewId && !!user?.email,
  });
};

// Create a new saved view
export const useCreateSavedView = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      resourceKey,
      viewName,
      filterConfig,
      isDefault = false,
    }: {
      resourceKey: string;
      viewName: string;
      filterConfig: FilterConfig;
      isDefault?: boolean;
    }) => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      // If this is set as default, unset other defaults for this resource
      if (isDefault) {
        await supabase
          .from('saved_views')
          .update({ is_default: false })
          .eq('resource_key', resourceKey)
          .eq('created_by', userId)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          resource_key: resourceKey,
          view_name: viewName,
          filter_config: filterConfig,
          is_default: isDefault,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['savedViews', variables.resourceKey] });
    },
  });
};

// Update an existing saved view
export const useUpdateSavedView = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      viewId,
      viewName,
      filterConfig,
      isDefault,
    }: {
      viewId: string;
      viewName?: string;
      filterConfig?: FilterConfig;
      isDefault?: boolean;
    }) => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      // If setting as default, unset other defaults
      if (isDefault === true) {
        const { data: view } = await supabase
          .from('saved_views')
          .select('resource_key')
          .eq('id', viewId)
          .single();

        if (view) {
          await supabase
            .from('saved_views')
            .update({ is_default: false })
            .eq('resource_key', view.resource_key)
            .eq('created_by', userId)
            .eq('is_default', true)
            .neq('id', viewId);
        }
      }

      const updateData: Partial<SavedView> = {};
      if (viewName !== undefined) updateData.view_name = viewName;
      if (filterConfig !== undefined) updateData.filter_config = filterConfig;
      if (isDefault !== undefined) updateData.is_default = isDefault;

      const { data, error } = await supabase
        .from('saved_views')
        .update(updateData)
        .eq('id', viewId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['savedViews', data.resource_key] });
      queryClient.invalidateQueries({ queryKey: ['savedView', data.id] });
    },
  });
};

// Delete a saved view
export const useDeleteSavedView = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({ viewId, resourceKey }: { viewId: string; resourceKey: string }) => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { error } = await supabase
        .from('saved_views')
        .delete()
        .eq('id', viewId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['savedViews', variables.resourceKey] });
    },
  });
};

