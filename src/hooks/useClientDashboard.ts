import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchClientData, setActiveLead, fetchClientDataByUserId } from '@/store/slices/clientSlice';

export const useClientDashboard = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, impersonatedUserId, impersonatedCustomerId } = useAppSelector(
    (state) => state.impersonation
  );
  const { customer, activeLead, leads, isLoading, error } = useAppSelector(
    (state) => state.client
  );

  // Fetch client data when user is available
  useEffect(() => {
    // Determine which user/customer to fetch data for
    const targetUserId = isImpersonating ? impersonatedUserId : user?.id;
    const targetCustomerId = isImpersonating ? impersonatedCustomerId : user?.customer_id;
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

  // Aggregate stats from all leads - use most recent values or average where appropriate
  // For display, we'll use the most recent lead's values, but conceptually this is customer-level
  const mostRecentLead = leads && leads.length > 0 ? leads[0] : null;
  
  // Calculate BMI from most recent weight/height
  const bmi = mostRecentLead?.bmi || null;

  // Get stats - using most recent lead's values for display
  // In the future, this could be aggregated/averaged across all leads
  const stats = {
    weight: mostRecentLead?.weight || null,
    height: mostRecentLead?.height || null,
    bmi,
    fitnessGoal: mostRecentLead?.fitness_goal || null,
    activityLevel: mostRecentLead?.activity_level || null,
  };

  return {
    customer,
    activeLead,
    leads,
    isLoading,
    error,
    stats,
    handleSelectLead,
  };
};

