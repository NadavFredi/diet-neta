/**
 * CollectionsManagement UI Component
 * 
 * Displays all collections (גבייה) with customer and lead information.
 * Uses the same table structure and components as the PaymentsManagement page.
 * Pure presentation component - all logic is in CollectionsManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { CollectionsDataTable } from '@/components/dashboard/CollectionsDataTable';
import { Pagination } from '@/components/dashboard/Pagination';
import { collectionColumns } from '@/components/dashboard/columns/collectionColumns';
import { useCollectionsManagement } from './CollectionsManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateFilterFieldsFromColumns } from '@/utils/columnToFilterUtils';
import { selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';

const CollectionsManagement = () => {
  const dispatch = useAppDispatch();
  const sidebarWidth = useSidebarWidth();
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
  } = useCollectionsManagement();
  
  const { defaultView } = useDefaultView('collections');
  const { data: savedView } = useSavedView(viewId);
  
  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/collections?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  const handleEditViewClick = useCallback((view: any) => {
    setViewToEdit(view);
    setIsEditViewModalOpen(true);
  }, []);

  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'collections'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'collections'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'collections'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  
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
  
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'collections', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'collections', pageSize: newPageSize }));
  }, [dispatch]);

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
                />

                <div className="bg-white">
                  {isLoadingCollections ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600">טוען גבייות...</p>
                    </div>
                  ) : filteredCollections && Array.isArray(filteredCollections) && filteredCollections.length > 0 ? (
                    <>
                      <CollectionsDataTable 
                        collections={filteredCollections} 
                        onBulkDelete={handleBulkDelete}
                        groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                        groupPageSize={isGroupingActive ? groupPageSize : undefined}
                      />
                      {/* Pagination Footer */}
                      {filteredCollections && filteredCollections.length > 0 && (
                        <Pagination
                          currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                          pageSize={isGroupingActive ? groupPageSize : pageSize}
                          totalItems={isGroupingActive ? totalGroups : filteredCollections.length}
                          onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                          onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                          isLoading={isLoadingCollections}
                        />
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-lg font-medium mb-2">לא נמצאו גבייות</p>
                      <p className="text-sm">גבייות מתווספות בעת יצירת תשלומים או ידנית</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
      </div>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="collections"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={useMemo(() => generateFilterFieldsFromColumns(filteredCollections || [], collectionColumns), [filteredCollections])}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default CollectionsManagement;
