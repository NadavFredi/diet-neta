/**
 * TemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in TemplatesManagement.ts
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { WorkoutTemplatesDataTable } from '@/components/dashboard/WorkoutTemplatesDataTable';
import { getWorkoutTemplateFilterFields } from '@/hooks/useTableFilters';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { EditWorkoutTemplateDialog } from '@/components/dashboard/dialogs/EditWorkoutTemplateDialog';
import { DeleteWorkoutTemplateDialog } from '@/components/dashboard/dialogs/DeleteWorkoutTemplateDialog';
import { useTemplatesManagement } from './TemplatesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { workoutTemplateColumns } from '@/components/dashboard/columns/templateColumns';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const TemplatesManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'templates'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'templates'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'templates'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'templates'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  
  // Calculate total groups when grouping is active
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !templates || templates.length === 0) {
      return 0;
    }
    
    // Group the data to count groups
    const groupedData = groupDataByKeys(templates, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, templates, groupByKeys]);
  
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
    dispatch(setCurrentPage({ resourceKey: 'templates', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'templates', pageSize: newPageSize }));
  }, [dispatch]);

  const {
    templates = [],
    savedView,
    editingTemplate,
    templateToDelete,
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
    handleAddTemplate,
    handleEditTemplate,
    handleSaveTemplate,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteTemplate,
  } = useTemplatesManagement();

  // Generate filter fields with all renderable columns
  const workoutTemplateFilterFields = useMemo(() => {
    return getWorkoutTemplateFilterFields(templates || [], workoutTemplateColumns);
  }, [templates]);

  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

  const handleEditViewClick = useCallback((view: any) => {
    setViewToEdit(view);
    setIsEditViewModalOpen(true);
  }, []);

  // Early return if critical data is missing
  if (!user) {
    return null;
  }

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
                  resourceKey="templates"
                  title={savedView?.view_name || 'תכניות אימונים'}
                  dataCount={templates?.length || 0}
                  singularLabel="תוכנית"
                  pluralLabel="תוכניות"
                  filterFields={workoutTemplateFilterFields}
                  searchPlaceholder="חיפוש לפי שם, תיאור, שם ליד, טלפון או אימייל..."
                  addButtonLabel="הוסף תוכנית"
                  onAddClick={handleAddTemplate}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={workoutTemplateColumns}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <>
                      <WorkoutTemplatesDataTable
                        templates={templates || []}
                        onEdit={handleEditTemplate}
                        onDelete={handleDeleteClick}
                        onBulkDelete={handleBulkDelete}
                        groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                        groupPageSize={isGroupingActive ? groupPageSize : undefined}
                      />
                      {/* Pagination Footer */}
                      {templates && templates.length > 0 && (
                        <Pagination
                          currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                          pageSize={isGroupingActive ? groupPageSize : pageSize}
                          totalItems={isGroupingActive ? totalGroups : templates.length}
                          onPageChange={isGroupingActive ? handleGroupPageChange : handlePageChange}
                          onPageSizeChange={isGroupingActive ? undefined : handlePageSizeChange}
                          isLoading={isLoading}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>
      </div>

      {/* Add Template Dialog */}
      <AddWorkoutTemplateDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
              onSave={handleSaveTemplate}
            />

      {/* Edit Template Dialog */}
      <EditWorkoutTemplateDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingTemplate={editingTemplate}
                onSave={handleSaveTemplate}
              />

      {/* Delete Confirmation Dialog */}
      <DeleteWorkoutTemplateDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        templateToDelete={templateToDelete}
        isDeleting={deleteTemplate.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Save View Modal */}
      {getCurrentFilterConfig && (
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="templates"
          filterConfig={getCurrentFilterConfig(activeFilters)}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />
      )}

      {/* Edit View Modal */}
      {getCurrentFilterConfig && (
        <EditViewModal
          isOpen={isEditViewModalOpen}
          onOpenChange={setIsEditViewModalOpen}
          view={viewToEdit}
          currentFilterConfig={getCurrentFilterConfig(activeFilters)}
          filterFields={getWorkoutTemplateFilterFields(templates || [])}
          onSuccess={() => {
            setIsEditViewModalOpen(false);
            setViewToEdit(null);
          }}
        />
      )}
    </>
  );
};

export default TemplatesManagement;
