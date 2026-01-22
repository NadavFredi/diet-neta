/**
 * Dashboard Logic Hook - REFACTORED for Schema-Driven UI
 * 
 * Architecture:
 * - Uses 'useEntityQuery' to fetch data via Edge Functions (no direct DB/RPC calls).
 * - Adapts the schema-driven response to the UI format expected by components.
 * - Maintains Redux for UI state (filters, pagination, etc.).
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useDefaultView } from '@/hooks/useDefaultView';
import { logoutUser } from '@/store/slices/authSlice';
import {
  setLeads,
  setLoading,
  setError,
  setCurrentPage,
  setPageSize,
  setTotalLeads,
  setSortBy,
  setSortOrder,
} from '@/store/slices/dashboardSlice';
import { mapLeadToUIFormat } from '@/services/leadService';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import type { Lead } from '@/store/slices/dashboardSlice';
import {
  selectGroupByKeys,
  selectSearchQuery,
  selectColumnVisibility,
  selectActiveFilters,
  setAllColumnSizing,
  setAllColumnVisibility as setAllTableColumnVisibility,
  setColumnOrder as setTableColumnOrder,
  setSearchQuery as setTableSearchQuery,
} from '@/store/slices/tableStateSlice';
import { useEntityQuery } from '@/hooks/useEntityQuery';

export const useDashboardLogic = (options?: { filterGroup?: FilterGroup | null }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const [hasAppliedView, setHasAppliedView] = useState(false);

  // Redux state
  const {
    leads,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalLeads,
    sortBy,
    sortOrder,
  } = useAppSelector((state) => state.dashboard);

  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'leads'));
  const tableColumnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'leads'));
  const isTableStateInitialized = useAppSelector((state) => !!state.tableState.tables.leads);
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'leads'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'leads'));

  const { user } = useAppSelector((state) => state.auth);
  const { defaultView } = useDefaultView('leads');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Debounce search update
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  // =====================================================
  // Schema-Driven Data Fetching
  // =====================================================
  const {
    config: entityConfig, // Expose the config
    data: queryData,
    count: queryCount,
    isLoading: isQueryLoading,
    error: queryError,
    fetchData,
  } = useEntityQuery('leads');

  // Convert UI state to API filters
  const apiFilters = useMemo(() => {
    const filters: any[] = [];
    
    // Search
    if (debouncedSearchQuery) {
       filters.push({ field: 'customer_name', operator: 'ilike', value: `%${debouncedSearchQuery}%` });
    }

    // Filters from 'TableFilter' component (activeFilters in Redux)
    if (activeFilters) {
      activeFilters.forEach((f: any) => {
        let op = 'eq';
        // Basic mapping - expand as needed
        if (f.operator === 'contains') op = 'ilike';
        else if (f.operator === 'equals' || f.operator === 'is') op = 'eq';
        else if (f.operator === 'greaterThan') op = 'gt';
        else if (f.operator === 'lessThan') op = 'lt';
        else if (f.operator === 'isNot' || f.operator === 'notEquals') op = 'neq';
        else if (f.operator === 'in') op = 'in';

        let val = f.values[0];
        if (f.operator === 'contains') val = `%${val}%`;
        
        // Map fields
        let field = f.fieldId;
        if (field === 'status') field = 'status_main';
        if (field === 'name') field = 'customer_name';
        if (field === 'phone') field = 'customer_phone';

        filters.push({ field, operator: op, value: val });
      });
    }

    // Support for 'filterGroup' (advanced nested filters) if passed
    // NOTE: 'query-entity' currently only supports flat list. 
    // Advanced group filters would need flattening or backend support.
    
    return filters;
  }, [debouncedSearchQuery, activeFilters]);

  const refreshLeads = useCallback(() => {
    let sortField = sortBy;
    if (sortBy === 'createdDate') sortField = 'created_at';
    if (sortBy === 'name') sortField = 'customer_name';
    if (sortBy === 'status') sortField = 'status_main';

    fetchData({
      page: currentPage,
      pageSize: pageSize,
      sort: { field: sortField || 'created_at', direction: sortOrder === 'ASC' ? 'asc' : 'desc' },
      filters: apiFilters,
    });
  }, [fetchData, currentPage, pageSize, sortBy, sortOrder, apiFilters]);

  // Trigger fetch when params change
  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  // Sync Result to Redux
  useEffect(() => {
    if (isQueryLoading) {
      dispatch(setLoading(true));
      return;
    }
    if (queryError) {
      dispatch(setError(queryError));
      dispatch(setLoading(false));
      return;
    }

    if (queryData) {
      // Adapt Data
      const adaptedLeads: Lead[] = queryData.map((row: any) => {
        // Reconstruct nested budget/menu if view returns flattened fields
        const budgetAssignments = row.budget_name ? [{
          budgets: {
            name: row.budget_name,
            steps_goal: row.budget_steps_goal,
            is_public: row.budget_is_public,
            nutrition_templates: {
              name: row.menu_name,
              targets: {
                calories: row.menu_calories,
                protein: row.menu_protein
              }
            }
          }
        }] : [];

        // Base mapping
        const base = mapLeadToUIFormat(row);
        
        return {
          ...base,
          budget_assignments: budgetAssignments,
        };
      });

      dispatch(setLeads(adaptedLeads));
      dispatch(setTotalLeads(queryCount));
      dispatch(setLoading(false));
    }
  }, [queryData, queryCount, isQueryLoading, queryError, dispatch]);


  // =====================================================
  // Handlers
  // =====================================================
  const handleSearchChange = useCallback((value: string) => {
    dispatch(setTableSearchQuery({ resourceKey: 'leads', query: value }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage(page));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize(newPageSize));
  }, [dispatch]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'ASC' | 'DESC') => {
    dispatch(setSortBy(newSortBy));
    dispatch(setSortOrder(newSortOrder));
  }, [dispatch]);

  // =====================================================
  // Saved Views & UI State
  // =====================================================
  useEffect(() => {
    if (!viewId) setHasAppliedView(false);
  }, [viewId]);

  useEffect(() => {
    if (viewId && savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as FilterConfig;
      if (filterConfig.searchQuery !== undefined) {
        dispatch(setTableSearchQuery({ resourceKey: 'leads', query: filterConfig.searchQuery || '' }));
      }
      if (filterConfig.columnVisibility) {
        dispatch(setAllTableColumnVisibility({ resourceKey: 'leads', visibility: filterConfig.columnVisibility }));
      }
      if (filterConfig.columnOrder && Array.isArray(filterConfig.columnOrder)) {
        dispatch(setTableColumnOrder({ resourceKey: 'leads', order: filterConfig.columnOrder }));
      }
      if (filterConfig.columnWidths) {
        dispatch(setAllColumnSizing({ resourceKey: 'leads', sizing: filterConfig.columnWidths }));
      }
      setHasAppliedView(true);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId, dispatch]);

  const getCurrentFilterConfig = useCallback((advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc'): FilterConfig => {
    return {
      searchQuery,
      columnVisibility: tableColumnVisibility,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      filterGroup: options?.filterGroup || undefined,
      advancedFilters,
    };
  }, [searchQuery, tableColumnVisibility, options?.filterGroup]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  }, [dispatch, navigate]);

  const handleAddLead = useCallback(() => {
    setIsAddLeadDialogOpen(true);
  }, []);

  const filteredLeads = useMemo(() => leads, [leads]);

  // URL Params Sync (One-way: URL -> Redux on mount)
  const [hasReadUrlParams, setHasReadUrlParams] = useState(false);
  useEffect(() => {
    if (hasReadUrlParams || !isTableStateInitialized) return;
    const params = new URLSearchParams(searchParams);

    const urlPage = params.get('page');
    if (urlPage) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum !== currentPage) dispatch(setCurrentPage(pageNum));
    }
    const urlSearch = params.get('search');
    if (urlSearch !== null && urlSearch !== searchQuery) dispatch(setTableSearchQuery({ resourceKey: 'leads', query: urlSearch }));
    const urlSortBy = params.get('sortBy');
    if (urlSortBy && urlSortBy !== sortBy) dispatch(setSortBy(urlSortBy));
    
    setHasReadUrlParams(true);
  }, [hasReadUrlParams, searchParams, dispatch, isTableStateInitialized]);

  // URL Params Sync (Redux -> URL)
  useEffect(() => {
    if (!hasReadUrlParams) return;
    const params = new URLSearchParams(window.location.search);
    let updated = false;

    if (currentPage !== 1) { params.set('page', String(currentPage)); updated = true; } 
    else if (params.has('page')) { params.delete('page'); updated = true; }
    
    if (searchQuery) { params.set('search', searchQuery); updated = true; }
    else if (params.has('search')) { params.delete('search'); updated = true; }

    if (updated) {
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentPage, searchQuery, hasReadUrlParams]);

  return {
    filteredLeads,
    leads,
    searchQuery,
    columnVisibility: tableColumnVisibility,
    user,
    isLoading: isLoading || isQueryLoading,
    error,
    savedView,
    currentPage,
    pageSize,
    totalLeads,
    sortBy,
    sortOrder,
    isSettingsOpen,
    datePickerOpen,
    isAddLeadDialogOpen,
    isLoadingView,
    activeViewId: viewId,
    handleSearchChange,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleLogout,
    handleAddLead,
    setIsSettingsOpen,
    setDatePickerOpen,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
    refreshLeads,
    entityConfig,
  };
};
