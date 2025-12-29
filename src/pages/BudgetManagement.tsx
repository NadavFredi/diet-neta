/**
 * BudgetManagement UI Component
 * 
 * Pure presentation component - all logic is in BudgetManagement.ts
 */

import { useState, useCallback } from 'react';
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
import { useTableFilters } from '@/hooks/useTableFilters';

const BudgetManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const {
    budgets,
    savedView,
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
          className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <TableActionHeader
                  resourceKey="budgets"
                  title={savedView?.view_name || 'כל התקציבים'}
                  dataCount={budgets.length}
                  singularLabel="תקציב"
                  pluralLabel="תקציבים"
                  filterFields={[]}
                  searchPlaceholder="חיפוש לפי שם או תיאור..."
                  addButtonLabel="הוסף תקציב"
                  onAddClick={handleAddBudget}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableSearch={true}
                  legacySearchQuery={searchQuery}
                  legacyOnSearchChange={setSearchQuery}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <BudgetsDataTable
                      budgets={budgets}
                      columnVisibility={columnVisibility}
                      onEdit={handleEditBudget}
                      onDelete={handleDeleteClick}
                    />
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
        onConfirm={handleConfirmDelete}
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
    </>
  );
};

export default BudgetManagement;

