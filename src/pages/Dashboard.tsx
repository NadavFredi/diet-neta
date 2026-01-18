import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LeadsDataTable } from '@/components/dashboard/LeadsDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { leadColumns } from '@/components/dashboard/columns/leadColumns';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useTableFilters, getLeadFilterFields, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';

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
    console.log('[Dashboard] Auth state:', {
      isAuthenticated,
      authIsLoading,
      user: authUser,
      role: authUser?.role,
      email: authUser?.email
    });

    if (authUser?.role === 'trainee') {
      console.log('[Dashboard] Trainee detected, redirecting to /client/dashboard');
      window.location.href = '/client/dashboard';
      return;
    }
  }, [authUser, isAuthenticated, authIsLoading]);

  // Auto-navigate to default view is handled in useDashboardLogic

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
    savedView, // Get savedView from useDashboardLogic instead of duplicate call
    refreshLeads,
  } = useDashboardLogic();

  // Debug: Log filteredLeads when it changes
  useEffect(() => {
    console.log('Dashboard: filteredLeads changed:', {
      length: filteredLeads?.length || 0,
      isArray: Array.isArray(filteredLeads),
      isLoading,
      data: filteredLeads?.slice(0, 2), // First 2 items for debugging
      fullData: filteredLeads, // Full data for debugging
    });
    if (filteredLeads && filteredLeads.length > 0) {
      console.log('Dashboard: First lead sample:', filteredLeads[0]);
    }
  }, [filteredLeads, isLoading]);

  // Filter system - connect to Redux for leads
  const {
    filters: activeFilters,
    addFilter: addFilterLocal,
    removeFilter: removeFilterLocal,
    clearFilters: clearFiltersLocal,
  } = useTableFilters([]);

  // Get filter fields with dynamic options from data
  const leadFilterFields = useMemo(() => {
    return getLeadFilterFields(filteredLeads || []);
  }, [filteredLeads]);

  // Convert ActiveFilter to Redux actions for leads
  const addFilter = useCallback((filter: ActiveFilter) => {
    // Add to local state for UI
    addFilterLocal(filter);

    // Also update Redux state for data fetching
    const { fieldId, operator, values } = filter;

    if (fieldId === 'status' && operator === 'is' && values.length > 0) {
      // For multiselect, take first value for now (can be enhanced later)
      // The Redux state currently supports single value
      // TODO: Enhance to support multiple values
      dispatch(setSelectedStatus(values[0]));
    } else if (fieldId === 'fitnessGoal' && operator === 'is' && values.length > 0) {
      dispatch(setSelectedFitnessGoal(values[0]));
    } else if (fieldId === 'activityLevel' && operator === 'is' && values.length > 0) {
      dispatch(setSelectedActivityLevel(values[0]));
    } else if (fieldId === 'preferredTime' && operator === 'is' && values.length > 0) {
      dispatch(setSelectedPreferredTime(values[0]));
    } else if (fieldId === 'source' && operator === 'is' && values.length > 0) {
      dispatch(setSelectedSource(values[0]));
    } else if (fieldId === 'age' && operator === 'equals' && values[0]) {
      dispatch(setSelectedAge(values[0]));
    } else if (fieldId === 'height' && operator === 'equals' && values[0]) {
      dispatch(setSelectedHeight(values[0]));
    } else if (fieldId === 'weight' && operator === 'equals' && values[0]) {
      dispatch(setSelectedWeight(values[0]));
    } else if (fieldId === 'createdDate' && operator === 'equals' && values[0]) {
      dispatch(setSelectedDate(values[0]));
    }
  }, [addFilterLocal, dispatch]);

  const removeFilter = useCallback((filterId: string) => {
    // Remove from local state
    removeFilterLocal(filterId);

    // Find the filter to determine which Redux state to clear
    const filter = activeFilters.find(f => f.id === filterId);
    if (filter) {
      const { fieldId } = filter;

      if (fieldId === 'status') {
        dispatch(setSelectedStatus(null));
      } else if (fieldId === 'fitnessGoal') {
        dispatch(setSelectedFitnessGoal(null));
      } else if (fieldId === 'activityLevel') {
        dispatch(setSelectedActivityLevel(null));
      } else if (fieldId === 'preferredTime') {
        dispatch(setSelectedPreferredTime(null));
      } else if (fieldId === 'source') {
        dispatch(setSelectedSource(null));
      } else if (fieldId === 'age') {
        dispatch(setSelectedAge(null));
      } else if (fieldId === 'height') {
        dispatch(setSelectedHeight(null));
      } else if (fieldId === 'weight') {
        dispatch(setSelectedWeight(null));
      } else if (fieldId === 'createdDate') {
        dispatch(setSelectedDate(null));
      }
    }
  }, [removeFilterLocal, activeFilters, dispatch]);

  const clearFilters = useCallback(() => {
    // Clear local state
    clearFiltersLocal();

    // Clear all Redux filter state
    dispatch(setSelectedStatus(null));
    dispatch(setSelectedFitnessGoal(null));
    dispatch(setSelectedActivityLevel(null));
    dispatch(setSelectedPreferredTime(null));
    dispatch(setSelectedSource(null));
    dispatch(setSelectedAge(null));
    dispatch(setSelectedHeight(null));
    dispatch(setSelectedWeight(null));
    dispatch(setSelectedDate(null));
  }, [clearFiltersLocal, dispatch]);


  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('leads');
  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

  // Memoized handler to prevent unnecessary re-renders
  const handleSaveViewClick = useCallback((resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
  }, []);

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
                dataCount={filteredLeads?.length || 0}
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
                legacyOnSearchChange={handleSearchChange}
                legacyActiveFilters={activeFilters}
                legacyOnFilterAdd={addFilter}
                legacyOnFilterRemove={removeFilter}
                legacyOnFilterClear={clearFilters}
              />

              {/* Table Section - Data Area */}
              <div className="bg-white">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>טוען נתונים...</p>
                  </div>
                ) : filteredLeads && Array.isArray(filteredLeads) && filteredLeads.length > 0 ? (
                  <LeadsDataTable leads={filteredLeads} enableColumnVisibility={false} />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                    <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                    {!isLoading && (
                      <p className="text-xs text-gray-400 mt-2">
                        {filteredLeads && Array.isArray(filteredLeads)
                          ? `מספר לידים: ${filteredLeads.length}`
                          : 'אין נתונים זמינים'}
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
