/**
 * CustomersManagement UI Component
 * 
 * Pure presentation component - all logic is in CustomersManagement.ts
 */

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector } from '@/store/hooks';
import { Plus, Settings, Search, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomersDataTable } from '@/components/dashboard/CustomersDataTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useCustomersManagement } from './CustomersManagement';

const CustomersManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const {
    customers,
    savedView,
    isLoadingCustomers,
    searchQuery,
    selectedDate,
    datePickerOpen,
    isSaveViewModalOpen,
    setSearchQuery,
    handleDateSelect,
    setDatePickerOpen,
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
  } = useCustomersManagement();

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
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-11 text-sm bg-white border-gray-200 shadow-sm hover:bg-gray-50"
                          >
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            {selectedDate
                              ? format(selectedDate, 'dd/MM/yyyy', { locale: he })
                              : 'תאריך יצירה'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={he}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
