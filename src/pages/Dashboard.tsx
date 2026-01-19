import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LeadsDataTable } from '@/components/dashboard/LeadsDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { Pagination } from '@/components/dashboard/Pagination';
import { leadColumns } from '@/components/dashboard/columns/leadColumns';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useTableFilters, getLeadFilterFields, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useToast } from '@/hooks/use-toast';

// Custom hook to detect if screen is desktop (lg breakpoint = 1024px)
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};
import {
  setSelectedStatus,
  setSelectedFitnessGoal,
  setSelectedActivityLevel,
  setSelectedPreferredTime,
  setSelectedSource,
  setSelectedAge,
  setSelectedHeight,
  setSelectedWeight,
  setSelectedDate,
  setSearchQuery,
} from '@/store/slices/dashboardSlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  // Removed duplicate useDefaultView and useSavedView - they're already called in useDashboardLogic
  const sidebarWidth = useSidebarWidth();
  const isDesktop = useIsDesktop();
  const { user: authUser, isAuthenticated, isLoading: authIsLoading } = useAppSelector((state) => state.auth);

  // Safety check: Redirect trainees immediately
  useEffect(() => {
    if (authUser?.role === 'trainee') {
      window.location.href = '/client/dashboard';
      return;
    }
  }, [authUser, isAuthenticated, authIsLoading]);

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

  // Get filter fields with dynamic options from data
  const leadFilterFields = useMemo(() => {
    return getLeadFilterFields(filteredLeads || []);
  }, [filteredLeads]);

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


  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('leads');
  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);
  const { toast } = useToast();
  const hasShownSaveSuggestion = useRef(false);
  const previousFiltersRef = useRef<string>('');
  const lastAppliedViewIdRef = useRef<string | null>(null);
  const lastAppliedDefaultIdRef = useRef<string | null>(null);

  // Memoized handler to prevent unnecessary re-renders
  const handleSaveViewClick = useCallback((resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
    hasShownSaveSuggestion.current = false; // Reset when user opens save modal
  }, []);

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
      filters: activeFilters,
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
  }, [activeFilters, searchQuery, isLoading, viewId, toast, handleSaveViewClick]);

  const handleEditViewClick = useCallback((view: any) => {
    setViewToEdit(view);
    setIsEditViewModalOpen(true);
  }, []);

  return (
    <>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
      />

      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
        {/* Main content */}
        <main
          className="bg-gray-50 overflow-y-auto transition-all duration-300"
          style={{
            marginRight: isDesktop ? `${sidebarWidth.width}px` : 0,
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <div className="p-3 sm:p-4 md:p-6">
            {/* Unified Workspace Panel - Master Container */}
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
              {/* Header Section - Control Deck */}
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
                columns={leadColumns}
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

              {/* Table Section - Data Area */}
              <div className="bg-white">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>טוען נתונים...</p>
                  </div>
                ) : filteredLeads && Array.isArray(filteredLeads) && filteredLeads.length > 0 ? (
                  <>
                    <LeadsDataTable 
                      leads={filteredLeads} 
                      enableColumnVisibility={false}
                      onSortChange={handleSortChange}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                    {/* Pagination Footer */}
                    {totalLeads > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalLeads}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        isLoading={isLoading}
                      />
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                    <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                    {!isLoading && totalLeads === 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        מספר לידים: 0
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

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

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={
          viewToEdit?.resource_key === 'customers' ? CUSTOMER_FILTER_FIELDS :
            viewToEdit?.resource_key === 'templates' ? TEMPLATE_FILTER_FIELDS :
              viewToEdit?.resource_key === 'nutrition_templates' ? NUTRITION_TEMPLATE_FILTER_FIELDS :
                leadFilterFields
        }
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default Dashboard;
