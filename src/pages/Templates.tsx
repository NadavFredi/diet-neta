import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { AppFooter } from '@/components/layout/AppFooter';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useWorkoutTemplates, useDeleteWorkoutTemplate, type WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import { useAppSelector } from '@/store/hooks';
import { useCreateWorkoutTemplate, useUpdateWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const Templates = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useWorkoutTemplates({
    search: searchQuery || undefined,
  });
  const createTemplate = useCreateWorkoutTemplate();
  const updateTemplate = useUpdateWorkoutTemplate();
  const deleteTemplate = useDeleteWorkoutTemplate();

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        t.goal_tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [templates, searchQuery]);

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsAddDialogOpen(true);
  };

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = async (
    data: Partial<WorkoutTemplate> | { name: string; description: string; goal_tags: string[]; routine_data: any }
  ) => {
    try {
      if (editingTemplate) {
        // Update existing template
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
        // Create new template
        await createTemplate.mutateAsync({
          name: data.name,
          description: data.description,
          goal_tags: data.goal_tags || [],
          routine_data: data.routine_data,
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

  const handleDeleteClick = (template: WorkoutTemplate) => {
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

  const handleLogout = () => {
    // Logout logic handled by DashboardHeader
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
          <DashboardSidebar />
          
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
            <div className="container mx-auto px-6 py-8">
              {/* Page Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">ניהול תבניות אימונים</h1>
                  <p className="text-gray-600 mt-1">צור, ערוך ונהל תבניות אימונים לשימוש חוזר</p>
                </div>
                <Button onClick={handleAddTemplate} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף תבנית
                </Button>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="חפש תבניות לפי שם, תיאור או תגיות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Templates Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                        <TableHead className="text-right">שם התבנית</TableHead>
                        <TableHead className="text-right">תיאור</TableHead>
                        <TableHead className="text-right">תגיות</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">תאריך יצירה</TableHead>
                        <TableHead className="text-right">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell className="text-gray-600 max-w-md truncate">
                            {template.description || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {template.goal_tags.length > 0 ? (
                                template.goal_tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {template.is_public ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Eye className="h-3 w-3 ml-1" />
                                ציבורי
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                <EyeOff className="h-3 w-3 ml-1" />
                                פרטי
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {format(new Date(template.created_at), 'dd/MM/yyyy', { locale: he })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(template)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>יצירת תבנית אימונים חדשה</DialogTitle>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} dir="rtl">
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>עריכת תבנית אימונים</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
            {editingTemplate && (
              <WorkoutBuilderForm
                mode="template"
                initialData={{
                  routine_data: editingTemplate.routine_data,
                  description: editingTemplate.name,
                  generalGoals: editingTemplate.description || '',
                } as any}
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
    </>
  );
};

export default Templates;

