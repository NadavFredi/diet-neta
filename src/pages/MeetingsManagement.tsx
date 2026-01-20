/**
 * MeetingsManagement UI Component
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { MeetingsDataTable } from '@/components/dashboard/MeetingsDataTable';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { meetingColumns } from '@/components/dashboard/columns/meetingColumns';
import { useMeetingsManagement } from './MeetingsManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { getMeetingFilterFields } from '@/hooks/useTableFilters';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';

const MeetingsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
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
  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);
  
  const {
    meetings,
    filteredMeetings,
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
                  resourceKey="meetings"
                  title={savedView?.view_name || 'כל הפגישות'}
                  dataCount={filteredMeetings?.length || 0}
                  singularLabel="פגישה"
                  pluralLabel="פגישות"
                  filterFields={useMemo(() => getMeetingFilterFields(meetings || [], meetingColumns), [meetings])}
                  searchPlaceholder="חיפוש לפי שם לקוח, טלפון, תאריך פגישה..."
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={meetingColumns}
                />

                <div className="bg-white">
                  {isLoadingMeetings ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600">טוען פגישות...</p>
                    </div>
                  ) : filteredMeetings && Array.isArray(filteredMeetings) && filteredMeetings.length > 0 ? (
                    <>
                      <MeetingsDataTable 
                        meetings={filteredMeetings} 
                        onBulkDelete={handleBulkDelete}
                        groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                        groupPageSize={isGroupingActive ? groupPageSize : undefined}
                      />
                      {/* Pagination Footer */}
                      {filteredMeetings && filteredMeetings.length > 0 && (
                        <Pagination
                          currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                          pageSize={isGroupingActive ? groupPageSize : pageSize}
                          totalItems={isGroupingActive ? totalGroups : filteredMeetings.length}
                          onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                          onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                          isLoading={isLoadingMeetings}
                        />
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-lg font-medium mb-2">לא נמצאו פגישות</p>
                      <p className="text-sm">פגישות מתווספות אוטומטית מטופס Fillout</p>
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
        resourceKey={saveViewResourceKey}
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={getMeetingFilterFields(meetings || [])}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default MeetingsManagement;
