/**
 * CustomersManagement UI Component
 * 
 * Pure presentation component - all logic is in CustomersManagement.ts
 */

import { useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { CustomersDataTable } from '@/components/dashboard/CustomersDataTable';
import { useAppSelector } from '@/store/hooks';
import { CUSTOMER_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useTableFilters } from '@/hooks/useTableFilters';
import { customerColumns } from '@/components/dashboard/columns/customerColumns';
import { useCustomersManagement } from './CustomersManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

const CustomersManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const {
    customers,
    savedView,
    isLoadingCustomers,
    isSaveViewModalOpen,
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
  } = useCustomersManagement();

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

  const filteredCustomers = customers; // For now, filtering happens in the hook

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
                  resourceKey="customers"
                  title={savedView?.view_name || 'ניהול לקוחות'}
                  dataCount={filteredCustomers?.length || 0}
                  singularLabel="לקוח"
                  pluralLabel="לקוחות"
                  filterFields={CUSTOMER_FILTER_FIELDS}
                  searchPlaceholder="חיפוש לפי שם, טלפון או אימייל..."
                  enableColumnVisibility={true}
                  enableFilters={true}
                  enableSearch={true}
                  columns={customerColumns}
                />

                <div className="bg-white">
                  {isLoadingCustomers ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600">טוען לקוחות...</p>
                    </div>
                  ) : filteredCustomers && Array.isArray(filteredCustomers) && filteredCustomers.length > 0 ? (
                    <CustomersDataTable customers={filteredCustomers} />
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-lg font-medium mb-2">לא נמצאו לקוחות</p>
                      <p className="text-sm">נסה לשנות את פרמטרי החיפוש</p>
                      {!isLoadingCustomers && (
                        <p className="text-xs text-gray-400 mt-2">
                          {filteredCustomers && Array.isArray(filteredCustomers) 
                            ? `מספר לקוחות: ${filteredCustomers.length}` 
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

      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="customers"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={CUSTOMER_FILTER_FIELDS}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default CustomersManagement;
