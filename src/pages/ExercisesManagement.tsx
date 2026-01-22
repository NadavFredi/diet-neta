/**
 * ExercisesManagement UI Component
 * 
 * Pure presentation component - all logic is in ExercisesManagement.ts
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { ExercisesDataTable } from '@/components/dashboard/ExercisesDataTable';
import { getExerciseFilterFields } from '@/hooks/useTableFilters';
import { AddExerciseDialog } from '@/components/dashboard/dialogs/AddExerciseDialog';
import { EditExerciseDialog } from '@/components/dashboard/dialogs/EditExerciseDialog';
import { DeleteExerciseDialog } from '@/components/dashboard/dialogs/DeleteExerciseDialog';
import { useExercisesManagement } from './ExercisesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { exerciseColumns } from '@/components/dashboard/columns/exerciseColumns';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const ExercisesManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'exercises'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'exercises'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'exercises'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'exercises'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  const {
    exercises,
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
    getCurrentFilterConfig,
    deleteExercise,
  } = useExercisesManagement();
  
  // Group pagination state (separate from record pagination)
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize] = useState(50);
  
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
      <DashboardHeader 
        userEmail={user?.email} 
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} />}
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
                  resourceKey="exercises"
                  title={savedView?.view_name || 'תרגילים'}
                  dataCount={exercises.length}
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
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <>
                      <ExercisesDataTable
                        exercises={exercises}
                        onEdit={handleEditExercise}
                        onDelete={handleDeleteClick}
                        onBulkDelete={handleBulkDelete}
                        groupCurrentPage={isGroupingActive ? groupCurrentPage : undefined}
                        groupPageSize={isGroupingActive ? groupPageSize : undefined}
                      />
                      {/* Pagination Footer */}
                      {exercises && exercises.length > 0 && (
                        <Pagination
                          currentPage={isGroupingActive ? groupCurrentPage : currentPage}
                          pageSize={isGroupingActive ? groupPageSize : pageSize}
                          totalItems={isGroupingActive ? totalGroups : exercises.length}
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
