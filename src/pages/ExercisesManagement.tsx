/**
 * ExercisesManagement UI Component
 * 
 * Pure presentation component - all logic is in ExercisesManagement.ts
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { ExercisesDataTable } from '@/components/dashboard/ExercisesDataTable';
import { getExerciseFilterFields } from '@/hooks/useTableFilters';
import { AddExerciseDialog } from '@/components/dashboard/dialogs/AddExerciseDialog';
import { EditExerciseDialog } from '@/components/dashboard/dialogs/EditExerciseDialog';
import { DeleteExerciseDialog } from '@/components/dashboard/dialogs/DeleteExerciseDialog';
import { useExercisesManagement } from './ExercisesManagement';
import { exerciseColumns } from '@/components/dashboard/columns/exerciseColumns';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const ExercisesManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'exercises'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'exercises'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'exercises'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'exercises'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);

  const {
    exercises,
    totalExercises,
    savedView,
    editingExercise,
    exerciseToDelete,
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
    handleAddExercise,
    handleEditExercise,
    handleSaveExercise,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    handleCategoryUpdate,
    getCurrentFilterConfig,
    deleteExercise,
    sortBy,
    sortOrder,
    handleSortChange,
  } = useExercisesManagement();

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
    if (!isGroupingActive || !exercises || exercises.length === 0) {
      return 0;
    }

    // Group the data to count groups
    const groupedData = groupDataByKeys(exercises, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, exercises, groupByKeys]);

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
    dispatch(setCurrentPage({ resourceKey: 'exercises', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'exercises', pageSize: newPageSize }));
  }, [dispatch]);

  // Generate filter fields with all renderable columns
  const exerciseFilterFields = useMemo(() => {
    return getExerciseFilterFields(exercises || [], exerciseColumns);
  }, [exercises]);

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
            resourceKey="exercises"
            title={savedView?.view_name || 'תרגילים'}
            dataCount={totalExercises}
            singularLabel="תרגיל"
            pluralLabel="תרגילים"
            filterFields={exerciseFilterFields}
            searchPlaceholder="חיפוש לפי שם..."
            addButtonLabel="הוסף תרגיל"
            onAddClick={handleAddExercise}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={exerciseColumns}
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
              <ExercisesDataTable
                exercises={exercises}
                onEdit={handleEditExercise}
                onDelete={handleDeleteClick}
                onBulkDelete={handleBulkDelete}
                onSortChange={handleSortChange}
                sortBy={sortBy || undefined}
                sortOrder={sortOrder || undefined}
                onCategoryUpdate={handleCategoryUpdate}
              />
            </div>
          )}
          {/* Pagination Footer - Always visible when there's data */}
          {!isLoading && totalExercises > 0 && (
            <div className="flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalExercises}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showIfSinglePage={isGroupingActive}
                isLoading={isLoading}
                singularLabel="תרגיל"
                pluralLabel="תרגילים"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

      {/* Add Exercise Dialog */}
      <AddExerciseDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveExercise}
      />

      {/* Edit Exercise Dialog */}
      <EditExerciseDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingExercise={editingExercise}
        onSave={handleSaveExercise}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteExerciseDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        exerciseToDelete={exerciseToDelete}
        isDeleting={deleteExercise.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="exercises"
        filterConfig={getCurrentFilterConfig(activeFilters)}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />

    </>
  );
};

export default ExercisesManagement;
