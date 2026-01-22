/**
 * PaymentsManagement UI Component
 * 
 * Displays all payments with customer and lead information.
 * Uses the same table structure and components as the Leads/Dashboard page.
 * Pure presentation component - all logic is in PaymentsManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { PaymentsDataTable } from '@/components/dashboard/PaymentsDataTable';
import { Pagination } from '@/components/dashboard/Pagination';
import { paymentColumns } from '@/components/dashboard/columns/paymentColumns';
import { usePaymentsManagement } from './PaymentsManagement';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaymentFilterFields } from '@/hooks/useTableFilters';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { AddPaymentDialog } from '@/components/dashboard/dialogs/AddPaymentDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const PaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const {
    payments,
    filteredPayments,
    isLoadingPayments,
    error,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    savedView,
    defaultView,
    searchQuery,
    handleSearchChange,
    addFilter,
    removeFilter,
    clearFilters,
    sortBy,
    sortOrder,
    handleSortChange,
    currentPage,
    pageSize,
    totalPayments,
    handlePageChange,
    handlePageSizeChange,
    filterGroup,
    setFilterGroup,
  } = usePaymentsManagement();

  // Generate filter fields with all renderable columns
  const paymentFilterFields = useMemo(() => {
    return getPaymentFilterFields(filteredPayments || [], paymentColumns);
  }, [filteredPayments]);

  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'payments'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'payments'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);

  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/payments?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);


  // Calculate total groups when grouping is active
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !filteredPayments || filteredPayments.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredPayments, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredPayments, groupByKeys]);

  // Reset group pagination when grouping changes
  useEffect(() => {
    if (isGroupingActive) {
      setGroupCurrentPage(1);
    }
  }, [isGroupingActive, groupByKeys]);

  const handleGroupPageChange = useCallback((page: number) => {
    setGroupCurrentPage(page);
  }, []);

  // Determine the title to show
  const pageTitle = viewId && savedView?.view_name
    ? savedView.view_name
    : 'כל התשלומים';

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
            resourceKey="payments"
            title={pageTitle}
            dataCount={totalPayments || 0}
            singularLabel="תשלום"
            pluralLabel="תשלומים"
            filterFields={paymentFilterFields}
            searchPlaceholder="חיפוש לפי מוצר, לקוח או תאריך..."
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={paymentColumns}
            legacySearchQuery={searchQuery}
            legacyOnSearchChange={handleSearchChange}
            legacyActiveFilters={activeFilters}
            legacyFilterGroup={filterGroup}
            legacyOnFilterAdd={addFilter}
            legacyOnFilterRemove={removeFilter}
            legacyOnFilterClear={clearFilters}
            legacyOnFilterGroupChange={setFilterGroup}
            customActions={
              <Button
                onClick={() => setIsAddPaymentDialogOpen(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-1.5 sm:gap-2 flex-shrink-0 h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span>צור תשלום</span>
              </Button>
            }
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoadingPayments ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p>טוען נתונים...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">שגיאה בטעינת התשלומים</p>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          ) : filteredPayments && Array.isArray(filteredPayments) && filteredPayments.length > 0 ? (
            <>
              <div className="flex-1 min-h-0">
                <PaymentsDataTable
                  payments={filteredPayments}
                  enableColumnVisibility={false}
                  onSortChange={handleSortChange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  totalCount={totalPayments}
                  groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                  groupPageSize={isGroupingActive ? groupPageSize : undefined}
                />
              </div>
              {/* Pagination Footer - Always visible */}
              {totalPayments > 0 && (
                <div className="flex-shrink-0">
                  <Pagination
                    currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                    pageSize={isGroupingActive ? groupPageSize : pageSize}
                    totalItems={isGroupingActive ? totalGroups : totalPayments}
                    onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                    onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                    isLoading={isLoadingPayments}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                {!isLoadingPayments && totalPayments === 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    מספר תשלומים: 0
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="payments"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />


      {/* Add Payment Dialog */}
      <AddPaymentDialog
        isOpen={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
      />
    </>
  );
};

export default PaymentsManagement;
