/**
 * BudgetManagement UI Component
 * 
 * Pure presentation component - all logic is in BudgetManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { BudgetsDataTable } from '@/components/dashboard/BudgetsDataTable';
import { useBudgetManagement } from './BudgetManagement';
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
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'budgets'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'budgets'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'budgets'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'budgets'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  // Get budgets data first before using it in useMemo
  const {
    budgets,
    totalBudgets,
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
    sortBy,
    sortOrder,
    handleSortChange,
  } = useBudgetManagement();

  // Group pagination state (separate from record pagination)
  // Use the same pageSize as regular pagination for consistency, but allow it to be changed
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize); // Start with regular page size, but allow changes

  // Sync groupPageSize with pageSize when pageSize changes
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);

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

  const handleGroupPageSizeChange = useCallback((newPageSize: number) => {
    setGroupPageSize(newPageSize);
    setGroupCurrentPage(1); // Reset to first page when page size changes
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
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
        {/* Header Section - Always visible */}
        <div className="flex-shrink-0">
          <TableActionHeader
            resourceKey="budgets"
            title={pageTitle}
            dataCount={totalBudgets}
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
          ) : budgets && budgets.length > 0 ? (
            <div className="flex-1 min-h-0">
              <BudgetsDataTable
                budgets={budgets}
                onEdit={handleEditBudget}
                onDelete={handleDeleteClick}
                onExportPDF={handleExportPDF}
                onSendWhatsApp={handleSendWhatsApp}
                onBulkDelete={handleBulkDelete}
                onSortChange={handleSortChange}
                sortBy={sortBy || undefined}
                sortOrder={sortOrder || undefined}
                onViewDetails={(budget) => {
                  setViewingBudgetId(budget.id);
                  // Update URL to include budget_id for shareable link
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('budget_id', budget.id);
                  navigate(`/dashboard/budgets?${newParams.toString()}`, { replace: true });
                }}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
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
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoading && totalBudgets > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalBudgets}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoading}
                singularLabel="תקציב"
                pluralLabel="תקציבים"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

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
