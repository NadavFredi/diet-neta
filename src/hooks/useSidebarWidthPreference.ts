/**
 * Hook for managing user sidebar width preference
 * 
 * Syncs sidebar width between Redux and the database.
 * Redux provides immediate reactivity, database provides persistence.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  setSidebarWidth as setReduxSidebarWidth,
  selectSidebarWidth,
} from '@/store/slices/sidebarSlice';

const DEFAULT_SIDEBAR_WIDTH = 256; // Default expanded width
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

export interface SidebarWidthPreference {
  id: string;
  user_id: string;
  interface_key: string;
  numeric_value: number;
  created_at: string;
  updated_at: string;
}

// Get sidebar width preference for the current user
// This hook syncs database preference to Redux for immediate reactivity
export const useSidebarWidthPreference = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const currentWidth = useAppSelector(selectSidebarWidth);
  const hasSyncedRef = useRef(false);

  const query = useQuery({
    queryKey: ['sidebarWidthPreference', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return DEFAULT_SIDEBAR_WIDTH;

      try {
        const userId = user.id;

        const { data, error } = await supabase
          .from('user_interface_preferences')
          .select('numeric_value')
          .eq('user_id', userId)
          .eq('interface_key', 'sidebar_width')
          .maybeSingle();

        if (error || !data) {
          return DEFAULT_SIDEBAR_WIDTH;
        }

        const width = data.numeric_value;
        // Validate width is within bounds
        if (typeof width === 'number' && width >= MIN_WIDTH && width <= MAX_WIDTH) {
          return width;
        }

        return DEFAULT_SIDEBAR_WIDTH;
      } catch (error) {
        return DEFAULT_SIDEBAR_WIDTH;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync fetched preference to Redux when data arrives (only once per query result)
  useEffect(() => {
    if (query.data && query.isSuccess && !hasSyncedRef.current) {
      // Only sync if Redux doesn't have a value yet, or if DB value is different
      if (currentWidth === null || query.data !== currentWidth) {
        dispatch(setReduxSidebarWidth(query.data));
        hasSyncedRef.current = true;
      }
    }
    
    // Reset sync flag when user changes
    if (!user?.id) {
      hasSyncedRef.current = false;
    }
  }, [query.data, query.isSuccess, currentWidth, dispatch, user?.id]);

  return {
    ...query,
    width: currentWidth ?? query.data ?? DEFAULT_SIDEBAR_WIDTH,
  };
};

// Update sidebar width preference
// Updates both Redux (for immediate UI update) and database (for persistence)
export const useUpdateSidebarWidthPreference = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (width: number) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate width
      const validatedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));

      const userId = user.id;

      // Update Redux immediately for instant UI feedback
      dispatch(setReduxSidebarWidth(validatedWidth));

      // Then persist to database (only numeric_value, icon_name is null for numeric preferences)
      const { data, error } = await supabase
        .from('user_interface_preferences')
        .upsert(
          {
            user_id: userId,
            interface_key: 'sidebar_width',
            numeric_value: validatedWidth,
            icon_name: null, // Explicitly set to null for numeric-only preferences
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,interface_key',
          }
        )
        .select()
        .single();

      if (error) {
        // Revert Redux change on error - reload from DB
        queryClient.invalidateQueries({ queryKey: ['sidebarWidthPreference', userId] });
        throw error;
      }

      return data as SidebarWidthPreference;
    },
    onSuccess: () => {
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['sidebarWidthPreference'] });
    },
  });
};
