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
        console.log('[AuthInitializer] Supabase URL changed, clearing session...', {
          stored: storedUrl,
          current: currentUrl
        });
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
        console.log('[AuthInitializer] Already initializing, skipping...');
        return;
      }
      
      setIsInitializing(true);
      
      try {
        console.log('[AuthInitializer] Starting auth initialization...');
        
        // Set a fallback timeout to ensure we don't hang forever
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('[AuthInitializer] Auth initialization timeout after 10s - forcing completion');
            dispatch(forceLoadingComplete());
            setIsInitializing(false);
            setHasInitialized(true);
          }
        }, 10000); // 10 second timeout
        
        initPromise = dispatch(initializeAuth());
        const result = await initPromise;
        
        // Clear timeout if we completed successfully
        clearTimeout(timeoutId);
        setIsInitializing(false);
        setHasInitialized(true);
        
        if (isMounted) {
          console.log('[AuthInitializer] Auth initialization complete:', result.type);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        setIsInitializing(false);
        setHasInitialized(true);
        console.error('[AuthInitializer] Error during initialization:', error);
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
        
        console.log('[AuthInitializer] Auth state changed:', event);
        
        // Don't re-initialize if we're already initializing or if loginUser is handling it
        if (isInitializing) {
          console.log('[AuthInitializer] Skipping auth state change - already initializing');
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

