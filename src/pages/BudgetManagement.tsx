/**
 * BudgetManagement UI Component
 * 
 * Pure presentation component - all logic is in BudgetManagement.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { BudgetsDataTable } from '@/components/dashboard/BudgetsDataTable';
import { useBudgetManagement } from './BudgetManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { AddBudgetDialog } from '@/components/dashboard/dialogs/AddBudgetDialog';
import { EditBudgetDialog } from '@/components/dashboard/dialogs/EditBudgetDialog';
import { DeleteBudgetDialog } from '@/components/dashboard/dialogs/DeleteBudgetDialog';
import { SendBudgetModal } from '@/components/dashboard/SendBudgetModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { budgetColumns } from '@/components/dashboard/BudgetsDataTable';

const BudgetManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('budgets');
  const { data: savedView } = useSavedView(viewId);
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/budgets?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Determine the title to show
  const pageTitle = viewId && savedView?.view_name 
    ? savedView.view_name 
    : 'כל התקציבים';
  const {
    budgets,
    editingBudget,
    budgetToDelete,
    isLoading,
    searchQuery,
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    columnVisibility,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    setSearchQuery,
    handleLogout,
    handleToggleColumn,
    handleAddBudget,
    handleEditBudget,
    handleSaveBudget,
    handleDeleteClick,
    handleConfirmDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteBudget,
    handleExportPDF,
    handleSendWhatsApp,
    sendingBudget,
  } = useBudgetManagement();

  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

  // Filter system for modals
  const {
    filters: activeFilters,
    addFilter,
    removeFilter,
    clearFilters,
  } = useTableFilters([]);

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
        <main 
          className="bg-gray-50 overflow-y-auto" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="p-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <TableActionHeader
                resourceKey="budgets"
                title={pageTitle}
                dataCount={budgets.length}
                singularLabel="תקציב"
                pluralLabel="תקציבים"
                filterFields={[]}
                searchPlaceholder="חיפוש לפי שם או תיאור..."
                addButtonLabel="הוסף תקציב"
                onAddClick={handleAddBudget}
                enableColumnVisibility={true}
                enableFilters={true}
                enableGroupBy={true}
                enableSearch={true}
                legacySearchQuery={searchQuery}
                legacyOnSearchChange={setSearchQuery}
                columns={budgetColumns}
              />
              
              <div className="bg-white">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>טוען נתונים...</p>
                  </div>
                ) : budgets && budgets.length > 0 ? (
                  <BudgetsDataTable
                    budgets={budgets}
                    onEdit={handleEditBudget}
                    onDelete={handleDeleteClick}
                    onExportPDF={handleExportPDF}
                    onSendWhatsApp={handleSendWhatsApp}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                    <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                    {!isLoading && (
                      <p className="text-xs text-gray-400 mt-2">
                        {budgets && budgets.length > 0 
                          ? `מספר תקציבים: ${budgets.length}` 
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

      {/* Add Budget Dialog */}
      <AddBudgetDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveBudget}
      />

      {/* Edit Budget Dialog */}
      <EditBudgetDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingBudget={editingBudget}
        onSave={handleSaveBudget}
      />

      {/* Delete Confirmation Dialog */}
          <DeleteBudgetDialog
            isOpen={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            budgetToDelete={budgetToDelete}
            isDeleting={deleteBudget.isPending}
            onConfirm={(deletePlans) => handleConfirmDelete(deletePlans)}
          />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="budgets"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={[]}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />

      {/* Send Budget Modal */}
      <SendBudgetModal
        isOpen={!!sendingBudget}
        onOpenChange={(open) => {
          if (!open) {
            handleSendWhatsApp(null);
          }
        }}
        budget={sendingBudget}
      />
    </>
  );
};

export default BudgetManagement;

