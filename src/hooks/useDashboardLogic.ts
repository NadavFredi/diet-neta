/**
 * Dashboard Logic Hook
 * 
 * Architecture: All business logic for Dashboard page.
 * Uses PostgreSQL-optimized service layer.
 * No client-side filtering or calculations.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
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
} from '@/store/slices/dashboardSlice';
import { fetchFilteredLeads, mapLeadToUIFormat, type LeadFilterParams } from '@/services/leadService';
import type { Lead } from '@/store/slices/dashboardSlice';
import type { ColumnVisibility as ColumnVisibilityType } from '@/utils/dashboard';

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
  } = useAppSelector((state) => state.dashboard);

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
  // Fetch leads with filters (PostgreSQL does the filtering)
  // =====================================================
  const refreshLeads = useCallback(async () => {
    setIsRefreshing(true);
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      // Build filter params from Redux state
      const filterParams: LeadFilterParams = {
        searchQuery: searchQuery || null,
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
        limit: 1000, // Reasonable limit
        offset: 0,
      };

      // Fetch filtered leads from PostgreSQL (RPC function)
      console.log('useDashboardLogic: Calling fetchFilteredLeads with params:', filterParams);
      const dbLeads = await fetchFilteredLeads(filterParams);
      console.log(`useDashboardLogic: Received ${dbLeads.length} leads from service`);

      // Transform to UI format (minimal - most work done in PostgreSQL)
      const uiLeads: Lead[] = dbLeads.map(mapLeadToUIFormat);
      console.log(`useDashboardLogic: Transformed to ${uiLeads.length} UI leads`);

      // Update Redux with fetched leads (source of truth)
      console.log(`useDashboardLogic: Dispatching ${uiLeads.length} leads to Redux`);
      dispatch(setLeads(uiLeads));
      dispatch(setLoading(false));
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      dispatch(setError(err.message || 'Failed to fetch leads'));
      dispatch(setLoading(false));
      // Set empty array on error to prevent blank page
      dispatch(setLeads([]));
    } finally {
      setIsRefreshing(false);
    }
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
    dispatch,
  ]);

  // Fetch leads on mount and when filters change
  useEffect(() => {
    console.log('useDashboardLogic: useEffect triggered, calling refreshLeads');
    refreshLeads();
  }, [refreshLeads]);
  
  // Also fetch on initial mount regardless of refreshLeads dependency
  useEffect(() => {
    console.log('useDashboardLogic: Initial mount, fetching leads');
    refreshLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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
    handleLogout,
    handleAddLead,
    setIsSettingsOpen,
    setDatePickerOpen,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
    refreshLeads,
  };
};
