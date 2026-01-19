/**
 * Hook for managing user interface icon preferences
 * 
 * Syncs preferences between Redux and the database.
 * Redux provides immediate reactivity, database provides persistence.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
// Note: We now use user.id from Redux auth state instead of getUserIdFromEmail
import { 
  setPreferences as setReduxPreferences, 
  updatePreference as updateReduxPreference,
  selectInterfaceIconPreferences,
  selectIsIconPreferencesInitialized,
} from '@/store/slices/interfaceIconPreferencesSlice';

export interface InterfaceIconPreference {
  id: string;
  user_id: string;
  interface_key: string;
  icon_name: string;
  created_at: string;
  updated_at: string;
}

// Get all interface icon preferences for the current user
// This hook syncs database preferences to Redux for immediate reactivity
export const useInterfaceIconPreferences = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isInitialized = useAppSelector(selectIsIconPreferencesInitialized);

  const query = useQuery({
    queryKey: ['interfaceIconPreferences', user?.id],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!user?.id) return {};

      try {
        const userId = user.id; // Use user.id from Redux instead of API call

        const { data, error } = await supabase
          .from('user_interface_preferences')
          .select('interface_key, icon_name')
        .eq('user_id', userId);

      if (error) {
        return {};
      }

      // Convert array to object: { 'leads': 'Users', 'customers': 'UserCircle', ... }
        const preferences: Record<string, string> = {};
        (data || []).forEach((pref) => {
          preferences[pref.interface_key] = pref.icon_name;
        });

        return preferences;
      } catch (error) {
        return {};
      }
    },
    enabled: !!user?.id && !isInitialized, // Only fetch if not already initialized
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync fetched preferences to Redux when data arrives
  useEffect(() => {
    if (query.data && Object.keys(query.data).length > 0 && !isInitialized) {
      dispatch(setReduxPreferences(query.data));
    } else if (query.data && Object.keys(query.data).length === 0 && !isInitialized) {
      // Even if empty, mark as initialized
      dispatch(setReduxPreferences({}));
    }
  }, [query.data, isInitialized, dispatch]);

  // Return preferences from Redux (not query data) for consistency and immediate reactivity
  const preferences = useAppSelector(selectInterfaceIconPreferences);
  return {
    ...query,
    data: preferences,
  };
};

// Update interface icon preference
// Updates both Redux (for immediate UI update) and database (for persistence)
export const useUpdateInterfaceIconPreference = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      interfaceKey,
      iconName,
    }: {
      interfaceKey: string;
      iconName: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      // Update Redux immediately for instant UI feedback
      dispatch(updateReduxPreference({ interfaceKey, iconName }));

      // Then persist to database
      const { data, error } = await supabase
        .from('user_interface_preferences')
        .upsert(
          {
            user_id: userId,
            interface_key: interfaceKey,
            icon_name: iconName,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,interface_key',
          }
        )
        .select()
        .single();

      if (error) {
        // Revert Redux change on error
        dispatch(updateReduxPreference({ interfaceKey, iconName: '' }));
        throw error;
      }

      return data as InterfaceIconPreference;
    },
    onSuccess: () => {
      // Invalidate query cache (though we're using Redux as source of truth)
      queryClient.invalidateQueries({ queryKey: ['interfaceIconPreferences'] });
    },
  });
};




