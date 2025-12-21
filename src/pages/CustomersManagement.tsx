/**
 * CustomersManagement UI Component
 * 
 * Pure presentation component - all logic is in CustomersManagement.ts
 */

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { CustomersDataTable } from '@/components/dashboard/CustomersDataTable';
import { useAppSelector } from '@/store/hooks';
import { UserCircle } from 'lucide-react';
import { CUSTOMER_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { customerColumns } from '@/components/dashboard/columns/customerColumns';
import { useCustomersManagement } from './CustomersManagement';

const CustomersManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
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

  const filteredCustomers = customers; // For now, filtering happens in the hook

  return (
    <>
      <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
        <div style={{ gridColumn: '1 / -1' }}>
          <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
        </div>

        <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
          <DashboardSidebar onSaveViewClick={handleSaveViewClick} />
          
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <TableActionHeader
                  resourceKey="customers"
                  title={savedView?.view_name || 'ניהול לקוחות'}
                  icon={UserCircle}
                  dataCount={filteredCustomers.length}
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
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">טוען לקוחות...</p>
                    </div>
                  ) : (
                      <CustomersDataTable customers={customers} />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="customers"
        filterConfig={getCurrentFilterConfig()}
      />
    </>
  );
};

export default CustomersManagement;
