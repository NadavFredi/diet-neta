/**
 * PaymentsManagement Logic
 * 
 * Business logic for the payments management page.
 * Matches the structure and functionality of Dashboard/Leads management.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAllPayments } from '@/hooks/useAllPayments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import { 
  selectActiveFilters,
  selectFilterGroup, 
  selectSearchQuery,
  selectColumnVisibility,
  selectColumnOrder,
  selectColumnSizing,
  selectCurrentPage,
  selectPageSize,
  selectSortBy,
  selectSortOrder,
  selectGroupByKeys,
  setCurrentPage,
  setPageSize,
  setSortBy,
  setSortOrder,
  initializeTableState,
} from '@/store/slices/tableStateSlice';
import { useEffect } from 'react';

export const usePaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  
  // Get state from Redux tableStateSlice
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'payments'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'payments'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'payments'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'payments'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'payments'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'payments'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'payments'));

  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'payments'));
  const columnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'payments'));
  const columnOrder = useAppSelector((state) => selectColumnOrder(state, 'payments'));
  const columnSizing = useAppSelector((state) => selectColumnSizing(state, 'payments'));

  const { data: paymentsData, isLoading: isLoadingPayments, error } = useAllPayments({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
    sortBy,
    sortOrder,
  });
  
  const payments = paymentsData?.data || [];
  const totalPayments = paymentsData?.totalCount || 0;
  const { defaultView } = useDefaultView('payments');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('payments', savedView, isLoadingView);

  // Initialize table state for payments with column IDs (excluding ID column)
  useEffect(() => {
    const columnIds = ['date', 'status', 'lead', 'customer', 'amount', 'product'];
    dispatch(initializeTableState({ 
      resourceKey: 'payments',
      columnIds,
    }));
  }, [dispatch]);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const handleSortChange = useCallback((columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'payments', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'payments', sortOrder: order }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'payments', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'payments', pageSize: newPageSize }));
  }, [dispatch]);

  const getCurrentFilterConfig = (filters: typeof activeFilters): FilterConfig => {
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
      columnVisibility,
      columnOrder,
      columnWidths: columnSizing,
    };
  };

  const filteredPayments = useMemo(() => payments || [], [payments]);

  return {
    payments: filteredPayments,
    filteredPayments,
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
    // Search and filters
    searchQuery,
    activeFilters,
    // Sorting
    sortBy,
    sortOrder,
    handleSortChange,
    // Pagination
    currentPage,
    pageSize,
    totalPayments,
    handlePageChange,
    handlePageSizeChange,
  };
};
