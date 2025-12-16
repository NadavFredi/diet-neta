/**
 * TemplatesManagement UI Component
 * 
 * Pure presentation component - all logic is in TemplatesManagement.ts
 */

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useAppSelector } from '@/store/hooks';
import { Plus, Dumbbell, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkoutTemplatesDataTable } from '@/components/dashboard/WorkoutTemplatesDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateColumnSettings } from '@/components/dashboard/TemplateColumnSettings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatDate } from '@/utils/dashboard';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTemplatesManagement } from './TemplatesManagement';

const TemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const {
    templates,
    allTags,
    savedView,
    editingTemplate,
    templateToDelete,
    isLoading,
    searchQuery,
    selectedTags,
    selectedDate,
    selectedHasLeads,
    datePickerOpen,
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    isSettingsOpen,
    columnVisibility,
    setSearchQuery,
    setSelectedTags,
    handleDateSelect,
    setDatePickerOpen,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    setIsSettingsOpen,
    setSelectedHasLeads,
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
  } = useTemplatesManagement();

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
                  title={savedView?.view_name || 'תכניות אימונים'}
                  icon={Dumbbell}
                  actions={
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="חיפוש לפי שם, תיאור, שם ליד, טלפון או אימייל..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 h-11 text-base bg-white text-gray-900 border border-indigo-200/60 shadow-sm hover:bg-white focus:bg-white focus:border-indigo-400 transition-colors"
                        dir="rtl"
                      />
                      <Button
                        onClick={handleAddTemplate}
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 flex-shrink-0"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>הוסף תוכנית</span>
                      </Button>
                    </div>
                  }
                  filters={
                    <div>
                      <div className="mb-3 flex items-center justify-end">
                        <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Columns className="h-4 w-4" />
                              <span>עמודות</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 shadow-xl" align="end" dir="rtl">
                            <TemplateColumnSettings
                              columnVisibility={columnVisibility}
                              onToggleColumn={handleToggleColumn}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                            תאריך יצירה
                          </label>
                          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="bg-white text-gray-900 hover:bg-gray-50 border border-indigo-200/60 shadow-sm transition-all hover:shadow-md h-10 text-sm px-3"
                              >
                                <CalendarIcon className="ml-1 h-3 w-3" />
                                {selectedDate ? formatDate(format(selectedDate, 'yyyy-MM-dd')) : 'בחר תאריך'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 shadow-xl" align="start" dir="rtl">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                locale={he}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                            תגיות
                          </label>
                          <Select
                            value={selectedTags.length > 0 ? selectedTags[0] : 'all'}
                            onValueChange={(value) => {
                              if (value === 'all') {
                                setSelectedTags([]);
                              } else {
                                setSelectedTags([value]);
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 text-sm bg-white text-gray-900 border border-indigo-200/60 shadow-sm hover:bg-gray-50 transition-all hover:shadow-md">
                              <SelectValue placeholder="הכל" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="shadow-xl">
                              <SelectItem value="all">הכל</SelectItem>
                              {allTags.map((tag) => (
                                <SelectItem key={tag} value={tag}>
                                  {tag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-gray-600 mb-1.5 text-right">
                            לידים מחוברים
                          </label>
                          <Select value={selectedHasLeads} onValueChange={setSelectedHasLeads}>
                            <SelectTrigger className="h-10 text-sm bg-white text-gray-900 border border-indigo-200/60 shadow-sm hover:bg-gray-50 transition-all hover:shadow-md">
                              <SelectValue placeholder="הכל" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="shadow-xl">
                              <SelectItem value="all">הכל</SelectItem>
                              <SelectItem value="has">יש לידים מחוברים</SelectItem>
                              <SelectItem value="none">אין לידים מחוברים</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-base text-gray-600 mt-3 font-medium">
                        {templates.length} {templates.length === 1 ? 'תוכנית' : 'תוכניות'} נמצאו
                      </p>
                    </div>
                  }
                />
                
                <div className="bg-white">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : (
                    <WorkoutTemplatesDataTable
                      templates={templates}
                      columnVisibility={columnVisibility}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteClick}
                      enableColumnVisibility={false}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>יצירת תוכנית אימונים חדשה</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
            <WorkoutBuilderForm
              mode="template"
              onSave={handleSaveTemplate}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>עריכת תוכנית אימונים</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
            {editingTemplate && (
              <WorkoutBuilderForm
                mode="template"
                initialData={{
                  routine_data: editingTemplate.routine_data,
                  description: editingTemplate.name,
                  generalGoals: editingTemplate.description || '',
                  goal_tags: editingTemplate.goal_tags || [],
                } as any}
                onSave={handleSaveTemplate}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תבנית</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התבנית "{templateToDelete?.name}"? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTemplate.isPending}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteTemplate.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTemplate.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="templates"
        filterConfig={getCurrentFilterConfig()}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />
    </>
  );
};

export default TemplatesManagement;
