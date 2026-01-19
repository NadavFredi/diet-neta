/**
 * MeetingsManagement UI Component
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { MeetingsDataTable } from '@/components/dashboard/MeetingsDataTable';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { meetingColumns } from '@/components/dashboard/columns/meetingColumns';
import { useMeetingsManagement } from './MeetingsManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { MEETING_FILTER_FIELDS, getMeetingFilterFields } from '@/hooks/useTableFilters';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';

const MeetingsManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
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
    searchQuery,
    activeFilters,
    handleSearchChange,
    addFilter,
    removeFilter,
    clearFilters,
  } = useMeetingsManagement();

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
                  filterFields={getMeetingFilterFields(meetings || [])}
                  searchPlaceholder="חיפוש לפי שם לקוח, טלפון, תאריך פגישה..."
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={meetingColumns}
                  legacySearchQuery={searchQuery}
                  legacyOnSearchChange={handleSearchChange}
                  legacyActiveFilters={activeFilters}
                  legacyOnFilterAdd={addFilter}
                  legacyOnFilterRemove={removeFilter}
                  legacyOnFilterClear={clearFilters}
                />

                <div className="bg-white">
                  {isLoadingMeetings ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600">טוען פגישות...</p>
                    </div>
                  ) : filteredMeetings && Array.isArray(filteredMeetings) && filteredMeetings.length > 0 ? (
                    <MeetingsDataTable meetings={filteredMeetings} />
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

