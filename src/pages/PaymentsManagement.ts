/**
 * PaymentsManagement Logic
 * 
 * Business logic for the payments management page.
 */

import { useState } from 'react';
import { useAllPayments } from '@/hooks/useAllPayments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useTableFilters } from '@/hooks/useTableFilters';
import type { FilterConfig } from '@/hooks/useTableFilters';

export const usePaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  
  const { data: payments, isLoading: isLoadingPayments, error } = useAllPayments();
  const { defaultView } = useDefaultView('payments');
  const { data: savedView } = useSavedView(viewId);

  // Filter system for modals
  const {
    filters: activeFilters,
  } = useTableFilters([]);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (filters: typeof activeFilters): FilterConfig => {
    return {
      filters: filters.map(filter => ({
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      })),
    };
  };

  return {
    payments: payments || [],
    isLoadingPayments,
    error,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    savedView,
    defaultView,
    viewId,
  };
};
