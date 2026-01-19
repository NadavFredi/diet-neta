import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface SavedView {
  id: string;
  resource_key: string;
  view_name: string;
  filter_config: Record<string, any>;
  icon_name?: string | null;
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
  columnOrder?: string[]; // Order of columns
  columnWidths?: Record<string, number>; // Width of each column
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Advanced filters from TableFilter component
  advancedFilters?: Array<{
    id: string;
    fieldId: string;
    fieldLabel: string;
    operator: string;
    values: string[];
    type: string;
  }>;
}

// Helper function to get or create user ID from email
export const getUserIdFromEmail = async (email: string): Promise<string> => {
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

  // SECURITY: Do not create users with temporary passwords
  // Users must be created through the secure invitation system
  // If profile doesn't exist, the user needs to be properly invited
  throw new Error(
    `User profile not found for email: ${email}. ` +
    `Please contact an administrator to create your account via the secure invitation system.`
  );
};

// Fetch saved views for a specific resource
export const useSavedViews = (resourceKey: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['savedViews', resourceKey, user?.id],
    queryFn: async () => {
      if (!user?.id || !resourceKey) return [];

      try {
        const userId = user.id; // Use user.id from Redux instead of API call

        const { data, error } = await supabase
          .from('saved_views')
          .select('id, resource_key, view_name, filter_config, icon_name, is_default, created_by, created_at, updated_at')
          .eq('resource_key', resourceKey)
          .eq('created_by', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Error fetching saved views:', error);
          return [];
        }
        return (data || []) as SavedView[];
      } catch (error) {
        console.warn('Error in useSavedViews:', error);
        return [];
      }
    },
    enabled: !!user?.email && !!resourceKey,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single saved view by ID
export const useSavedView = (viewId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['savedView', viewId, user?.id],
    queryFn: async () => {
      if (!viewId) return null;
      if (!user?.id) return null;

      try {
        const userId = user.id; // Use user.id from Redux instead of API call

        const { data, error } = await supabase
          .from('saved_views')
          .select('id, resource_key, view_name, filter_config, icon_name, is_default, created_by, created_at, updated_at')
          .eq('id', viewId)
          .eq('created_by', userId)
          .single();

        if (error) {
          console.warn('Error fetching saved view:', error);
          return null;
        }
        return data as SavedView | null;
      } catch (error) {
        console.warn('Error in useSavedView:', error);
        return null;
      }
    },
    enabled: !!viewId && !!user?.id,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
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
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

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
        .select('id, resource_key, view_name, filter_config, icon_name, is_default, created_by, created_at, updated_at')
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
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

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
        .select('id, resource_key, view_name, filter_config, icon_name, is_default, created_by, created_at, updated_at')
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
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

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

