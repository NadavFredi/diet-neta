/**
 * AuthInitializer Component
 * 
 * Initializes authentication state on app startup.
 * Should be placed at the root of the app.
 */

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth, forceLoadingComplete } from '@/store/slices/authSlice';
import { supabase } from '@/lib/supabaseClient';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let initPromise: Promise<any> | null = null;
    
    // Check if Supabase URL has changed (switched from local to production or vice versa)
    const checkSupabaseUrlMismatch = async () => {
      const currentUrl = import.meta.env.VITE_SUPABASE_URL;
      const storedUrl = localStorage.getItem('supabase_url');
      
      if (storedUrl && storedUrl !== currentUrl) {
        // Clear session if URL changed
        await supabase.auth.signOut();
        localStorage.removeItem('supabase_url');
      }
      
      // Store current URL
      localStorage.setItem('supabase_url', currentUrl);
    };
    
    const initAuth = async () => {
      // Check for URL mismatch first
      await checkSupabaseUrlMismatch();
      // Prevent multiple simultaneous calls
      if (isInitializing) {
        return;
      }
      
      setIsInitializing(true);
      
      try {
        // Set a fallback timeout to ensure we don't hang forever
        timeoutId = setTimeout(() => {
          if (isMounted) {
            dispatch(forceLoadingComplete());
            setIsInitializing(false);
            setHasInitialized(true);
          }
        }, 10000); // 10 second timeout
        
        initPromise = dispatch(initializeAuth());
        await initPromise;
        
        // Clear timeout if we completed successfully
        clearTimeout(timeoutId);
        setIsInitializing(false);
        setHasInitialized(true);

        // Trigger subscription expiration check (fire and forget)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          supabase.rpc('check_expiring_subscriptions')
            .then(({ error }) => {
              if (error) console.error('Error checking subscriptions:', error);
            })
            .catch(err => console.error('Error checking subscriptions:', err));
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        setIsInitializing(false);
        setHasInitialized(true);
        // Force loading to false on error
        dispatch(forceLoadingComplete());
      }
    };
    
    // Only initialize once on mount
    if (!hasInitialized && !isInitializing) {
      initAuth();
    }
    
    // Listen for auth state changes (but debounce to prevent multiple calls)
    let authChangeTimeout: NodeJS.Timeout;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        // Don't re-initialize if we're already initializing or if loginUser is handling it
        if (isInitializing) {
          return;
        }
        
        // Debounce auth state changes to prevent rapid-fire calls
        clearTimeout(authChangeTimeout);
        authChangeTimeout = setTimeout(async () => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Only initialize if we haven't already initialized recently
            if (!hasInitialized) {
              setIsInitializing(true);
              try {
                await dispatch(initializeAuth());
              } finally {
                setIsInitializing(false);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            // The logoutUser thunk will handle this, but we can also initialize to clear state
            setIsInitializing(true);
            try {
              await dispatch(initializeAuth());
            } finally {
              setIsInitializing(false);
            }
          }
        }, 500); // 500ms debounce
      }
    );

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (authChangeTimeout) clearTimeout(authChangeTimeout);
      subscription.unsubscribe();
    };
  }, [dispatch, hasInitialized, isInitializing]);

  return <>{children}</>;
};

