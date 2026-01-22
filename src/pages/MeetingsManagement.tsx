/**
 * MeetingsManagement UI Component
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { MeetingsDataTable } from '@/components/dashboard/MeetingsDataTable';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { meetingColumns } from '@/components/dashboard/columns/meetingColumns';
import { useMeetingsManagement } from './MeetingsManagement';
import { getMeetingFilterFields } from '@/hooks/useTableFilters';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { AddMeetingDialog } from '@/components/dashboard/dialogs/AddMeetingDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const MeetingsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'meetings'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'meetings'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'meetings'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  const { defaultView } = useDefaultView('meetings');
  const { data: savedView } = useSavedView(viewId);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('meetings');
  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false);
  
  const {
    meetings,
    filteredMeetings,
    totalMeetings,
    isLoadingMeetings,
    handleLogout,
    getCurrentFilterConfig,
    activeFilters,
    handleBulkDelete,
  } = useMeetingsManagement();
  
  // Generate filter fields with all renderable columns
  const meetingFilterFields = useMemo(() => {
    return getMeetingFilterFields(meetings || [], meetingColumns);
  }, [meetings]);
  
  // Calculate total groups when grouping is active (after filteredMeetings is defined)
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !filteredMeetings || filteredMeetings.length === 0) {
      return 0;
    }
    
    // Group the data to count groups
    const groupedData = groupDataByKeys(filteredMeetings, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, filteredMeetings, groupByKeys]);
  
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
    dispatch(setCurrentPage({ resourceKey: 'meetings', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'meetings', pageSize: newPageSize }));
  }, [dispatch]);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView && defaultView.id) {
      navigate(`/dashboard/meetings?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  const handleSaveViewClick = useCallback((resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
  }, []);

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
            resourceKey="meetings"
            title={savedView?.view_name || 'כל הפגישות'}
            dataCount={totalMeetings || 0}
            singularLabel="פגישה"
            pluralLabel="פגישות"
            filterFields={useMemo(() => getMeetingFilterFields(meetings || [], meetingColumns), [meetings])}
            searchPlaceholder="חיפוש לפי שם לקוח, טלפון, תאריך פגישה..."
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={meetingColumns}
            customActions={
              <Button
                onClick={() => setIsAddMeetingDialogOpen(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-1.5 sm:gap-2 flex-shrink-0 h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span>צור פגישה</span>
              </Button>
            }
          />
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoadingMeetings ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">טוען פגישות...</p>
              </div>
            </div>
          ) : filteredMeetings && Array.isArray(filteredMeetings) && filteredMeetings.length > 0 ? (
            <div className="flex-1 min-h-0">
              <MeetingsDataTable 
                meetings={filteredMeetings} 
                onBulkDelete={handleBulkDelete}
                groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                groupPageSize={isGroupingActive ? groupPageSize : undefined}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו פגישות</p>
                <p className="text-sm">פגישות מתווספות אוטומטית מטופס Fillout</p>
              </div>
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoadingMeetings && totalMeetings > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                pageSize={isGroupingActive ? groupPageSize : pageSize}
                totalItems={isGroupingActive ? totalGroups : totalMeetings}
                onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoadingMeetings}
                singularLabel="פגישה"
                pluralLabel="פגישות"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey={saveViewResourceKey}
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Add Meeting Dialog */}
      <AddMeetingDialog
        isOpen={isAddMeetingDialogOpen}
        onOpenChange={setIsAddMeetingDialogOpen}
      />
    </>
  );
};

export default MeetingsManagement;
