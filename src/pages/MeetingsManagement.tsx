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
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const handleSyncMeetings = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Get form ID from environment variable
      // The actual Fillout form ID (not the slug) - you can find it in the form editor URL
      // e.g., if the editor URL is build.fillout.com/editor/n5VwsjFk5ous, the form ID is n5VwsjFk5ous
      const formId = import.meta.env.VITE_FILLOUT_FORM_ID_MEETING || 'n5VwsjFk5ous';
      
      console.log('[MeetingsManagement] Syncing meetings with form ID:', formId);
      
      const { data, error } = await supabase.functions.invoke('sync-fillout-meetings', {
        body: { form_id: formId },
      });

      if (error) throw error;

      // Refresh meetings list
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });

      toast({
        title: 'הצלחה',
        description: data?.synced 
          ? `סונכרנו ${data.synced} פגישות חדשות` 
          : 'הסינכרון הושלם',
      });
    } catch (error: any) {
      console.error('[MeetingsManagement] Sync error:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בסינכרון פגישות. אנא נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast, queryClient]);

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
                  customActions={
                    <Button
                      onClick={handleSyncMeetings}
                      disabled={isSyncing}
                      size="sm"
                      className="gap-2 h-11 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'מסנכרן...' : 'סנכרן מ-Fillout'}
                    </Button>
                  }
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
                      <p className="text-sm mb-4">פגישות יוצרו מטופס Fillout</p>
                      <Button
                        onClick={handleSyncMeetings}
                        disabled={isSyncing}
                        className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'מסנכרן...' : 'סנכרן פגישות מ-Fillout'}
                      </Button>
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

