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
import { useTableFilters } from '@/hooks/useTableFilters';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { useToast } from '@/hooks/use-toast';
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
  setActiveFilters,
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

  const { data: collections, isLoading: isLoadingCollections, error } = useAllCollections({
    search: searchQuery,
    filterGroup: effectiveFilterGroup,
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

  const handleSearchChange = useCallback((value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'collections', query: value }));
  }, [dispatch]);

  // Sync local filter group changes to Redux
  useEffect(() => {
    if (localFilterGroup) {
      dispatch(setActiveFilters({ resourceKey: 'collections', filters: localFilterGroup }));
    }
  }, [localFilterGroup, dispatch]);

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
    dispatch(setSortBy({ resourceKey: 'collections', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'collections', sortOrder: order }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'collections', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'collections', pageSize: newPageSize }));
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
        description: 'הגבייות נמחקו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הגבייות',
        variant: 'destructive',
      });
    }
  };

  const filteredCollections = useMemo(() => collections || [], [collections]);
  const totalCollections = collections?.length || 0;

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
    totalCollections,
    handlePageChange,
    handlePageSizeChange,
    handleBulkDelete,
  };
};
