import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchClientData, setActiveLead, fetchClientDataByUserId } from '@/store/slices/clientSlice';

export const useClientDashboard = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { customer, activeLead, leads, isLoading, error } = useAppSelector(
    (state) => state.client
  );

  // Fetch client data when user is available
  useEffect(() => {
    console.log('[useClientDashboard] Effect triggered:', {
      userRole: user?.role,
      userId: user?.id,
      customerId: user?.customer_id,
      isLoading
    });
    
    if (user?.role === 'trainee' && user?.id) {
      // Try to fetch by customer_id first, if available
      if (user.customer_id) {
        console.log('[useClientDashboard] Fetching by customer_id:', user.customer_id);
        dispatch(fetchClientData(user.customer_id));
      } else {
        // Otherwise, fetch by user_id
        console.log('[useClientDashboard] Fetching by user_id (customer_id is null):', user.id);
        dispatch(fetchClientDataByUserId(user.id));
      }
    } else if (user?.role !== 'trainee') {
      console.log('[useClientDashboard] User is not a trainee, skipping fetch');
    } else if (!user?.id) {
      console.log('[useClientDashboard] User ID not available yet, waiting...');
    }
  }, [user?.id, user?.customer_id, user?.role, dispatch, isLoading]);

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

