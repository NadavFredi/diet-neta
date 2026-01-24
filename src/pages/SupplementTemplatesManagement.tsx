import { useState, useCallback, useMemo, useEffect } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { SupplementTemplatesDataTable } from '@/components/dashboard/SupplementTemplatesDataTable';
import { getSupplementTemplateFilterFields } from '@/hooks/useTableFilters';
import { AddSupplementTemplateDialog } from '@/components/dashboard/dialogs/AddSupplementTemplateDialog';
import { EditSupplementTemplateDialog } from '@/components/dashboard/dialogs/EditSupplementTemplateDialog';
import { DeleteSupplementTemplateDialog } from '@/components/dashboard/dialogs/DeleteSupplementTemplateDialog';
import { useSupplementTemplatesManagement } from './SupplementTemplatesManagement';
import { supplementTemplateColumns } from '@/components/dashboard/columns/templateColumns';
import { selectActiveFilters, selectGroupByKeys, selectCurrentPage, selectPageSize, setCurrentPage, setPageSize } from '@/store/slices/tableStateSlice';
import { groupDataByKeys, getTotalGroupsCount } from '@/utils/groupDataByKey';
import { Pagination } from '@/components/dashboard/Pagination';

const SupplementTemplatesManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'supplement_templates'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'supplement_templates'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'supplement_templates'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'supplement_templates'));
  const isGroupingActive = !!(groupByKeys[0] || groupByKeys[1]);
  
  const {
    templates,
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
  } = useSupplementTemplatesManagement();
  
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(pageSize);
  
  useEffect(() => {
    setGroupPageSize(pageSize);
  }, [pageSize]);
  
  const totalGroups = useMemo(() => {
    if (!isGroupingActive || !templates || templates.length === 0) {
      return 0;
    }
    
    const groupedData = groupDataByKeys(templates, groupByKeys, { level1: null, level2: null });
    return getTotalGroupsCount(groupedData);
  }, [isGroupingActive, templates, groupByKeys]);
  
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
    setGroupCurrentPage(1);
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'supplement_templates', page }));
  }, [dispatch]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'supplement_templates', pageSize: newPageSize }));
  }, [dispatch]);

  const supplementTemplateFilterFields = useMemo(() => {
    return getSupplementTemplateFilterFields(templates || [], supplementTemplateColumns);
  }, [templates]);

  return (
    <>
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
        <div className="flex-shrink-0">
          <TableActionHeader
            resourceKey="supplement_templates"
            title={savedView?.view_name || 'תבניות תוספים'}
            dataCount={totalTemplates}
            singularLabel="תבנית"
            pluralLabel="תבניות"
            filterFields={supplementTemplateFilterFields}
            searchPlaceholder="חיפוש לפי שם או תיאור..."
            addButtonLabel="הוסף תבנית"
            onAddClick={handleAddTemplate}
            enableColumnVisibility={true}
            enableFilters={true}
            enableGroupBy={true}
            enableSearch={true}
            columns={supplementTemplateColumns}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
              <div>טוען...</div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <SupplementTemplatesDataTable
                templates={templates}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteClick}
                onBulkDelete={handleBulkDelete}
                onSortChange={handleSortChange}
                sortBy={sortBy || undefined}
                sortOrder={sortOrder || undefined}
              />
            </div>
          )}
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
                singularLabel="תבנית"
                pluralLabel="תבניות"
              />
            </div>
          )}
        </div>
      </TableManagementLayout>

      <AddSupplementTemplateDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveTemplate}
      />

      <EditSupplementTemplateDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingTemplate={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <DeleteSupplementTemplateDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        templateToDelete={templateToDelete}
        isDeleting={deleteTemplate.isPending}
        onConfirm={handleConfirmDelete}
      />

      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="supplement_templates"
        filterConfig={getCurrentFilterConfig(activeFilters)}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />
    </>
  );
};

export default SupplementTemplatesManagement;
