/**
 * Cached User ID Hook
 * 
 * Provides a cached user ID to avoid repeated API calls to getUserIdFromEmail.
 * Uses React Query to cache the user ID with a long staleTime.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

// Cache for user ID lookups (in-memory cache to avoid duplicate queries)
const userIdCache = new Map<string, string>();

export const useUserId = () => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['userId', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      // Check in-memory cache first
      if (userIdCache.has(user.email)) {
        return userIdCache.get(user.email)!;
      }

      // First try to get from auth.users (if there's an active session)
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authUser && !authError) {
          userIdCache.set(user.email, authUser.id);
          return authUser.id;
        }
      } catch (e) {
        // Auth session not available, continue to profile lookup
      }

      // Try to find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (profile && profile.id) {
        userIdCache.set(user.email, profile.id);
        return profile.id;
      }

      // SECURITY: Do not create users with temporary passwords
      // Users must be created through the secure invitation system
      throw new Error(
        `User profile not found for email: ${user.email}. ` +
        `Please contact an administrator to create your account via the secure invitation system.`
      );
    },
    enabled: !!user?.email,
    staleTime: Infinity, // User ID never changes for a session
    gcTime: Infinity, // Keep in cache forever (renamed from cacheTime in v5)
    retry: false,
  });
};

