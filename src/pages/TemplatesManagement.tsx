/**
 * TemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in TemplatesManagement.ts
 */

import { useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { Dumbbell } from 'lucide-react';
import { WorkoutTemplatesDataTable } from '@/components/dashboard/WorkoutTemplatesDataTable';
import { TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useTableFilters } from '@/hooks/useTableFilters';
import { AddWorkoutTemplateDialog } from '@/components/dashboard/dialogs/AddWorkoutTemplateDialog';
import { EditWorkoutTemplateDialog } from '@/components/dashboard/dialogs/EditWorkoutTemplateDialog';
import { DeleteWorkoutTemplateDialog } from '@/components/dashboard/dialogs/DeleteWorkoutTemplateDialog';
import { useTemplatesManagement } from './TemplatesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

const TemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
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
    columnVisibility,
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
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteTemplate,
  } = useTemplatesManagement();

  // Filter system for modals
  const {
    filters: activeFilters = [],
    addFilter,
    removeFilter,
    clearFilters,
  } = useTableFilters([]);

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
      <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
        <div style={{ gridColumn: '1 / -1' }}>
          <DashboardHeader 
            userEmail={user?.email} 
            onLogout={handleLogout}
            sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
          />
        </div>

        <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
          <main 
            className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out" 
            style={{ marginRight: `${sidebarWidth.width}px` }}
          >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <TableActionHeader
                  resourceKey="templates"
                  title={savedView?.view_name || 'תכניות אימונים'}
                  icon={Dumbbell}
                  dataCount={templates?.length || 0}
                  singularLabel="תוכנית"
                  pluralLabel="תוכניות"
                  filterFields={TEMPLATE_FILTER_FIELDS}
                  searchPlaceholder="חיפוש לפי שם, תיאור, שם ליד, טלפון או אימייל..."
                  addButtonLabel="הוסף תוכנית"
                  onAddClick={handleAddTemplate}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableSearch={true}
                  useTemplateColumnSettings={true}
                  templateColumnVisibility={columnVisibility}
                  onToggleTemplateColumn={handleToggleColumn}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <WorkoutTemplatesDataTable
                      templates={templates || []}
                      columnVisibility={columnVisibility}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteClick}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
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
          filterFields={TEMPLATE_FILTER_FIELDS}
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
