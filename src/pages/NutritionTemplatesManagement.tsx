/**
 * NutritionTemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in NutritionTemplatesManagement.ts
 */

import { useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { Flame } from 'lucide-react';
import { NutritionTemplatesDataTable } from '@/components/dashboard/NutritionTemplatesDataTable';
import { NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useTableFilters } from '@/hooks/useTableFilters';
import { AddNutritionTemplateDialog } from '@/components/dashboard/dialogs/AddNutritionTemplateDialog';
import { EditNutritionTemplateDialog } from '@/components/dashboard/dialogs/EditNutritionTemplateDialog';
import { DeleteNutritionTemplateDialog } from '@/components/dashboard/dialogs/DeleteNutritionTemplateDialog';
import { useNutritionTemplatesManagement } from './NutritionTemplatesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

const NutritionTemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
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
  } = useNutritionTemplatesManagement();

  // Filter system for modals
  const {
    filters: activeFilters,
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
                  icon={Flame}
                  dataCount={templates.length}
                  singularLabel="תבנית"
                  pluralLabel="תבניות"
                  filterFields={NUTRITION_TEMPLATE_FILTER_FIELDS}
                  searchPlaceholder="חיפוש לפי שם או תיאור..."
                  addButtonLabel="הוסף תבנית"
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
                    <NutritionTemplatesDataTable
                      templates={templates}
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
        filterFields={NUTRITION_TEMPLATE_FILTER_FIELDS}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default NutritionTemplatesManagement;
