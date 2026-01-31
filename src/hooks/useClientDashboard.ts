import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchClientData, setActiveLead, fetchClientDataByUserId } from '@/store/slices/clientSlice';
import { startImpersonation } from '@/store/slices/impersonationSlice';
import { supabase } from '@/lib/supabaseClient';

export const useClientDashboard = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ customerId?: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, impersonatedUserId, impersonatedCustomerId } = useAppSelector(
    (state) => state.impersonation
  );
  const { customer, leads, isLoading, error } = useAppSelector(
    (state) => state.client
  );

  // Restore impersonation state from URL on page load/refresh
  useEffect(() => {
    const urlCustomerId = params.customerId;
    
    // If URL has customerId, user is admin/manager, and not already impersonating
    if (urlCustomerId && user && (user.role === 'admin' || user.role === 'user') && !isImpersonating) {
      // Fetch customer to get user_id
      supabase
        .from('customers')
        .select('user_id')
        .eq('id', urlCustomerId)
        .maybeSingle()
        .then(({ data: customerData, error: customerError }) => {
          if (!customerError && customerData?.user_id && user) {
            // Restore impersonation state
            dispatch(
              startImpersonation({
                userId: customerData.user_id,
                customerId: urlCustomerId,
                originalUser: {
                  id: user.id,
                  email: user.email || '',
                  role: user.role || 'user',
                },
                previousLocation: null, // Can't restore previous location on refresh
              })
            );
          }
        });
    }
  }, [params.customerId, user, isImpersonating, dispatch]);

  // Fetch client data when user is available
  useEffect(() => {
    // Prefer customerId from URL if available (for refresh support)
    const urlCustomerId = params.customerId;
    
    // Determine which user/customer to fetch data for
    const targetUserId = isImpersonating ? impersonatedUserId : user?.id;
    // Use URL customerId if available, otherwise use impersonation or user's customer_id
    const targetCustomerId = urlCustomerId || (isImpersonating ? impersonatedCustomerId : user?.customer_id);
    const isTrainee = user?.role === 'trainee' || isImpersonating;

    // When impersonating, we need both customer_id and user_id to be available
    if (isImpersonating) {
      if (targetCustomerId) {
        // Prefer customer_id when available
        dispatch(fetchClientData(targetCustomerId));
      } else if (targetUserId) {
        // Fallback to user_id if customer_id not available
        dispatch(fetchClientDataByUserId(targetUserId));
      }
    } else if (isTrainee && targetUserId) {
      // Regular trainee user flow
      // Try to fetch by customer_id first, if available
      if (targetCustomerId) {
        dispatch(fetchClientData(targetCustomerId));
      } else {
        // Otherwise, fetch by user_id
        dispatch(fetchClientDataByUserId(targetUserId));
      }
    }
  }, [
    params.customerId,
    user?.id,
    user?.customer_id,
    user?.role,
    isImpersonating,
    impersonatedUserId,
    impersonatedCustomerId,
    dispatch,
  ]);

  const handleSelectLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      dispatch(setActiveLead(lead));
    }
  };

  // Get stats from most recent lead (weight/height still stored per lead)
  // But displayed as customer-level data - all leads updated when changed
  const mostRecentLead = leads && leads.length > 0 ? leads[0] : null;
  
  // Calculate BMI from most recent weight/height
  const bmi = mostRecentLead?.bmi || null;

  // Get stats - using most recent lead's values (representing current customer state)
  const stats = {
    weight: mostRecentLead?.weight || null,
    height: mostRecentLead?.height || null,
    bmi,
    fitnessGoal: mostRecentLead?.fitness_goal || null,
    activityLevel: mostRecentLead?.activity_level || null,
  };

  return {
    customer,
    leads,
    isLoading,
    error,
    stats,
    handleSelectLead,
  };
};

