import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useSavedViews, useCreateSavedView } from './useSavedViews';
import type { FilterConfig } from './useSavedViews';

// Helper function to get user ID from email
const getUserIdFromEmail = async (email: string): Promise<string> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user && !authError) return user.id;
  } catch (e) {
    // Auth session not available, continue to profile lookup
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile?.id) {
    return profile.id;
  }

  throw new Error(`Unable to find user account for email: ${email}`);
};

// Get default filter config for each resource type
const getDefaultFilterConfig = (resourceKey: string): FilterConfig => {
  switch (resourceKey) {
    case 'leads':
      return {
        searchQuery: '',
        selectedDate: null,
        selectedStatus: null,
        selectedAge: null,
        selectedHeight: null,
        selectedWeight: null,
        selectedFitnessGoal: null,
        selectedActivityLevel: null,
        selectedPreferredTime: null,
        selectedSource: null,
        columnVisibility: {
          id: true,
          name: true,
          createdDate: true,
          status: true,
          phone: true,
          email: true,
          source: true,
          age: true,
          birthDate: true,
          height: true,
          weight: true,
          fitnessGoal: true,
          activityLevel: true,
          preferredTime: true,
          notes: true,
        },
      };
    case 'customers':
      return {
        searchQuery: '',
        selectedDate: null,
      };
    case 'templates':
      return {
        searchQuery: '',
        selectedDate: null,
        selectedTags: [],
        selectedHasLeads: 'all',
        columnVisibility: {
          name: true,
          description: true,
          tags: true,
          connectedLeads: true,
          createdDate: true,
          actions: true,
        },
      };
    case 'nutrition_templates':
      return {
        searchQuery: '',
        selectedDate: null,
        columnVisibility: {
          name: true,
          description: true,
          tags: false, // Not applicable
          connectedLeads: false, // Not applicable
          createdDate: true,
          actions: true,
        },
      };
    case 'budgets':
      return {
        searchQuery: '',
        selectedDate: null,
        columnVisibility: {
          name: true,
          description: true,
          steps_goal: true,
          createdDate: true,
          actions: true,
        },
      };
    default:
      return {
        searchQuery: '',
        selectedDate: null,
      };
  }
};

export const useDefaultView = (resourceKey: string) => {
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Find or create default view
  const { data: defaultView, isLoading } = useQuery({
    queryKey: ['defaultView', resourceKey, user?.email],
    queryFn: async () => {
      if (!user?.email || !resourceKey) return null;

      try {
        const userId = await getUserIdFromEmail(user.email);

        // Check if default view exists
        const { data: existingDefault, error: fetchError } = await supabase
          .from('saved_views')
          .select('*')
          .eq('resource_key', resourceKey)
          .eq('created_by', userId)
          .eq('is_default', true)
          .maybeSingle();

        if (fetchError) {
          console.warn('Error fetching default view:', fetchError);
          return null;
        }

        if (existingDefault) {
          return existingDefault;
        }

        // Create default view if it doesn't exist
        const defaultFilterConfig = getDefaultFilterConfig(resourceKey);
        const viewName = resourceKey === 'leads' 
          ? 'כל הלידים' 
          : resourceKey === 'customers'
          ? 'כל הלקוחות'
          : resourceKey === 'templates'
          ? 'כל התכניות'
          : resourceKey === 'nutrition_templates'
          ? 'כל תבניות התזונה'
          : resourceKey === 'budgets'
          ? 'כל התקציבים'
          : 'כל התכניות';

        const { data: newView, error } = await supabase
          .from('saved_views')
          .insert({
            resource_key: resourceKey,
            view_name: viewName,
            filter_config: defaultFilterConfig,
            is_default: true,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          console.warn('Error creating default view:', error);
          return null;
        }

        // Invalidate savedViews query so sidebar updates immediately
        await queryClient.invalidateQueries({ queryKey: ['savedViews', resourceKey] });
        // Also refetch to ensure the sidebar gets the new view
        await queryClient.refetchQueries({ queryKey: ['savedViews', resourceKey] });

        return newView;
      } catch (error) {
        console.warn('Error in useDefaultView:', error);
        return null;
      }
    },
    enabled: !!user?.email && !!resourceKey,
    staleTime: Infinity, // Default views don't change
    retry: false,
  });

  return {
    defaultView,
    isLoading,
  };
};


