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

    console.log('[useClientDashboard] Effect triggered:', {
      userRole: user?.role,
      userId: user?.id,
      customerId: user?.customer_id,
      isImpersonating,
      impersonatedUserId,
      impersonatedCustomerId,
      targetUserId,
      targetCustomerId,
      isTrainee,
    });
    
    // When impersonating, we need both customer_id and user_id to be available
    if (isImpersonating) {
      if (targetCustomerId) {
        // Prefer customer_id when available
        console.log('[useClientDashboard] Fetching by customer_id (impersonating):', targetCustomerId);
        dispatch(fetchClientData(targetCustomerId));
      } else if (targetUserId) {
        // Fallback to user_id if customer_id not available
        console.log('[useClientDashboard] Fetching by user_id (impersonating, customer_id null):', targetUserId);
        dispatch(fetchClientDataByUserId(targetUserId));
      } else {
        console.log('[useClientDashboard] Impersonation active but no user_id or customer_id available yet, waiting...');
      }
    } else if (isTrainee && targetUserId) {
      // Regular trainee user flow
      // Try to fetch by customer_id first, if available
      if (targetCustomerId) {
        console.log('[useClientDashboard] Fetching by customer_id:', targetCustomerId);
        dispatch(fetchClientData(targetCustomerId));
      } else {
        // Otherwise, fetch by user_id
        console.log('[useClientDashboard] Fetching by user_id (customer_id is null):', targetUserId);
        dispatch(fetchClientDataByUserId(targetUserId));
      }
    } else if (!isTrainee) {
      console.log('[useClientDashboard] User is not a trainee and not impersonating, skipping fetch');
    } else if (!targetUserId) {
      console.log('[useClientDashboard] User ID not available yet, waiting...');
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

  // Calculate BMI
  const bmi = activeLead?.bmi || null;

  // Get stats from active lead
  const stats = {
    weight: activeLead?.weight || null,
    height: activeLead?.height || null,
    bmi,
    fitnessGoal: activeLead?.fitness_goal || null,
    activityLevel: activeLead?.activity_level || null,
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

