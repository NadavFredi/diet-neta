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
import { useTableFilters, LEAD_FILTER_FIELDS, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('leads');
  const { data: savedView } = useSavedView(viewId);
  const sidebarWidth = useSidebarWidth();
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

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

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
  } = useDashboardLogic();
  
  // Debug: Log filteredLeads when it changes
  useEffect(() => {
    console.log('Dashboard: filteredLeads changed:', {
      length: filteredLeads?.length || 0,
      isArray: Array.isArray(filteredLeads),
      isLoading,
      data: filteredLeads?.slice(0, 2), // First 2 items for debugging
    });
  }, [filteredLeads, isLoading]);

  // Filter system for modals
  const {
    filters: activeFilters,
    addFilter,
    removeFilter,
    clearFilters,
  } = useTableFilters([]);


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

      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
        {/* Main content */}
        <main 
          className="bg-gray-50 overflow-y-auto" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="p-6">
            {/* Unified Workspace Panel - Master Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header Section - Control Deck */}
              <TableActionHeader
                resourceKey="leads"
                title={savedView?.view_name || 'ניהול לידים'}
                dataCount={filteredLeads?.length || 0}
                singularLabel="ליד"
                pluralLabel="לידים"
                filterFields={LEAD_FILTER_FIELDS}
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
                  <LeadsDataTable leads={filteredLeads} columnVisibility={columnVisibility} enableColumnVisibility={false} />
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
        LEAD_FILTER_FIELDS
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
