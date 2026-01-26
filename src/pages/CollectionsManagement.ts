/**
 * CollectionsManagement Logic
 * 
 * Business logic for the collections management page.
 * Matches the structure and functionality of PaymentsManagement.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAllCollections } from '@/hooks/useAllCollections';
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import { useToast } from '@/hooks/use-toast';
import {
  selectActiveFilters,
  selectColumnVisibility,
  selectColumnOrder,
  selectColumnSizing,
  selectFilterGroup,
  selectSearchQuery,
  selectCurrentPage,
  selectPageSize,
  selectSortBy,
  selectSortOrder,
  setCurrentPage,
  setPageSize,
  setSortBy,
  setSortOrder,
  initializeTableState,
} from '@/store/slices/tableStateSlice';
import { useEffect } from 'react';

export const useCollectionsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  // Get state from Redux tableStateSlice
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'collections'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'collections'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'collections'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'collections'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'collections'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'collections'));

  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'collections'));
  const columnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'collections'));
  const columnOrder = useAppSelector((state) => selectColumnOrder(state, 'collections'));
  const columnSizing = useAppSelector((state) => selectColumnSizing(state, 'collections'));

  const { data: collections, isLoading: isLoadingCollections, error } = useAllCollections({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    sortBy,
    sortOrder,
  });
  const { defaultView } = useDefaultView('collections');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('collections', savedView, isLoadingView);

  // Initialize table state for collections with column IDs (excluding ID column)
  useEffect(() => {
    const columnIds = ['created_at', 'due_date', 'status', 'customer', 'lead', 'total_amount', 'paid_amount', 'remaining_amount', 'description'];
    dispatch(initializeTableState({
      resourceKey: 'collections',
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
    dispatch(setSortBy({ resourceKey: 'collections', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'collections', sortOrder: order }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'collections', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'collections', pageSize: newPageSize }));
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

  const bulkDeleteCollections = useBulkDeleteRecords({
    table: 'collections',
    invalidateKeys: [['collections']],
    // No createdByField restriction - admins/users can delete all collections per RLS policy
  });

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    try {
      await bulkDeleteCollections.mutateAsync(payload.ids);
      toast({
        title: 'הצלחה',
        description: 'הגביות נמחקו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הגביות',
        variant: 'destructive',
      });
    }
  };

  const collectionRows = collections?.data || [];
  const filteredCollections = useMemo(() => collectionRows, [collectionRows]);
  const totalCollections = collections?.totalCount || 0;

  return {
    collections: filteredCollections,
    filteredCollections,
    isLoadingCollections,
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
    filterGroup,
    // Sorting
    sortBy,
    sortOrder,
    handleSortChange,
    // Pagination
    currentPage,
    pageSize,
    totalCollections,
    handlePageChange,
    handlePageSizeChange,
    handleBulkDelete,
  };
};
