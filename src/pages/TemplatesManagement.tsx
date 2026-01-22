/**
 * TemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in TemplatesManagement.ts
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { WorkoutTemplatesDataTable } from '@/components/dashboard/WorkoutTemplatesDataTable';
import { getWorkoutTemplateFilterFields } from '@/hooks/useTableFilters';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { EditWorkoutTemplateDialog } from '@/components/dashboard/dialogs/EditWorkoutTemplateDialog';
import { DeleteWorkoutTemplateDialog } from '@/components/dashboard/dialogs/DeleteWorkoutTemplateDialog';
import { useTemplatesManagement } from './TemplatesManagement';
import { workoutTemplateColumns } from '@/components/dashboard/columns/templateColumns';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const TemplatesManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'templates'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'templates'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'templates'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'templates'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  // Group pagination state (separate from record pagination)
  // Use the same pageSize as regular pagination for consistency, but allow it to be changed
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize); // Start with regular page size, but allow changes
  
  // Sync groupPageSize with pageSize when pageSize changes
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);

  const {
    templates = [],
    totalTemplates,
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
    handleAddTemplate,
    handleEditTemplate,
    handleSaveTemplate,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteTemplate,
    sortBy,
    sortOrder,
    handleSortChange,
  } = useTemplatesManagement();
  
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

  const handleGroupPageSizeChange = useCallback((newPageSize: number) => {
    setGroupPageSize(newPageSize);
    setGroupCurrentPage(1); // Reset to first page when page size changes
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'templates', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'templates', pageSize: newPageSize }));
  }, [dispatch]);

  // Generate filter fields with all renderable columns
  const workoutTemplateFilterFields = useMemo(() => {
    return getWorkoutTemplateFilterFields(templates || [], workoutTemplateColumns);
  }, [templates]);


  // Early return if critical data is missing
  if (!user) {
    return null;
  }

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
            resourceKey="templates"
            title={savedView?.view_name || 'תכניות אימונים'}
            dataCount={totalTemplates || 0}
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
        </div>

        {/* Table Section - Scrollable area */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>טוען...</div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <WorkoutTemplatesDataTable
                templates={templates || []}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteClick}
                onBulkDelete={handleBulkDelete}
                onSortChange={handleSortChange}
                sortBy={sortBy || undefined}
                sortOrder={sortOrder || undefined}
              />
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoading && totalTemplates > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalTemplates}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoading}
                singularLabel="תוכנית"
                pluralLabel="תוכניות"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

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

    </>
  );
};

export default TemplatesManagement;
