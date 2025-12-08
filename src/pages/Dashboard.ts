import { useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAppDispatch } from '@/store/hooks';
import { fetchLeads } from '@/store/slices/dashboardSlice';

export const useDashboardPage = () => {
  const dispatch = useAppDispatch();
  const dashboard = useDashboard();

  // Fetch leads from Supabase on component mount
  useEffect(() => {
    dispatch(fetchLeads());
  }, [dispatch]);

  return {
    ...dashboard,
  };
};



