/**
 * SubscriptionTypesManagement UI Component
 * 
 * Pure presentation component - all logic is in SubscriptionTypesManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { SubscriptionTypesDataTable, subscriptionTypeColumns } from '@/components/dashboard/SubscriptionTypesDataTable';
import { useSubscriptionTypesManagement } from './SubscriptionTypesManagement';
import { AddSubscriptionTypeDialog } from '@/components/dashboard/dialogs/AddSubscriptionTypeDialog';
import { EditSubscriptionTypeDialog } from '@/components/dashboard/dialogs/EditSubscriptionTypeDialog';
import { DeleteSubscriptionTypeDialog } from '@/components/dashboard/dialogs/DeleteSubscriptionTypeDialog';
import { getSubscriptionTypeFilterFields } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const SubscriptionTypesManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('subscription_types');
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'subscription_types'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'subscription_types'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'subscription_types'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  const { data: savedView } = useSavedView(viewId);
  const { user } = useAppSelector((state) => state.auth);
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'subscription_types'));

  // Get subscription types data first before using it in useMemo
  const {
    subscriptionTypes,
    totalSubscriptionTypes,
    editingSubscriptionType,
    subscriptionTypeToDelete,
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
    handleAddSubscriptionType,
    handleEditSubscriptionType,
    handleSaveSubscriptionType,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteSubscriptionType,
  } = useSubscriptionTypesManagement();

  // Calculate total groups when grouping is active
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !subscriptionTypes || subscriptionTypes.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(subscriptionTypes, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, subscriptionTypes, groupByKeys]);

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
    dispatch(setCurrentPage({ resourceKey: 'subscription_types', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'subscription_types', pageSize: newPageSize }));
  }, [dispatch]);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/subscription-types?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Determine the title to show
  const pageTitle = viewId && savedView?.view_name
    ? savedView.view_name
    : 'כל סוגי המנויים';

  // Generate filter fields with all renderable columns
  const subscriptionTypeFilterFields = useMemo(() => {
    return getSubscriptionTypeFilterFields(subscriptionTypes || [], subscriptionTypeColumns);
  }, [subscriptionTypes]);


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
            resourceKey="subscription_types"
            title={pageTitle}
            dataCount={totalSubscriptionTypes}
            singularLabel="סוג מנוי"
            pluralLabel="סוגי מנויים"
            filterFields={useMemo(() => getSubscriptionTypeFilterFields(subscriptionTypes || [], subscriptionTypeColumns), [subscriptionTypes])}
            searchPlaceholder="חיפוש לפי שם..."
            addButtonLabel="הוסף סוג מנוי"
            onAddClick={handleAddSubscriptionType}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={subscriptionTypeColumns}
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
          ) : subscriptionTypes && subscriptionTypes.length > 0 ? (
            <>
              <div className="flex-1 min-h-0">
                <SubscriptionTypesDataTable
                  subscriptionTypes={subscriptionTypes}
                  onEdit={handleEditSubscriptionType}
                  onDelete={handleDeleteClick}
                  onBulkDelete={handleBulkDelete}
                  groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                  groupPageSize={isGroupingActive ? groupPageSize : undefined}
                />
              </div>
              {/* Pagination Footer - Always visible */}
              {subscriptionTypes && subscriptionTypes.length > 0 && (
                <div className="flex-shrink-0">
                  <Pagination
                    currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                    pageSize={isGroupingActive ? groupPageSize : pageSize}
                    totalItems={isGroupingActive ? totalGroups : totalSubscriptionTypes}
                    onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                    onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                {!isLoading && (
                  <p className="text-xs text-gray-400 mt-2">
                    {subscriptionTypes && subscriptionTypes.length > 0
                      ? `מספר סוגי מנויים: ${subscriptionTypes.length}`
                      : 'אין נתונים זמינים'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Add Subscription Type Dialog */}
      <AddSubscriptionTypeDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveSubscriptionType}
      />

      {/* Edit Subscription Type Dialog */}
      <EditSubscriptionTypeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingSubscriptionType={editingSubscriptionType}
        onSave={handleSaveSubscriptionType}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSubscriptionTypeDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        subscriptionTypeToDelete={subscriptionTypeToDelete}
        isDeleting={deleteSubscriptionType.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="subscription_types"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

    </>
  );
};

export default SubscriptionTypesManagement;
