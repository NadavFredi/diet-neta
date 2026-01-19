/**
 * CustomersManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import { useCustomers } from '@/hooks/useCustomers';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { selectActiveFilters, selectFilterGroup, selectSearchQuery } from '@/store/slices/tableStateSlice';

export const useCustomersManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('customers');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'customers'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'customers'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'customers'));

  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers({
    search: searchQuery,
    filterGroup,
  });

  useSyncSavedViewFilters('customers', savedView, isLoadingView);

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/customers?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      // Navigate to login even if logout fails
      navigate('/login');
    }
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  const filteredCustomers = useMemo(() => customers, [customers]);

  return {
    // Data
    customers: filteredCustomers,
    savedView,
    isLoadingCustomers,
    isLoadingView,
    
    // State
    searchQuery,
    isSaveViewModalOpen,
    
    // Handlers
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
  };
};




