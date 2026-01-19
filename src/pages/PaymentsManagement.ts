/**
 * PaymentsManagement Logic
 * 
 * Business logic for the payments management page.
 */

import { useState, useMemo } from 'react';
import { useAllPayments } from '@/hooks/useAllPayments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { selectFilterGroup, selectSearchQuery } from '@/store/slices/tableStateSlice';

export const usePaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'payments'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'payments'));

  const { data: payments, isLoading: isLoadingPayments, error } = useAllPayments({
    search: searchQuery,
    filterGroup,
  });
  const { defaultView } = useDefaultView('payments');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('payments', savedView, isLoadingView);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (filters: ActiveFilter[]): FilterConfig => {
    return {
      searchQuery: searchQuery || '',
      filterGroup,
      advancedFilters: filters.map((filter) => ({
        id: filter.id,
        fieldId: filter.fieldId,
        fieldLabel: filter.fieldLabel,
        operator: filter.operator,
        values: filter.values,
        type: filter.type,
      })),
    };
  };

  const filteredPayments = useMemo(() => payments || [], [payments]);

  return {
    payments: filteredPayments,
    isLoadingPayments,
    error,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    savedView,
    isLoadingView,
    defaultView,
    viewId,
  };
};
