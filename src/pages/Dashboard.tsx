import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LeadsDataTable } from '@/components/dashboard/LeadsDataTable';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { Users } from 'lucide-react';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useTableFilters, LEAD_FILTER_FIELDS, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('leads');
  const { data: savedView } = useSavedView(viewId);

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
  } = useDashboardLogic();

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
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
      {/* Header - spans full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <DashboardHeader
          userEmail={user?.email}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content area with sidebar */}
      <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
        {/* Sidebar - fixed positioning */}
        <DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />
        
        {/* Main content */}
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
          <div className="p-6">
            {/* Unified Workspace Panel - Master Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header Section - Control Deck */}
              <TableActionHeader
                resourceKey="leads"
                title={savedView?.view_name || 'ניהול לידים'}
                icon={Users}
                dataCount={filteredLeads.length}
                singularLabel="ליד"
                pluralLabel="לידים"
                filterFields={LEAD_FILTER_FIELDS}
                searchPlaceholder="חיפוש לפי שם, טלפון, אימייל, סטטוס, מטרה, תוכנית או כל מידע אחר..."
                addButtonLabel="הוסף ליד"
                onAddClick={handleAddLead}
                enableColumnVisibility={true}
                enableFilters={true}
                enableSearch={true}
                legacySearchQuery={searchQuery}
                legacyOnSearchChange={handleSearchChange}
                legacyActiveFilters={activeFilters}
                legacyOnFilterAdd={addFilter}
                legacyOnFilterRemove={removeFilter}
                legacyOnFilterClear={clearFilters}
              />
              
              {/* Table Section - Data Area */}
              <div className="bg-white">
                <LeadsDataTable leads={filteredLeads} columnVisibility={columnVisibility} enableColumnVisibility={false} />
              </div>
            </div>
          </div>
        </main>
      </div>

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
