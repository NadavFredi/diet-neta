import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { AppFooter } from '@/components/layout/AppFooter';
import { Plus, Settings, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSavedView } from '@/hooks/useSavedViews';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateColumnSettings, type TemplateColumnVisibility, TEMPLATE_COLUMN_ORDER } from '@/components/dashboard/TemplateColumnSettings';
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
  useNutritionTemplates,
  useDeleteNutritionTemplate,
  useCreateNutritionTemplate,
  useUpdateNutritionTemplate,
  type NutritionTemplate,
} from '@/hooks/useNutritionTemplates';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { logout } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';

const NutritionTemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const [hasAppliedView, setHasAppliedView] = useState(false);
  
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getCurrentFilterConfig = () => {
    return {
      searchQuery,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
    };
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Reset filters when navigating to base resource (no view_id)
  useEffect(() => {
    if (!viewId) {
      setSearchQuery('');
      setSelectedDate(undefined);
      setHasAppliedView(false);
    }
  }, [viewId]);

  // Apply saved view filter config when view is loaded
  useEffect(() => {
    if (viewId && savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as any;
      
      // Apply all filters from the saved view
      if (filterConfig.searchQuery !== undefined) {
        setSearchQuery(filterConfig.searchQuery);
      }
      if (filterConfig.selectedDate !== undefined && filterConfig.selectedDate) {
        setSelectedDate(new Date(filterConfig.selectedDate));
      }
      
      setHasAppliedView(true);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NutritionTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NutritionTemplate | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<TemplateColumnVisibility>({
    name: true,
    description: true,
    tags: false, // Not applicable for nutrition templates
    connectedLeads: false, // Not applicable for nutrition templates
    createdDate: true,
    actions: true,
  });
  const { toast } = useToast();

  const handleToggleColumn = (key: keyof TemplateColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const { data: templates = [], isLoading } = useNutritionTemplates({
    search: undefined, // We'll do search client-side
  });
  const createTemplate = useCreateNutritionTemplate();
  const updateTemplate = useUpdateNutritionTemplate();
  const deleteTemplate = useDeleteNutritionTemplate();

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        const nameMatch = template.name?.toLowerCase().includes(searchLower);
        const descMatch = template.description?.toLowerCase().includes(searchLower);
        return nameMatch || descMatch;
      });
    }

    // Filter by date
    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((template) => {
        const templateDate = format(new Date(template.created_at), 'yyyy-MM-dd');
        return templateDate === selectedDateStr;
      });
    }

    return filtered;
  }, [templates, searchQuery, selectedDate]);

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsAddDialogOpen(true);
  };

  const handleEditTemplate = (template: NutritionTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = async (
    data: Partial<NutritionTemplate> | { name: string; description: string; targets: any }
  ) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplate.id,
          ...data,
        });
        toast({
          title: 'הצלחה',
          description: 'התבנית עודכנה בהצלחה',
        });
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
      } else {
        await createTemplate.mutateAsync({
          name: data.name,
          description: data.description,
          targets: data.targets,
          is_public: false,
        });
        toast({
          title: 'הצלחה',
          description: 'התבנית נוצרה בהצלחה',
        });
        setIsAddDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת התבנית',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (template: NutritionTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast({
        title: 'הצלחה',
        description: 'התבנית נמחקה בהצלחה',
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת התבנית',
        variant: 'destructive',
      });
    }
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
        {/* Header */}
        <div style={{ gridColumn: '1 / -1' }}>
          <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
        </div>

        {/* Main content area with sidebar */}
        <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
          <DashboardSidebar onSaveViewClick={handleSaveViewClick} />
          
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
            <div className="p-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between gap-4" dir="rtl">
                    <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">תבניות תזונה</h2>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="חיפוש לפי שם או תיאור..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white focus:bg-white focus:border-blue-500 transition-colors"
                        dir="rtl"
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
                          <TemplateColumnSettings
                            columnVisibility={columnVisibility}
                            onToggleColumn={handleToggleColumn}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        onClick={handleAddTemplate}
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 flex-shrink-0"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>הוסף תבנית</span>
                      </Button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-600 mb-1 text-right">
                          תאריך יצירה
                        </label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="bg-gray-50 text-gray-900 hover:bg-white border border-gray-200 shadow-sm transition-all hover:shadow-md h-9 text-xs px-2"
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
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    {filteredTemplates.length} {filteredTemplates.length === 1 ? 'תבנית' : 'תבניות'} נמצאו
                  </p>
                </div>

                {/* Templates Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {searchQuery ? 'לא נמצאו תבניות התואמות לחיפוש' : 'אין תבניות. צור תבנית חדשה כדי להתחיל'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columnVisibility.name && (
                            <TableHead className="text-right">שם התבנית</TableHead>
                          )}
                          {columnVisibility.description && (
                            <TableHead className="text-right">תיאור</TableHead>
                          )}
                          <TableHead className="text-right">מקרו-נוטריאנטים</TableHead>
                          {columnVisibility.createdDate && (
                            <TableHead className="text-right">תאריך יצירה</TableHead>
                          )}
                          {columnVisibility.actions && (
                            <TableHead className="text-right">פעולות</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow 
                            key={template.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleEditTemplate(template)}
                          >
                            {columnVisibility.name && (
                              <TableCell className="font-medium">{template.name}</TableCell>
                            )}
                            {columnVisibility.description && (
                              <TableCell className="text-gray-600 max-w-md truncate">
                                {template.description || '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {template.targets.calories} קק״ל
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.targets.protein}ג חלבון
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.targets.carbs}ג פחמימות
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.targets.fat}ג שומן
                                </Badge>
                              </div>
                            </TableCell>
                            {columnVisibility.createdDate && (
                              <TableCell className="text-gray-600">
                                {format(new Date(template.created_at), 'dd/MM/yyyy', { locale: he })}
                              </TableCell>
                            )}
                            {columnVisibility.actions && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTemplate(template);
                                    }}
                                    className="hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(template);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Footer */}
        <div style={{ gridColumn: '1 / -1' }}>
          <AppFooter />
        </div>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} dir="rtl">
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <DialogTitle className="text-lg">יצירת תבנית תזונה חדשה</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            <NutritionTemplateForm
              mode="template"
              onSave={handleSaveTemplate}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} dir="rtl">
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <DialogTitle className="text-lg">עריכת תבנית תזונה</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {editingTemplate && (
              <NutritionTemplateForm
                mode="template"
                initialData={editingTemplate}
                onSave={handleSaveTemplate}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setEditingTemplate(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} dir="rtl">
        <AlertDialogContent>
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
        resourceKey="nutrition_templates"
        filterConfig={getCurrentFilterConfig()}
        onSuccess={() => setIsSaveViewModalOpen(false)}
      />
    </>
  );
};

export default NutritionTemplatesManagement;

