/**
 * CustomersManagement UI Component
 * 
 * Pure presentation component - all logic is in CustomersManagement.ts
 */

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { TableFilter } from '@/components/dashboard/TableFilter';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { useAppSelector } from '@/store/hooks';
import { Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomersDataTable } from '@/components/dashboard/CustomersDataTable';
import { useTableFilters, CUSTOMER_FILTER_FIELDS } from '@/hooks/useTableFilters';
import { useCustomersManagement } from './CustomersManagement';

const CustomersManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const {
    customers,
    savedView,
    isLoadingCustomers,
    searchQuery,
    isSaveViewModalOpen,
    setSearchQuery,
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
  } = useCustomersManagement();

  // Modern filter system
  const {
    filters: activeFilters,
    addFilter,
    removeFilter,
    clearFilters,
  } = useTableFilters([]);

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
                <PageHeader
                  title={savedView?.view_name || 'ניהול לקוחות'}
                  icon={UserCircle}
                  actions={
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="חיפוש לפי שם, טלפון או אימייל..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 h-11 text-base bg-white text-gray-900 border border-indigo-200/60 shadow-sm hover:bg-white focus:bg-white focus:border-indigo-400 transition-colors"
                      />
                      <TableFilter
                        fields={CUSTOMER_FILTER_FIELDS}
                        activeFilters={activeFilters}
                        onFilterAdd={addFilter}
                        onFilterRemove={removeFilter}
                        onFilterClear={clearFilters}
                      />
                      <Button
                        onClick={handleSaveViewClick}
                        variant="outline"
                        className="h-11 text-sm"
                      >
                        <Settings className="h-4 w-4 ml-2" />
                        הגדרות
                      </Button>
                    </div>
                  }
                  filters={
                    <div className="space-y-3">
                      <FilterChips
                        filters={activeFilters}
                        onRemove={removeFilter}
                        onClearAll={clearFilters}
                      />
                      <p className="text-base text-gray-600 font-medium">
                        {filteredCustomers.length} {filteredCustomers.length === 1 ? 'לקוח' : 'לקוחות'} נמצאו
                      </p>
                    </div>
                  }
                />

                <div className="bg-white">
                  {isLoadingCustomers ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">טוען לקוחות...</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-6 py-4 text-base font-medium text-gray-700 border-b border-slate-200">
                        {customers.length} לקוח נמצאו
                      </div>
                      <CustomersDataTable customers={customers} />
                    </>
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
