/**
 * useClientRealtime Hook (Polling-based)
 * 
 * Polls for data updates every 5 minutes instead of real-time subscriptions.
 * This improves performance and reduces server load.
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchClientData } from '@/store/slices/clientSlice';
import { fetchCheckIns } from '@/store/slices/clientSlice';
import { fetchCustomerNotes } from '@/store/slices/leadViewSlice';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useClientRealtime = (customerId: string | null) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!customerId || user?.role !== 'trainee') {
      // Clear interval if customerId is null or user is not a trainee
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
  
    // Initial fetch
    dispatch(fetchClientData(customerId));
    dispatch(fetchCheckIns(customerId));
    dispatch(fetchCustomerNotes(customerId));
  
    // Set up real-time subscriptions for immediate updates
    const budgetSubscription = supabase
      .channel('budget-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_assignments',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          dispatch(fetchClientData(customerId));
        }
      )
      .subscribe();

    const workoutSubscription = supabase
      .channel('workout-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_plans',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          // fetchClientData already includes some plan info, 
          // but we might need to trigger specific plan refetches if they use React Query
          // For now, fetchClientData is a good start
          dispatch(fetchClientData(customerId));
          // Invalidate React Query cache for workout plans
          queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
        }
      )
      .subscribe();

    const nutritionSubscription = supabase
      .channel('nutrition-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nutrition_plans',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          dispatch(fetchClientData(customerId));
          // Trigger React Query invalidation if needed
          queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
        }
      )
      .subscribe();

    const supplementSubscription = supabase
      .channel('supplement-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplement_plans',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          dispatch(fetchClientData(customerId));
          queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });
        }
      )
      .subscribe();

    const stepsSubscription = supabase
      .channel('steps-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'steps_plans',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          dispatch(fetchClientData(customerId));
          queryClient.invalidateQueries({ queryKey: ['steps-plans'] });
        }
      )
      .subscribe();

    // Set up polling interval as a fallback
    intervalRef.current = setInterval(() => {
      dispatch(fetchClientData(customerId));
      dispatch(fetchCheckIns(customerId));
      dispatch(fetchCustomerNotes(customerId));
    }, POLL_INTERVAL);
  
    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      budgetSubscription.unsubscribe();
      workoutSubscription.unsubscribe();
      nutritionSubscription.unsubscribe();
      supplementSubscription.unsubscribe();
      stepsSubscription.unsubscribe();
    };
  }, [customerId, user?.role, dispatch]);
};

