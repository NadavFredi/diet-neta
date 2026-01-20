/**
 * NutritionTemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in NutritionTemplatesManagement.ts
 */

import { useState, useCallback, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { NutritionTemplatesDataTable } from '@/components/dashboard/NutritionTemplatesDataTable';
import { getNutritionTemplateFilterFields } from '@/hooks/useTableFilters';
import { AddNutritionTemplateDialog } from '@/components/dashboard/dialogs/AddNutritionTemplateDialog';
import { EditNutritionTemplateDialog } from '@/components/dashboard/dialogs/EditNutritionTemplateDialog';
import { DeleteNutritionTemplateDialog } from '@/components/dashboard/dialogs/DeleteNutritionTemplateDialog';
import { useNutritionTemplatesManagement } from './NutritionTemplatesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { nutritionTemplateColumns } from '@/components/dashboard/columns/templateColumns';
import { selectActiveFilters } from '@/store/slices/tableStateSlice';

const NutritionTemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'nutrition_templates'));
  
  const {
    templates,
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
  } = useNutritionTemplatesManagement();

  // Generate filter fields with all renderable columns
  const nutritionTemplateFilterFields = useMemo(() => {
    return getNutritionTemplateFilterFields(templates || [], nutritionTemplateColumns);
  }, [templates]);

  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

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
                  resourceKey="nutrition_templates"
                  title={savedView?.view_name || 'תבניות תזונה'}
                  dataCount={templates.length}
                  singularLabel="תבנית"
                  pluralLabel="תבניות"
                  filterFields={nutritionTemplateFilterFields}
                  searchPlaceholder="חיפוש לפי שם או תיאור..."
                  addButtonLabel="הוסף תבנית"
                  onAddClick={handleAddTemplate}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={nutritionTemplateColumns}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <NutritionTemplatesDataTable
                      templates={templates}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteClick}
                      onBulkDelete={handleBulkDelete}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
      </div>

      {/* Add Template Dialog */}
      <AddNutritionTemplateDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
              onSave={handleSaveTemplate}
            />

      {/* Edit Template Dialog */}
      <EditNutritionTemplateDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingTemplate={editingTemplate}
                onSave={handleSaveTemplate}
              />

      {/* Delete Confirmation Dialog */}
      <DeleteNutritionTemplateDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        templateToDelete={templateToDelete}
        isDeleting={deleteTemplate.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="nutrition_templates"
        filterConfig={getCurrentFilterConfig(activeFilters)}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={getNutritionTemplateFilterFields(templates, nutritionTemplateColumns)}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default NutritionTemplatesManagement;
