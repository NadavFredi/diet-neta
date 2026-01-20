/**
 * CustomersManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import { useCustomers } from '@/hooks/useCustomers';
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { 
  selectFilterGroup, 
  selectSearchQuery, 
  selectCurrentPage, 
  selectPageSize, 
  selectTotalCount,
  selectGroupByKeys,
  setCurrentPage,
  setPageSize,
  setTotalCount,
} from '@/store/slices/tableStateSlice';
import { useToast } from '@/hooks/use-toast';

export const useCustomersManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();
  
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('customers');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'customers'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'customers'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'customers'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'customers'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'customers'));

  const { data: customersResult, isLoading: isLoadingCustomers } = useCustomers({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
  });

  const customers = customersResult?.data ?? [];
  const totalCustomers = customersResult?.totalCount ?? 0;

  // Update total count in Redux when it changes
  useEffect(() => {
    if (customersResult?.totalCount !== undefined) {
      dispatch(setTotalCount({ resourceKey: 'customers', totalCount: customersResult.totalCount }));
    }
  }, [customersResult?.totalCount, dispatch]);

  // Reset to page 1 when filters, search, or grouping change (but not on initial load)
  const prevFiltersRef = useRef<string>('');
  useEffect(() => {
    const currentFilters = JSON.stringify({ 
      searchQuery, 
      filterGroup,
      groupByKeys: [groupByKeys[0], groupByKeys[1]],
    });
    if (prevFiltersRef.current && prevFiltersRef.current !== currentFilters) {
      // Filters or grouping changed, reset to page 1
      if (currentPage !== 1) {
        dispatch(setCurrentPage({ resourceKey: 'customers', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
  const bulkDeleteCustomers = useBulkDeleteRecords({
    table: 'customers',
    invalidateKeys: [['customers']],
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
      filterGroup,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  const filteredCustomers = useMemo(() => customers, [customers]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'customers', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'customers', pageSize: newPageSize }));
  }, [dispatch]);

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    await bulkDeleteCustomers.mutateAsync(payload.ids);
    toast({
      title: 'הצלחה',
      description: 'הלקוחות נמחקו בהצלחה',
    });
  };

  return {
    // Data
    customers, // Raw customers data
    filteredCustomers, // Filtered customers (same as customers since filtering happens in useCustomers hook)
    totalCustomers, // Total count for pagination
    savedView,
    isLoadingCustomers,
    isLoadingView,
    
    // State
    searchQuery,
    isSaveViewModalOpen,
    currentPage,
    pageSize,
    
    // Handlers
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
    handleBulkDelete,
    handlePageChange,
    handlePageSizeChange,
  };
};
