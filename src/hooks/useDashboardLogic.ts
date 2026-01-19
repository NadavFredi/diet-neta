/**
 * Dashboard Logic Hook
 * 
 * Architecture: All business logic for Dashboard page.
 * Uses PostgreSQL-optimized service layer.
 * No client-side filtering or calculations.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useDefaultView } from '@/hooks/useDefaultView';
import { logoutUser } from '@/store/slices/authSlice';
import { format } from 'date-fns';
import {
  setSearchQuery,
  setSelectedDate,
  setSelectedStatus,
  setSelectedAge,
  setSelectedHeight,
  setSelectedWeight,
  setSelectedFitnessGoal,
  setSelectedActivityLevel,
  setSelectedPreferredTime,
  setSelectedSource,
  setColumnVisibility,
  toggleColumnVisibility,
  resetFilters,
  setLeads,
  setLoading,
  setError,
  setCurrentPage,
  setPageSize,
  setTotalLeads,
  setSortBy,
  setSortOrder,
} from '@/store/slices/dashboardSlice';
import { fetchFilteredLeads, getFilteredLeadsCount, mapLeadToUIFormat, type LeadFilterParams } from '@/services/leadService';
import type { Lead } from '@/store/slices/dashboardSlice';
import type { ColumnVisibility as ColumnVisibilityType } from '@/utils/dashboard';
import {
  selectGroupByKeys,
  selectGroupSorting,
} from '@/store/slices/tableStateSlice';

export const useDashboardLogic = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const [hasAppliedView, setHasAppliedView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redux state (source of truth - no derived state)
  const {
    leads, // Raw leads from database
    searchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
    isLoading,
    error,
    // Pagination state
    currentPage,
    pageSize,
    totalLeads,
    // Sorting state
    sortBy,
    sortOrder,
  } = useAppSelector((state) => state.dashboard);

  // Group by state from tableStateSlice (for leads)
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'leads'));
  const groupSorting = useAppSelector((state) => selectGroupSorting(state, 'leads'));

  // Debounced search - internal state for debouncing
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAppSelector((state) => state.auth);
  const { defaultView } = useDefaultView('leads');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  // =====================================================
  // Auto-navigate to default view
  // =====================================================
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // =====================================================
  // Debounced search - update debounced value after 500ms
  // =====================================================
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to update debounced value
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    // Cleanup timeout on unmount or when searchQuery changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // =====================================================
  // Fetch leads with filters, pagination, sorting, grouping
  // PostgreSQL does all the heavy lifting
  // =====================================================
  const refreshLeads = useCallback(async () => {
    console.log('[useDashboardLogic] refreshLeads called');
    setIsRefreshing(true);
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      // Calculate offset from current page and page size
      const offset = (currentPage - 1) * pageSize;

      // Build filter params from Redux state
      const filterParams: LeadFilterParams = {
        searchQuery: debouncedSearchQuery || null, // Use debounced search
        createdDate: selectedDate || null,
        statusMain: selectedStatus || null,
        statusSub: null, // Can be added if needed
        age: selectedAge || null,
        height: selectedHeight || null,
        weight: selectedWeight || null,
        fitnessGoal: selectedFitnessGoal || null,
        activityLevel: selectedActivityLevel || null,
        preferredTime: selectedPreferredTime || null,
        source: selectedSource || null,
        // Pagination
        limit: pageSize,
        offset: offset,
        // Sorting
        sortBy: sortBy,
        sortOrder: sortOrder,
        // Grouping (from tableStateSlice)
        groupByLevel1: groupByKeys[0] || null,
        groupByLevel2: groupByKeys[1] || null,
      };

      // Fetch total count and leads in parallel
      console.log('useDashboardLogic: Calling fetchFilteredLeads with params:', filterParams);
      const [dbLeads, totalCount] = await Promise.all([
        fetchFilteredLeads(filterParams),
        getFilteredLeadsCount({
          searchQuery: debouncedSearchQuery || null,
          createdDate: selectedDate || null,
          statusMain: selectedStatus || null,
          statusSub: null,
          age: selectedAge || null,
          height: selectedHeight || null,
          weight: selectedWeight || null,
          fitnessGoal: selectedFitnessGoal || null,
          activityLevel: selectedActivityLevel || null,
          preferredTime: selectedPreferredTime || null,
          source: selectedSource || null,
        }),
      ]);

      console.log(`[useDashboardLogic] Received ${dbLeads.length} leads from service (total: ${totalCount})`);

      // Update total count in Redux
      dispatch(setTotalLeads(totalCount));
      console.log('[useDashboardLogic] Total leads count updated in Redux:', totalCount);

      // Transform to UI format (minimal - most work done in PostgreSQL)
      const uiLeads: Lead[] = dbLeads.map((lead, index) => {
        try {
          return mapLeadToUIFormat(lead);
        } catch (error) {
          console.error(`useDashboardLogic: Error mapping lead at index ${index}:`, error, lead);
          // Return a minimal valid lead object to prevent complete failure
          return {
            id: lead.id || `error-${index}`,
            name: lead.customer_name || 'Unknown',
            createdDate: lead.created_date_formatted || '',
            status: lead.status_sub || lead.status_main || '',
            phone: lead.customer_phone || '',
            email: lead.customer_email || '',
            source: lead.source || '',
            age: lead.age || 0,
            birthDate: lead.birth_date_formatted || '',
            height: lead.height || 0,
            weight: lead.weight || 0,
            fitnessGoal: lead.fitness_goal || '',
            activityLevel: lead.activity_level || '',
            preferredTime: lead.preferred_time || '',
            notes: lead.notes || undefined,
            dailyStepsGoal: 0,
            weeklyWorkouts: 0,
            dailySupplements: [],
            subscription: {
              joinDate: '',
              initialPackageMonths: 0,
              initialPrice: 0,
              monthlyRenewalPrice: 0,
              currentWeekInProgram: 0,
              timeInCurrentBudget: '',
            },
            workoutProgramsHistory: [],
            stepsHistory: [],
          } as Lead;
        }
      });
      console.log(`useDashboardLogic: Transformed to ${uiLeads.length} UI leads`);

      // Update Redux with fetched leads (source of truth)
      console.log(`[useDashboardLogic] Dispatching ${uiLeads.length} leads to Redux`);
      console.log(`[useDashboardLogic] First lead ID:`, uiLeads[0]?.id);
      console.log(`[useDashboardLogic] Last lead ID:`, uiLeads[uiLeads.length - 1]?.id);
      dispatch(setLeads(uiLeads));
      dispatch(setLoading(false));
      console.log(`[useDashboardLogic] Leads updated in Redux successfully, refreshLeads completed`);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      dispatch(setError(err.message || 'Failed to fetch leads'));
      dispatch(setLoading(false));
      // Don't clear leads on error - keep existing data to prevent blank page
      // This prevents the issue where leads disappear when returning to the page
    } finally {
      setIsRefreshing(false);
    }
  }, [
    debouncedSearchQuery, // Use debounced search
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    // Pagination dependencies
    currentPage,
    pageSize,
    // Sorting dependencies
    sortBy,
    sortOrder,
    // Grouping dependencies
    groupByKeys,
    dispatch,
  ]);

  // Fetch leads on mount and when filters/pagination/sorting/grouping change
  // Single useEffect to prevent duplicate calls
  // NOTE: refreshLeads is NOT in dependencies to prevent infinite loops
  // It's a useCallback with all necessary dependencies, so it will be recreated when needed
  useEffect(() => {
    console.log('useDashboardLogic: useEffect triggered, calling refreshLeads');
    // Always refresh leads when filters/pagination/sorting/grouping change or on mount
    refreshLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Filter dependencies (using debounced search)
    debouncedSearchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    // Pagination dependencies
    currentPage,
    pageSize,
    // Sorting dependencies
    sortBy,
    sortOrder,
    // Grouping dependencies - use JSON.stringify to ensure stable reference
    groupByKeys[0],
    groupByKeys[1],
  ]);


  // =====================================================
  // Filter Handlers (update Redux state, triggers refresh)
  // =====================================================
  const handleSearchChange = useCallback((value: string) => {
    dispatch(setSearchQuery(value));
  }, [dispatch]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    dispatch(setSelectedDate(date ? format(date, 'yyyy-MM-dd') : null));
  }, [dispatch]);

  const handleStatusChange = useCallback((value: string) => {
    dispatch(setSelectedStatus(value === 'all' ? null : value));
  }, [dispatch]);

  const handleAgeChange = useCallback((value: string) => {
    dispatch(setSelectedAge(value === 'all' ? null : value));
  }, [dispatch]);

  const handleHeightChange = useCallback((value: string) => {
    dispatch(setSelectedHeight(value === 'all' ? null : value));
  }, [dispatch]);

  const handleWeightChange = useCallback((value: string) => {
    dispatch(setSelectedWeight(value === 'all' ? null : value));
  }, [dispatch]);

  const handleFitnessGoalChange = useCallback((value: string) => {
    dispatch(setSelectedFitnessGoal(value === 'all' ? null : value));
  }, [dispatch]);

  const handleActivityLevelChange = useCallback((value: string) => {
    dispatch(setSelectedActivityLevel(value === 'all' ? null : value));
  }, [dispatch]);

  const handlePreferredTimeChange = useCallback((value: string) => {
    dispatch(setSelectedPreferredTime(value === 'all' ? null : value));
  }, [dispatch]);

  const handleSourceChange = useCallback((value: string) => {
    dispatch(setSelectedSource(value === 'all' ? null : value));
  }, [dispatch]);

  const handleToggleColumn = useCallback((column: keyof ColumnVisibilityType) => {
    dispatch(toggleColumnVisibility(column));
  }, [dispatch]);

  // =====================================================
  // Pagination Handlers (trigger server requests)
  // =====================================================
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage(page));
    // refreshLeads will be triggered by useEffect when currentPage changes
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize(newPageSize));
    // refreshLeads will be triggered by useEffect when pageSize changes
  }, [dispatch]);

  // =====================================================
  // Sorting Handlers (trigger server requests)
  // =====================================================
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'ASC' | 'DESC') => {
    dispatch(setSortBy(newSortBy));
    dispatch(setSortOrder(newSortOrder));
    // refreshLeads will be triggered by useEffect when sortBy/sortOrder changes
  }, [dispatch]);

  // =====================================================
  // Saved Views Logic
  // =====================================================

  // Reset filters when navigating to base resource (no view_id)
  useEffect(() => {
    if (!viewId) {
      dispatch(resetFilters());
      setHasAppliedView(false);
    }
  }, [viewId, dispatch]);

  // Apply saved view filter config when view is loaded
  useEffect(() => {
    if (viewId && savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as FilterConfig;

      // Apply all filters from the saved view
      if (filterConfig.searchQuery !== undefined) {
        dispatch(setSearchQuery(filterConfig.searchQuery));
      }
      if (filterConfig.selectedDate !== undefined) {
        dispatch(setSelectedDate(filterConfig.selectedDate));
      }
      if (filterConfig.selectedStatus !== undefined) {
        dispatch(setSelectedStatus(filterConfig.selectedStatus));
      }
      if (filterConfig.selectedAge !== undefined) {
        dispatch(setSelectedAge(filterConfig.selectedAge));
      }
      if (filterConfig.selectedHeight !== undefined) {
        dispatch(setSelectedHeight(filterConfig.selectedHeight));
      }
      if (filterConfig.selectedWeight !== undefined) {
        dispatch(setSelectedWeight(filterConfig.selectedWeight));
      }
      if (filterConfig.selectedFitnessGoal !== undefined) {
        dispatch(setSelectedFitnessGoal(filterConfig.selectedFitnessGoal));
      }
      if (filterConfig.selectedActivityLevel !== undefined) {
        dispatch(setSelectedActivityLevel(filterConfig.selectedActivityLevel));
      }
      if (filterConfig.selectedPreferredTime !== undefined) {
        dispatch(setSelectedPreferredTime(filterConfig.selectedPreferredTime));
      }
      if (filterConfig.selectedSource !== undefined) {
        dispatch(setSelectedSource(filterConfig.selectedSource));
      }
      if (filterConfig.columnVisibility) {
        dispatch(setColumnVisibility(filterConfig.columnVisibility));
      }

      setHasAppliedView(true);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId, dispatch]);

  // Get current filter config for saving views
  const getCurrentFilterConfig = useCallback((advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc'): FilterConfig => {
    return {
      searchQuery,
      selectedDate,
      selectedStatus,
      selectedAge,
      selectedHeight,
      selectedWeight,
      selectedFitnessGoal,
      selectedActivityLevel,
      selectedPreferredTime,
      selectedSource,
      columnVisibility,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  }, [
    searchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
  ]);

  // =====================================================
  // UI State (local to component)
  // =====================================================
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      console.log('[useDashboardLogic] Logout initiated');
      await dispatch(logoutUser()).unwrap();
      console.log('[useDashboardLogic] Logout successful, navigating to login');
      navigate('/login');
    } catch (error) {
      console.error('[useDashboardLogic] Logout error:', error);
      // Navigate to login even if logout fails
      navigate('/login');
    }
  }, [dispatch, navigate]);

  const handleAddLead = useCallback(() => {
    setIsAddLeadDialogOpen(true);
  }, []);

  // =====================================================
  // Memoized Values (React performance optimization)
  // =====================================================

  // Filtered leads = leads (no client-side filtering needed)
  // PostgreSQL already filtered them
  const filteredLeads = useMemo(() => leads, [leads]);

  // =====================================================
  // URL Params Sync - read URL params on mount/initial load only
  // One-way: URL -> Redux (only on initial load)
  // =====================================================
  const [hasReadUrlParams, setHasReadUrlParams] = useState(false);
  
  useEffect(() => {
    // Only read from URL params once on initial mount
    if (hasReadUrlParams) return;

    const params = new URLSearchParams(searchParams);

    // Read pagination from URL
    const urlPage = params.get('page');
    if (urlPage) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum !== currentPage) {
        dispatch(setCurrentPage(pageNum));
      }
    }

    const urlPageSize = params.get('pageSize');
    if (urlPageSize) {
      const pageSizeNum = parseInt(urlPageSize, 10);
      if (!isNaN(pageSizeNum) && (pageSizeNum === 50 || pageSizeNum === 100) && pageSizeNum !== pageSize) {
        dispatch(setPageSize(pageSizeNum));
      }
    }

    // Read search from URL
    const urlSearch = params.get('search');
    if (urlSearch !== null && urlSearch !== searchQuery) {
      dispatch(setSearchQuery(urlSearch));
    }

    // Read sorting from URL
    const urlSortBy = params.get('sortBy');
    if (urlSortBy && urlSortBy !== sortBy) {
      dispatch(setSortBy(urlSortBy));
    }

    const urlSortOrder = params.get('sortOrder') as 'ASC' | 'DESC' | null;
    if (urlSortOrder && (urlSortOrder === 'ASC' || urlSortOrder === 'DESC') && urlSortOrder !== sortOrder) {
      dispatch(setSortOrder(urlSortOrder));
    }

    setHasReadUrlParams(true);
  }, [hasReadUrlParams, searchParams, dispatch]); // Only depend on searchParams, not Redux state

  // Sync Redux state to URL on changes (one-way: Redux -> URL)
  // This effect should NOT depend on searchParams to avoid loops
  useEffect(() => {
    // Skip if we haven't read URL params yet (to avoid writing before reading)
    if (!hasReadUrlParams) return;

    const params = new URLSearchParams(window.location.search);
    let updated = false;

    // Update URL params from Redux state
    if (currentPage !== 1) {
      if (params.get('page') !== String(currentPage)) {
        params.set('page', String(currentPage));
        updated = true;
      }
    } else {
      if (params.has('page')) {
        params.delete('page');
        updated = true;
      }
    }

    if (pageSize !== 100) {
      if (params.get('pageSize') !== String(pageSize)) {
        params.set('pageSize', String(pageSize));
        updated = true;
      }
    } else {
      if (params.has('pageSize')) {
        params.delete('pageSize');
        updated = true;
      }
    }

    if (searchQuery) {
      if (params.get('search') !== searchQuery) {
        params.set('search', searchQuery);
        updated = true;
      }
    } else {
      if (params.has('search')) {
        params.delete('search');
        updated = true;
      }
    }

    if (sortBy !== 'createdDate') {
      if (params.get('sortBy') !== sortBy) {
        params.set('sortBy', sortBy);
        updated = true;
      }
    } else {
      if (params.has('sortBy')) {
        params.delete('sortBy');
        updated = true;
      }
    }

    if (sortOrder !== 'DESC') {
      if (params.get('sortOrder') !== sortOrder) {
        params.set('sortOrder', sortOrder);
        updated = true;
      }
    } else {
      if (params.has('sortOrder')) {
        params.delete('sortOrder');
        updated = true;
      }
    }

    // Preserve view_id if present
    if (viewId) {
      params.set('view_id', viewId);
    }

    if (updated) {
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentPage, pageSize, searchQuery, sortBy, sortOrder, viewId, hasReadUrlParams]); // Removed searchParams to prevent loop

  // =====================================================
  // Return API
  // =====================================================
  return {
    // Data
    filteredLeads,
    leads, // Raw leads (source of truth)
    searchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
    user,
    isLoading: isLoading || isRefreshing,
    error,
    savedView, // Expose savedView to avoid duplicate calls

    // Pagination state
    currentPage,
    pageSize,
    totalLeads,
    
    // Sorting state
    sortBy,
    sortOrder,

    // UI State
    isSettingsOpen,
    datePickerOpen,
    isAddLeadDialogOpen,
    isLoadingView,
    activeViewId: viewId,

    // Handlers
    handleSearchChange,
    handleDateSelect,
    handleStatusChange,
    handleAgeChange,
    handleHeightChange,
    handleWeightChange,
    handleFitnessGoalChange,
    handleActivityLevelChange,
    handlePreferredTimeChange,
    handleSourceChange,
    handleToggleColumn,
    // Pagination handlers
    handlePageChange,
    handlePageSizeChange,
    // Sorting handlers
    handleSortChange,
    handleLogout,
    handleAddLead,
    setIsSettingsOpen,
    setDatePickerOpen,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
    refreshLeads,
  };
};
