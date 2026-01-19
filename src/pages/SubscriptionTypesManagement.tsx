/**
 * SubscriptionTypesManagement UI Component
 * 
 * Pure presentation component - all logic is in SubscriptionTypesManagement.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { useAppSelector } from '@/store/hooks';
import { SubscriptionTypesDataTable, subscriptionTypeColumns } from '@/components/dashboard/SubscriptionTypesDataTable';
import { useSubscriptionTypesManagement } from './SubscriptionTypesManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { AddSubscriptionTypeDialog } from '@/components/dashboard/dialogs/AddSubscriptionTypeDialog';
import { EditSubscriptionTypeDialog } from '@/components/dashboard/dialogs/EditSubscriptionTypeDialog';
import { DeleteSubscriptionTypeDialog } from '@/components/dashboard/dialogs/DeleteSubscriptionTypeDialog';
import { getSubscriptionTypeFilterFields } from '@/hooks/useTableFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { selectActiveFilters } from '@/store/slices/tableStateSlice';

const SubscriptionTypesManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('subscription_types');
  const { data: savedView } = useSavedView(viewId);
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'subscription_types'));

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/subscription-types?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Determine the title to show
  const pageTitle = viewId && savedView?.view_name 
    ? savedView.view_name 
    : 'כל סוגי המנויים';
  const {
    subscriptionTypes,
    editingSubscriptionType,
    subscriptionTypeToDelete,
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
    handleAddSubscriptionType,
    handleEditSubscriptionType,
    handleSaveSubscriptionType,
    handleDeleteClick,
    handleConfirmDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    deleteSubscriptionType,
  } = useSubscriptionTypesManagement();

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
          className="bg-gray-50 overflow-y-auto" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="p-6 w-full">
            {/* Show subscription types table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <TableActionHeader
                  resourceKey="subscription_types"
                  title={pageTitle}
                  dataCount={subscriptionTypes.length}
                  singularLabel="סוג מנוי"
                  pluralLabel="סוגי מנויים"
                  filterFields={getSubscriptionTypeFilterFields(subscriptionTypes)}
                  searchPlaceholder="חיפוש לפי שם..."
                  addButtonLabel="הוסף סוג מנוי"
                  onAddClick={handleAddSubscriptionType}
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableGroupBy={true}
                  enableSearch={true}
                  columns={subscriptionTypeColumns}
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p>טוען נתונים...</p>
                    </div>
                  ) : subscriptionTypes && subscriptionTypes.length > 0 ? (
                    <SubscriptionTypesDataTable
                      subscriptionTypes={subscriptionTypes}
                      onEdit={handleEditSubscriptionType}
                      onDelete={handleDeleteClick}
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-lg font-medium mb-2">לא נמצאו תוצאות</p>
                      <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                      {!isLoading && (
                        <p className="text-xs text-gray-400 mt-2">
                          {subscriptionTypes && subscriptionTypes.length > 0 
                            ? `מספר סוגי מנויים: ${subscriptionTypes.length}` 
                            : 'אין נתונים זמינים'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
          </div>
        </main>
      </div>

      {/* Add Subscription Type Dialog */}
      <AddSubscriptionTypeDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveSubscriptionType}
      />

      {/* Edit Subscription Type Dialog */}
      <EditSubscriptionTypeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingSubscriptionType={editingSubscriptionType}
        onSave={handleSaveSubscriptionType}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSubscriptionTypeDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        subscriptionTypeToDelete={subscriptionTypeToDelete}
        isDeleting={deleteSubscriptionType.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="subscription_types"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={getSubscriptionTypeFilterFields(subscriptionTypes)}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default SubscriptionTypesManagement;
