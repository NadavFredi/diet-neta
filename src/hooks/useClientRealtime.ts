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

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useClientRealtime = (customerId: string | null) => {
  const dispatch = useAppDispatch();
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
    console.log('[useClientRealtime] Setting up polling for customer:', customerId);
    dispatch(fetchClientData(customerId));
    dispatch(fetchCheckIns(customerId));
    dispatch(fetchCustomerNotes(customerId));

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      console.log('[useClientRealtime] Polling for updates...');
      dispatch(fetchClientData(customerId));
      dispatch(fetchCheckIns(customerId));
      dispatch(fetchCustomerNotes(customerId));
    }, POLL_INTERVAL);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        console.log('[useClientRealtime] Clearing polling interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [customerId, user?.role, dispatch]);
};

