/**
 * useClientRealtime Hook
 * 
 * Sets up Supabase Realtime subscriptions for client data synchronization.
 * Ensures coach and client views stay in sync.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientData, updateClientLead, updateClientCustomer } from '@/store/slices/clientSlice';
import { fetchCustomerNotes } from '@/store/slices/leadViewSlice';

export const useClientRealtime = (customerId: string | null) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!customerId || user?.role !== 'trainee') return;

    // Subscribe to customer changes
    const customerChannel = supabase
      .channel(`customer:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customerId}`,
        },
        (payload) => {
          console.log('Customer updated:', payload);
          dispatch(updateClientCustomer({ customerId, updates: payload.new as any }));
        }
      )
      .subscribe();

    // Subscribe to lead changes
    const leadsChannel = supabase
      .channel(`customer-leads:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.log('Lead changed:', payload);
          // Refetch client data to get updated leads
          dispatch(fetchClientData(customerId));
        }
      )
      .subscribe();

    // Subscribe to daily check-ins
    const checkInsChannel = supabase
      .channel(`check-ins:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_check_ins',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.log('Check-in changed:', payload);
          // Refetch check-ins
          // This will be handled by the useDailyCheckIn hook
        }
      )
      .subscribe();

    // Subscribe to customer notes
    const notesChannel = supabase
      .channel(`customer-notes:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_notes',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.log('Note changed:', payload);
          dispatch(fetchCustomerNotes(customerId));
        }
      )
      .subscribe();

    return () => {
      customerChannel.unsubscribe();
      leadsChannel.unsubscribe();
      checkInsChannel.unsubscribe();
      notesChannel.unsubscribe();
    };
  }, [customerId, user?.role, dispatch]);
};

