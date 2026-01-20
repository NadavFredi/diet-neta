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
import { useTableFilters } from '@/hooks/useTableFilters';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { 
  selectFilterGroup, 
  selectSearchQuery,
  selectCurrentPage,
  selectPageSize,
  selectSortBy,
  selectSortOrder,
  setSearchQuery,
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

  // Filter system (same as Dashboard)
  const {
    filterGroup: localFilterGroup,
    filters: activeFilters,
    addFilter: addFilterLocal,
    removeFilter: removeFilterLocal,
    clearFilters: clearFiltersLocal,
    updateFilters: updateFiltersLocal,
    updateFilter: updateFilterLocal,
    setFilterGroup: setFilterGroupLocal,
  } = useTableFilters([]);

  // Use local filter group if available, otherwise use Redux
  const effectiveFilterGroup = localFilterGroup || filterGroup;

  const { data: payments, isLoading: isLoadingPayments, error } = useAllPayments({
    search: searchQuery,
    filterGroup: effectiveFilterGroup,
  });
  const { defaultView } = useDefaultView('payments');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('payments', savedView, isLoadingView);

  // Initialize table state for payments
  useEffect(() => {
    dispatch(initializeTableState({ resourceKey: 'payments' }));
  }, [dispatch]);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const handleSearchChange = useCallback((value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'payments', query: value }));
  }, [dispatch]);

  const addFilter = useCallback((filter: ActiveFilter) => {
    addFilterLocal(filter);
  }, [addFilterLocal]);

  const removeFilter = useCallback((filterId: string) => {
    removeFilterLocal(filterId);
  }, [removeFilterLocal]);

  const clearFilters = useCallback(() => {
    clearFiltersLocal();
  }, [clearFiltersLocal]);

  const setFilterGroup = useCallback((group: FilterGroup | null) => {
    setFilterGroupLocal(group);
  }, [setFilterGroupLocal]);

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

  const getCurrentFilterConfig = (filters: ActiveFilter[]): FilterConfig => {
    return {
      searchQuery: searchQuery || '',
      filterGroup: effectiveFilterGroup,
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
  const totalPayments = payments?.length || 0;

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
    handleSearchChange,
    activeFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterGroup: effectiveFilterGroup,
    setFilterGroup,
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
