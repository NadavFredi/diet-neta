import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { LeadsDataTable } from '@/components/dashboard/LeadsDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { Pagination } from '@/components/dashboard/Pagination';
import { allLeadColumns } from '@/components/dashboard/columns/leadColumns';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useTableFilters, getLeadFilterFields, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { fetchLeadIdsByFilter } from '@/services/leadService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectGroupByKeys } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount, getAllGroupKeys } from '@/utils/groupDataByKey';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { setSearchQuery } from '@/store/slices/dashboardSlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  // Removed duplicate useDefaultView and useSavedView - they're already called in useDashboardLogic
  const { user: authUser, isAuthenticated, isLoading: authIsLoading } = useAppSelector((state) => state.auth);
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'leads'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);

  // Safety check: Redirect trainees immediately
  useEffect(() => {
    if (authUser?.role === 'trainee') {
      window.location.href = '/client/dashboard';
      return;
    }
  }, [authUser, isAuthenticated, authIsLoading]);

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('leads');
  const hasShownSaveSuggestion = useRef(false);
  const previousFiltersRef = useRef<string>('');
  const lastAppliedViewIdRef = useRef<string | null>(null);
  const lastAppliedDefaultIdRef = useRef<string | null>(null);

  const handleSaveViewClick = useCallback((resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
    hasShownSaveSuggestion.current = false; // Reset when user opens save modal
  }, []);

  // Auto-navigate to default view is handled in useDashboardLogic

  // Filter system for leads (advanced filter groups)
  const {
    filterGroup,
    filters: activeFilters,
    addFilter: addFilterLocal,
    removeFilter: removeFilterLocal,
    clearFilters: clearFiltersLocal,
    updateFilters: updateFiltersLocal,
    updateFilter: updateFilterLocal,
    setFilterGroup,
  } = useTableFilters([]);

  const {
    filteredLeads,
    searchQuery,
    columnVisibility,
    user,
    isAddLeadDialogOpen,
    handleSearchChange,
    handleLogout,
    handleAddLead,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
    isLoading,
    isLoadingView,
    savedView, // Get savedView from useDashboardLogic instead of duplicate call
    refreshLeads,
    // Pagination state and handlers
    currentPage,
    pageSize,
    totalLeads,
    handlePageChange,
    handlePageSizeChange,
    // Sorting handlers
    sortBy,
    sortOrder,
    handleSortChange,
  } = useDashboardLogic({ filterGroup });

  // Debug: Log filteredLeads when it changes
  useEffect(() => {
  }, [filteredLeads, isLoading]);

  // Get filter fields with dynamic options from data - now includes all renderable columns and related entities
  const leadFilterFields = useMemo(() => {
    return getLeadFilterFields(filteredLeads || [], allLeadColumns);
  }, [filteredLeads]);

  // Function to get all group keys for collapse/expand all
  const getAllGroupKeysFn = useCallback(() => {
    return getAllGroupKeys(filteredLeads || [], groupByKeys);
  }, [filteredLeads, groupByKeys]);

  // Calculate total groups when grouping is active (after filteredLeads is defined)
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !filteredLeads || filteredLeads.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredLeads, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredLeads, groupByKeys]);

  // Reset group pagination when grouping changes
  useEffect(() => {
    if (isGroupingActive) {
      setGroupCurrentPage(1);
    }
  }, [isGroupingActive, groupByKeys]);

  const handleGroupPageChange = useCallback((page: number) => {
    setGroupCurrentPage(page);
  }, []);

  const addFilter = useCallback((filter: ActiveFilter) => {
    addFilterLocal(filter);
  }, [addFilterLocal]);

  const removeFilter = useCallback((filterId: string) => {
    removeFilterLocal(filterId);
  }, [removeFilterLocal]);

  const updateFilter = useCallback((filter: ActiveFilter) => {
    updateFilterLocal(filter);
  }, [updateFilterLocal]);

  const clearFilters = useCallback(() => {
    clearFiltersLocal();
  }, [clearFiltersLocal]);

  const handleSearchChangeWithSource = useCallback((value: string) => {
    handleSearchChange(value);
  }, [handleSearchChange]);

  const { toast } = useToast();

  const handleBulkDelete = useCallback(
    async (payload: { ids: string[]; selectAllAcrossPages: boolean }) => {
      const idsToDelete = payload.selectAllAcrossPages
        ? await fetchLeadIdsByFilter({ searchQuery, filterGroup })
        : payload.ids;

      if (!idsToDelete.length) return;

      const chunkSize = 100;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error } = await supabase.from('leads').delete().in('id', chunk);
        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: 'הלידים נמחקו בהצלחה',
      });

      refreshLeads();
    },
    [searchQuery, filterGroup, toast, refreshLeads]
  );

  const handleBulkEdit = useCallback(
    async (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number; updates: Record<string, any> }) => {
      const idsToUpdate = payload.selectAllAcrossPages
        ? await fetchLeadIdsByFilter({ searchQuery, filterGroup })
        : payload.ids;

      if (!idsToUpdate.length || Object.keys(payload.updates).length === 0) return;

      const chunkSize = 100;
      for (let i = 0; i < idsToUpdate.length; i += chunkSize) {
        const chunk = idsToUpdate.slice(i, i + chunkSize);
        const { error } = await supabase.from('leads').update(payload.updates).in('id', chunk);
        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: `עודכנו ${idsToUpdate.length} לידים בהצלחה`,
      });

      refreshLeads();
    },
    [searchQuery, filterGroup, toast, refreshLeads]
  );

  // Get default view to load filters from it
  const { defaultView, isLoading: isLoadingDefaultView } = useDefaultView('leads');

  // Load advanced filters from saved view or default view
  useEffect(() => {
    const applyFilterConfig = (filterConfig: any) => {
      if (!filterConfig) return;

      if (filterConfig.filterGroup) {
        setFilterGroup(filterConfig.filterGroup);
      } else if (filterConfig.advancedFilters && Array.isArray(filterConfig.advancedFilters)) {
        const savedFilters: ActiveFilter[] = filterConfig.advancedFilters.map((f: any) => ({
          id: f.id,
          fieldId: f.fieldId,
          fieldLabel: f.fieldLabel,
          operator: f.operator as any,
          values: f.values,
          type: f.type as any,
        }));
        updateFiltersLocal(savedFilters);
      }

      if (filterConfig.searchQuery !== undefined) {
        dispatch(setSearchQuery(filterConfig.searchQuery));
      }

      previousFiltersRef.current = JSON.stringify({
        filters: filterConfig.filterGroup || filterConfig.advancedFilters || [],
        searchQuery: filterConfig.searchQuery || '',
      });
      hasShownSaveSuggestion.current = false;
    };

    if (viewId && savedView && !isLoadingView) {
      if (lastAppliedViewIdRef.current === savedView.id) {
        return;
      }
      applyFilterConfig(savedView.filter_config);
      lastAppliedViewIdRef.current = savedView.id;
      return;
    }

    if (!viewId && defaultView && !isLoadingDefaultView && !isLoadingView) {
      if (lastAppliedDefaultIdRef.current === defaultView.id) {
        return;
      }
      applyFilterConfig(defaultView.filter_config);
      lastAppliedDefaultIdRef.current = defaultView.id;
      return;
    }

    if (
      !viewId &&
      !isLoadingDefaultView &&
      !isLoadingView &&
      (!defaultView || !defaultView.filter_config?.advancedFilters || (defaultView.filter_config as any).advancedFilters?.length === 0)
    ) {
      if (previousFiltersRef.current === '') {
        clearFiltersLocal();
        previousFiltersRef.current = '';
        hasShownSaveSuggestion.current = false;
        lastAppliedDefaultIdRef.current = null;
      }
    }
  }, [viewId, savedView, isLoadingView, defaultView, isLoadingDefaultView, updateFiltersLocal, clearFiltersLocal, dispatch, setFilterGroup]);

  useEffect(() => {
    if (viewId) {
      lastAppliedDefaultIdRef.current = null;
    } else {
      lastAppliedViewIdRef.current = null;
    }
  }, [viewId]);

  // Show save suggestion when filters change
  useEffect(() => {
    // Skip if we're loading a saved view or if we've already shown the suggestion
    if (isLoading || hasShownSaveSuggestion.current || viewId) {
      return;
    }

    // Create a string representation of current filters for comparison
    const currentFiltersStr = JSON.stringify({
      filters: filterGroup,
      searchQuery,
    });

    // Only show suggestion if filters have changed and we have active filters
    if (
      previousFiltersRef.current !== currentFiltersStr &&
      previousFiltersRef.current !== '' && // Don't show on initial load
      (activeFilters.length > 0 || searchQuery)
    ) {
      hasShownSaveSuggestion.current = true;
      toast({
        title: 'שמור תצוגה',
        description: 'המסננים שלך שונו. האם תרצה לשמור את התצוגה הנוכחית?',
        action: (
          <button
            onClick={() => {
              handleSaveViewClick('leads');
            }}
            className="mr-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
          >
            שמור תצוגה
          </button>
        ),
        duration: 8000,
      });
    }

    previousFiltersRef.current = currentFiltersStr;
  }, [activeFilters, filterGroup, searchQuery, isLoading, viewId, toast, handleSaveViewClick]);

  return (
    <>
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
        {/* Header Section - Control Deck - Always visible */}
        <div className="flex-shrink-0">
          <TableActionHeader
            resourceKey="leads"
            title={savedView?.view_name || 'ניהול לידים'}
            dataCount={totalLeads || 0}
            singularLabel="ליד"
            pluralLabel="לידים"
            filterFields={leadFilterFields}
            searchPlaceholder="חיפוש לפי שם, טלפון, אימייל, סטטוס, מטרה, תוכנית או כל מידע אחר..."
            addButtonLabel="הוסף ליד"
            onAddClick={handleAddLead}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={allLeadColumns}
            getAllGroupKeys={getAllGroupKeysFn}
            legacySearchQuery={searchQuery}
            legacyOnSearchChange={handleSearchChangeWithSource}
            legacyActiveFilters={activeFilters}
            legacyFilterGroup={filterGroup}
            legacyOnFilterAdd={addFilter}
            legacyOnFilterUpdate={updateFilter}
            legacyOnFilterRemove={removeFilter}
            legacyOnFilterClear={clearFilters}
            legacyOnFilterGroupChange={setFilterGroup}
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p>טוען נתונים...</p>
              </div>
            </div>
          ) : filteredLeads && Array.isArray(filteredLeads) && filteredLeads.length > 0 ? (
            <div className="flex-1 min-h-0">
              <LeadsDataTable
                leads={filteredLeads}
                enableColumnVisibility={false}
                onSortChange={handleSortChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                totalCount={totalLeads}
                onBulkDelete={handleBulkDelete}
                onBulkEdit={handleBulkEdit}
                groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                groupPageSize={isGroupingActive ? groupPageSize : undefined}
                singularLabel="ליד"
                pluralLabel="לידים"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                {!isLoading && totalLeads === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    מספר לידים: 0
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoading && totalLeads > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                pageSize={isGroupingActive ? groupPageSize : pageSize}
                totalItems={isGroupingActive ? totalGroups : totalLeads}
                onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoading}
                singularLabel="ליד"
                pluralLabel="לידים"
              />
            </div>
          )}
        </div>

      </TableManagementLayout>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        onLeadCreated={refreshLeads}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey={saveViewResourceKey}
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />
    </>
  );
};

export default Dashboard;
