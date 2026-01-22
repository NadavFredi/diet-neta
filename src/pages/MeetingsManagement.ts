/**
 * MeetingsManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMeetings } from '@/hooks/useMeetings';
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  selectSearchQuery,
  selectFilterGroup,
  selectActiveFilters,
  selectCurrentPage,
  selectPageSize,
  selectGroupByKeys,
  setCurrentPage,
  setPageSize,
  setSearchQuery,
  addFilter as addFilterAction,
  removeFilter as removeFilterAction,
  clearFilters as clearFiltersAction,
  initializeTableState,
} from '@/store/slices/tableStateSlice';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { useToast } from '@/hooks/use-toast';

export const useMeetingsManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();
  
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'meetings'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'meetings'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'meetings'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'meetings'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'meetings'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'meetings'));

  const { data: meetingsData, isLoading: isLoadingMeetings } = useMeetings({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
  });
  
  const meetings = meetingsData?.data || [];
  const totalMeetings = meetingsData?.totalCount || 0;
  
  // Reset to page 1 when filters, search, or grouping change
  const prevFiltersRef = useRef<string>('');
  useEffect(() => {
    const currentFilters = JSON.stringify({ 
      searchQuery, 
      filterGroup,
      groupByKeys: [groupByKeys[0], groupByKeys[1]],
    });
    if (prevFiltersRef.current && prevFiltersRef.current !== currentFilters) {
      if (currentPage !== 1) {
        dispatch(setCurrentPage({ resourceKey: 'meetings', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
  const bulkDeleteMeetings = useBulkDeleteRecords({
    table: 'meetings',
    invalidateKeys: [['meetings']],
    // No createdByField restriction - admins/users can delete all meetings per RLS policy
  });
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('meetings', savedView, isLoadingView);

  // Initialize table state for meetings
  useEffect(() => {
    dispatch(initializeTableState({ resourceKey: 'meetings' }));
  }, [dispatch]);

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'meetings', query: value }));
  };

  const addFilter = (filter: ActiveFilter) => {
    dispatch(addFilterAction({ resourceKey: 'meetings', filter }));
  };

  const removeFilter = (filterId: string) => {
    dispatch(removeFilterAction({ resourceKey: 'meetings', filterId }));
  };

  const clearFilters = () => {
    dispatch(clearFiltersAction({ resourceKey: 'meetings' }));
  };

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery: searchQuery || '',
      filterGroup,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  // Filter meetings based on search query and active filters
  const filteredMeetings = useMemo(() => meetings, [meetings]);

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    try {
      await bulkDeleteMeetings.mutateAsync(payload.ids);
      toast({
        title: 'הצלחה',
        description: 'הפגישות נמחקו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הפגישות',
        variant: 'destructive',
      });
    }
  };

  return {
    meetings,
    filteredMeetings,
    totalMeetings,
    isLoadingMeetings,
    handleLogout,
    getCurrentFilterConfig,
    searchQuery,
    handleSearchChange,
    addFilter,
    removeFilter,
    clearFilters,
    handleBulkDelete,
    activeFilters,
  };
};
