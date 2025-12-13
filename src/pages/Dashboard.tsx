import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LeadList } from '@/components/dashboard/LeadList';
import { AddLeadDialog } from '@/components/dashboard/AddLeadDialog';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { ColumnSettings } from '@/components/dashboard/ColumnSettings';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { he } from 'date-fns/locale';
import {
  formatDate,
  STATUS_OPTIONS,
  FITNESS_GOAL_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  SOURCE_OPTIONS,
} from '@/utils/dashboard';
import { useDashboardPage } from './Dashboard';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { defaultView } = useDefaultView('leads');
  const { data: savedView } = useSavedView(viewId);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  const {
    filteredLeads,
    searchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
    user,
    isSettingsOpen,
    datePickerOpen,
    isAddLeadDialogOpen,
    handleSearchChange,
    handleDateSelect,
    handleStatusChange,
    handleAgeChange,
    handleHeightChange,
    handleWeightChange,
    handleFitnessGoalChange,
    handleActivityLevelChange,
    handlePreferredTimeChange,
    handleSourceChange,
    handleToggleColumn,
    handleLogout,
    handleAddLead,
    setIsSettingsOpen,
    setDatePickerOpen,
    setIsAddLeadDialogOpen,
    getCurrentFilterConfig,
  } = useDashboardPage();

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [saveViewResourceKey, setSaveViewResourceKey] = useState<string>('leads');

  const handleSaveViewClick = (resourceKey: string) => {
    setSaveViewResourceKey(resourceKey);
    setIsSaveViewModalOpen(true);
  };

  // Unique values for filters
  const ageOptions = ['24', '26', '28', '29', '31', '32', '35', '39', '45', '52'];
  const heightOptions = ['160', '163', '165', '168', '170', '172', '175', '178', '182', '185'];
  const weightOptions = ['58', '62', '65', '68', '70', '78', '80', '85', '88', '92'];

  return (
    <>
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
      {/* Header - spans full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <DashboardHeader
          userEmail={user?.email}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content area with sidebar */}
      <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
        {/* Sidebar - fixed positioning */}
        <DashboardSidebar onSaveViewClick={handleSaveViewClick} />
        
        {/* Main content */}
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
          <div className="p-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between gap-4" dir="rtl">
                    <h2 className="text-3xl font-bold text-gray-900 whitespace-nowrap">
                      {savedView?.view_name || 'ניהול לידים'}
                    </h2>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="חיפוש לפי שם, טלפון, אימייל, סטטוס, מטרה, תוכנית או כל מידע אחר..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-64 h-11 text-base bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white focus:bg-white focus:border-blue-500 transition-colors"
                      />
                      <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="icon" 
                            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-gray-300 transition-all rounded-lg flex-shrink-0 w-11 h-11 bg-white shadow-sm"
                            title="הגדרות עמודות"
                            aria-label="הגדרות עמודות"
                          >
                            <Settings className="h-6 w-6 flex-shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 shadow-xl" align="end" dir="rtl">
                          <ColumnSettings
                            columnVisibility={columnVisibility}
                            onToggleColumn={handleToggleColumn}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        onClick={handleAddLead}
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 flex-shrink-0"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>הוסף ליד</span>
                      </Button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="grid grid-cols-9 gap-2">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          תאריך יצירה
                        </label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="bg-gray-50 text-gray-900 hover:bg-white border border-gray-200 shadow-sm transition-all hover:shadow-md h-10 text-sm px-3"
                            >
                              <CalendarIcon className="ml-1 h-3 w-3" />
                              {selectedDate ? formatDate(selectedDate) : 'בחר תאריך'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 shadow-xl" align="start" dir="rtl">
                            <Calendar
                              mode="single"
                              selected={selectedDate ? new Date(selectedDate) : undefined}
                              onSelect={handleDateSelect}
                              locale={he}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          סטטוס
                        </label>
                        <Select
                          value={selectedStatus || 'all'}
                          onValueChange={handleStatusChange}
                        >
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          גיל
                        </label>
                        <Select value={selectedAge || 'all'} onValueChange={handleAgeChange}>
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {ageOptions.map((age) => (
                              <SelectItem key={age} value={age}>
                                {age}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          גובה
                        </label>
                        <Select value={selectedHeight || 'all'} onValueChange={handleHeightChange}>
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {heightOptions.map((height) => (
                              <SelectItem key={height} value={height}>
                                {height} ס"מ
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          משקל
                        </label>
                        <Select value={selectedWeight || 'all'} onValueChange={handleWeightChange}>
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {weightOptions.map((weight) => (
                              <SelectItem key={weight} value={weight}>
                                {weight} ק"ג
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          מטרת כושר
                        </label>
                        <Select
                          value={selectedFitnessGoal || 'all'}
                          onValueChange={handleFitnessGoalChange}
                        >
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {FITNESS_GOAL_OPTIONS.map((goal) => (
                              <SelectItem key={goal} value={goal}>
                                {goal}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          רמת פעילות
                        </label>
                        <Select
                          value={selectedActivityLevel || 'all'}
                          onValueChange={handleActivityLevelChange}
                        >
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {ACTIVITY_LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          זמן מועדף
                        </label>
                        <Select
                          value={selectedPreferredTime || 'all'}
                          onValueChange={handlePreferredTimeChange}
                        >
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {PREFERRED_TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                          מקור
                        </label>
                        <Select value={selectedSource || 'all'} onValueChange={handleSourceChange}>
                          <SelectTrigger className="h-10 text-sm bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
                            <SelectValue placeholder="הכל" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="shadow-xl">
                            <SelectItem value="all">הכל</SelectItem>
                            {SOURCE_OPTIONS.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <p className="text-base text-gray-600 mt-2 font-medium">
                    {filteredLeads.length} {filteredLeads.length === 1 ? 'ליד' : 'לידים'} נמצאו
                  </p>
                </div>
                <LeadList leads={filteredLeads} columnVisibility={columnVisibility} />
              </div>
            </div>
          </main>
      </div>

    </div>

    {/* Add Lead Dialog */}
    <AddLeadDialog
      isOpen={isAddLeadDialogOpen}
      onOpenChange={setIsAddLeadDialogOpen}
    />

    {/* Save View Modal */}
    <SaveViewModal
      isOpen={isSaveViewModalOpen}
      onOpenChange={setIsSaveViewModalOpen}
      resourceKey={saveViewResourceKey}
      filterConfig={getCurrentFilterConfig()}
    />
    </>
  );
};

export default Dashboard;
