/**
 * CollectionsManagement UI Component
 * 
 * Displays all collections (גבייה) with customer and lead information.
 * Uses the same table structure and components as the PaymentsManagement page.
 * Pure presentation component - all logic is in CollectionsManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { CollectionsDataTable } from '@/components/dashboard/CollectionsDataTable';
import { Pagination } from '@/components/dashboard/Pagination';
import { collectionColumns } from '@/components/dashboard/columns/collectionColumns';
import { useCollectionsManagement } from './CollectionsManagement';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateFilterFieldsFromColumns } from '@/utils/columnToFilterUtils';
import { selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { AddCollectionDialog } from '@/components/dashboard/dialogs/AddCollectionDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const CollectionsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const {
    collections,
    filteredCollections,
    isLoadingCollections,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    activeFilters,
    handleBulkDelete,
    totalCollections,
  } = useCollectionsManagement();

  const { defaultView } = useDefaultView('collections');
  const { data: savedView } = useSavedView(viewId);

  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = useState(false);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/collections?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);


  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'collections'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'collections'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'collections'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

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
    if (!isGroupingActive || !filteredCollections || filteredCollections.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredCollections, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredCollections, groupByKeys]);

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
    dispatch(setCurrentPage({ resourceKey: 'collections', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'collections', pageSize: newPageSize }));
  }, [dispatch]);

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
            resourceKey="collections"
            title={savedView?.view_name || 'כל הגבייות'}
            dataCount={filteredCollections?.length || 0}
            singularLabel="גבייה"
            pluralLabel="גבייות"
            filterFields={useMemo(() => generateFilterFieldsFromColumns(filteredCollections || [], collectionColumns), [filteredCollections])}
            searchPlaceholder="חיפוש לפי תיאור, לקוח או תאריך..."
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={collectionColumns}
            customActions={
              <Button
                onClick={() => setIsAddCollectionDialogOpen(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-1.5 sm:gap-2 flex-shrink-0 h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span>צור גביה</span>
              </Button>
            }
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoadingCollections ? (
            <div className="text-center py-12 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">טוען גבייות...</p>
              </div>
            </div>
          ) : filteredCollections && Array.isArray(filteredCollections) && filteredCollections.length > 0 ? (
            <div className="flex-1 min-h-0">
              <CollectionsDataTable
                collections={filteredCollections}
                onBulkDelete={handleBulkDelete}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו גבייות</p>
                <p className="text-sm">גבייות מתווספות בעת יצירת תשלומים או ידנית</p>
              </div>
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoadingCollections && filteredCollections && filteredCollections.length > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalCollections}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoadingCollections}
                singularLabel="גבייה"
                pluralLabel="גבייות"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="collections"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Add Collection Dialog */}
      <AddCollectionDialog
        isOpen={isAddCollectionDialogOpen}
        onOpenChange={setIsAddCollectionDialogOpen}
      />
    </>
  );
};

export default CollectionsManagement;
