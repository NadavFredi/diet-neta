/**
 * BudgetManagement UI Component
 * 
 * Pure presentation component - all logic is in BudgetManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { BudgetsDataTable } from '@/components/dashboard/BudgetsDataTable';
import { useBudgetManagement } from './BudgetManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { AddBudgetDialog } from '@/components/dashboard/dialogs/AddBudgetDialog';
import { EditBudgetDialog } from '@/components/dashboard/dialogs/EditBudgetDialog';
import { DeleteBudgetDialog } from '@/components/dashboard/dialogs/DeleteBudgetDialog';
import { BudgetDetailsModal } from '@/components/dashboard/dialogs/BudgetDetailsModal';
import { SendBudgetModal } from '@/components/dashboard/SendBudgetModal';
import { getBudgetFilterFields } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { budgetColumns } from '@/components/dashboard/BudgetsDataTable';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const BudgetManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const budgetId = searchParams.get('budget_id');
  const { defaultView } = useDefaultView('budgets');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'budgets'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'budgets'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'budgets'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'budgets'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Get budgets data first before using it in useMemo
  const {
    budgets,
    editingBudget,
    budgetToDelete,
    isLoading,
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    handleLogout,
    handleToggleColumn,
    handleAddBudget,
    handleEditBudget,
    handleSaveBudget,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteBudget,
    handleExportPDF,
    handleSendWhatsApp,
    sendingBudget,
  } = useBudgetManagement();
  
  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  
  // Calculate total groups when grouping is active
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !budgets || budgets.length === 0) {
      return 0;
    }
    
    // Group the data to count groups
    const groupedData = groupDataByKeys(budgets, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, budgets, groupByKeys]);
  
  // Reset group pagination when grouping changes
  useEffect(() => {
    if (isGroupingActive) {
      setGroupCurrentPage(1);
    }
  }, [isGroupingActive, groupByKeys]);
  
  const handleGroupPageChange = useCallback((page: number) => {
    setGroupCurrentPage(page);
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'budgets', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'budgets', pageSize: newPageSize }));
  }, [dispatch]);

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

  // Generate filter fields with all renderable columns
  const budgetFilterFields = useMemo(() => {
    return getBudgetFilterFields(budgets || [], budgetColumns);
  }, [budgets]);

  const [viewingBudgetId, setViewingBudgetId] = useState<string | null>(null);

  // Open modal when budget_id is in URL
  useEffect(() => {
    if (budgetId) {
      setViewingBudgetId(budgetId);
    } else {
      setViewingBudgetId(null);
    }
  }, [budgetId]);

  return (
    <>
      <DashboardHeader 
        userEmail={user?.email} 
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} />}
      />
          
      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
        <main 
          className="bg-gray-50 overflow-y-auto transition-all duration-300" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <div className="pr-6">
            {/* Show budgets table */}
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <TableActionHeader
                  resourceKey="budgets"
                  title={pageTitle}
                  dataCount={budgets.length}
                  singularLabel="תקציב"
                  pluralLabel="תקציבים"
                  filterFields={budgetFilterFields}
                  searchPlaceholder="חיפוש לפי שם או תיאור..."
                  addButtonLabel="הוסף תקציב"
                  onAddClick={handleAddBudget}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={budgetColumns}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p>טוען נתונים...</p>
                    </div>
                  ) : budgets && budgets.length > 0 ? (
                    <>
                      <BudgetsDataTable
                        budgets={budgets}
                        onEdit={handleEditBudget}
                        onDelete={handleDeleteClick}
                        onExportPDF={handleExportPDF}
                        onSendWhatsApp={handleSendWhatsApp}
                        onBulkDelete={handleBulkDelete}
                        onViewDetails={(budget) => {
                          setViewingBudgetId(budget.id);
                          // Update URL to include budget_id for shareable link
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('budget_id', budget.id);
                          navigate(`/dashboard/budgets?${newParams.toString()}`, { replace: true });
                        }}
                        groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                        groupPageSize={isGroupingActive ? groupPageSize : undefined}
                      />
                      {/* Pagination Footer */}
                      {budgets && budgets.length > 0 && (
                        <Pagination
                          currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                          pageSize={isGroupingActive ? groupPageSize : pageSize}
                          totalItems={isGroupingActive ? totalGroups : budgets.length}
                          onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                          onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                          isLoading={isLoading}
                        />
                      )}
                    </>
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
        isOpen={isEditDialogOpen && !!editingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditDialogOpen(false);
          }
        }}
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

      {/* Budget Details Modal */}
      <BudgetDetailsModal
        isOpen={!!viewingBudgetId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingBudgetId(null);
            // Remove budget_id from URL when closing modal
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('budget_id');
            navigate(`/dashboard/budgets?${newParams.toString()}`, { replace: true });
          }
        }}
        budgetId={viewingBudgetId}
      />
    </>
  );
};

export default BudgetManagement;
