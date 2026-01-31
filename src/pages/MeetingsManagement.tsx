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
import { Plus, Table2, Calendar as CalendarIcon } from 'lucide-react';
import { MeetingsCalendarView } from '@/components/dashboard/MeetingsCalendarView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  // Use the same pageSize as regular pagination for consistency, but allow it to be changed
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize); // Start with regular page size, but allow changes

  // Sync groupPageSize with pageSize when pageSize changes
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);
  const { defaultView } = useDefaultView('meetings');
  const { data: savedView } = useSavedView(viewId);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('meetings');
  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [initialMeetingDate, setInitialMeetingDate] = useState<Date | null>(null);

  const {
    meetings,
    filteredMeetings,
    totalMeetings,
    isLoadingMeetings,
    handleLogout,
    getCurrentFilterConfig,
    activeFilters,
    handleBulkDelete,
    sortBy,
    sortOrder,
    handleSortChange,
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

  const handleGroupPageSizeChange = useCallback((newPageSize: number) => {
    setGroupPageSize(newPageSize);
    setGroupCurrentPage(1); // Reset to first page when page size changes
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
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {savedView?.view_name || 'כל הפגישות'}
            </h1>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => {
                  if (value === 'table' || value === 'calendar') {
                    setViewMode(value);
                  }
                }}
                className="border border-gray-200 rounded-lg p-1"
              >
                <ToggleGroupItem
                  value="table"
                  aria-label="תצוגת טבלה"
                  className="data-[state=on]:bg-[#5B6FB9] data-[state=on]:text-white"
                >
                  <Table2 className="h-4 w-4 ml-1" />
                  <span className="text-sm">טבלה</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="calendar"
                  aria-label="תצוגת לוח שנה"
                  className="data-[state=on]:bg-[#5B6FB9] data-[state=on]:text-white"
                >
                  <CalendarIcon className="h-4 w-4 ml-1" />
                  <span className="text-sm">לוח שנה</span>
                </ToggleGroupItem>
              </ToggleGroup>
              <Button
                onClick={() => setIsAddMeetingDialogOpen(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-1.5 sm:gap-2 flex-shrink-0 h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span>צור פגישה</span>
              </Button>
            </div>
          </div>
          <div className={viewMode === 'calendar' ? 'hidden' : ''}>
            <TableActionHeader
              resourceKey="meetings"
              title=""
              dataCount={totalMeetings || 0}
              singularLabel="פגישה"
              pluralLabel="פגישות"
              filterFields={meetingFilterFields}
              searchPlaceholder="חיפוש לפי שם לקוח, טלפון, תאריך פגישה..."
              enableColumnVisibility={true}
              enableFilters={true}
              enableGroupBy={true}
              enableSearch={true}
              columns={meetingColumns}
            />
          </div>
        </div>

        {/* Content Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoadingMeetings ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">טוען פגישות...</p>
              </div>
            </div>
          ) : filteredMeetings && Array.isArray(filteredMeetings) && filteredMeetings.length > 0 ? (
            <>
              {viewMode === 'table' ? (
                <div className="flex-1 min-h-0">
                  <MeetingsDataTable
                    meetings={filteredMeetings}
                    onBulkDelete={handleBulkDelete}
                    onSortChange={handleSortChange}
                    sortBy={sortBy || undefined}
                    sortOrder={sortOrder || undefined}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 p-4">
                  <MeetingsCalendarView
                    meetings={filteredMeetings}
                    onAddMeeting={(date) => {
                      setInitialMeetingDate(date);
                      setIsAddMeetingDialogOpen(true);
                    }}
                  />
                </div>
              )}
              {/* Pagination Footer - Only show for table view */}
              {viewMode === 'table' && !isLoadingMeetings && totalMeetings > 0 && (
                <div className="flex-shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalMeetings}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    showIfSinglePage={isGroupingActive}
                    isLoading={isLoadingMeetings}
                    singularLabel="פגישה"
                    pluralLabel="פגישות"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-2">לא נמצאו פגישות</p>
                <p className="text-sm">פגישות מתווספות אוטומטית מטופס Fillout</p>
              </div>
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
        onOpenChange={(open) => {
          setIsAddMeetingDialogOpen(open);
          if (!open) {
            setInitialMeetingDate(null);
          }
        }}
        initialDate={initialMeetingDate}
      />
    </>
  );
};

export default MeetingsManagement;
