import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LeadList } from '@/components/dashboard/LeadList';
import { useDashboardPage } from './Dashboard';

const Dashboard = () => {
  const {
    filteredLeads,
    searchQuery,
    selectedDate,
    selectedStatus,
    columnVisibility,
    user,
    isSettingsOpen,
    datePickerOpen,
    handleSearchChange,
    handleDateSelect,
    handleStatusChange,
    handleToggleColumn,
    handleLogout,
    setIsSettingsOpen,
    setDatePickerOpen,
  } = useDashboardPage();

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
      <DashboardHeader
        searchQuery={searchQuery}
        selectedDate={selectedDate}
        selectedStatus={selectedStatus}
        columnVisibility={columnVisibility}
        userEmail={user?.email}
        isSettingsOpen={isSettingsOpen}
        datePickerOpen={datePickerOpen}
        onSearchChange={handleSearchChange}
        onDateSelect={handleDateSelect}
        onStatusChange={handleStatusChange}
        onToggleColumn={handleToggleColumn}
        onLogout={handleLogout}
        onSettingsOpenChange={setIsSettingsOpen}
        onDatePickerOpenChange={setDatePickerOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <div className="p-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <LeadList leads={filteredLeads} columnVisibility={columnVisibility} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
