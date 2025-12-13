import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { AppFooter } from '@/components/layout/AppFooter';
import { Plus, Settings, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkoutTemplates, useDeleteWorkoutTemplate, useCreateWorkoutTemplate, useUpdateWorkoutTemplate, type WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatDate } from '@/utils/dashboard';
import { useToast } from '@/hooks/use-toast';
import { logout } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTemplateLeads } from '@/hooks/useTemplateLeads';
import { useTemplatesWithLeads } from '@/hooks/useTemplatesWithLeads';
import { Users, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Component to display connected leads for a template
const TemplateLeadsCell = ({ templateId }: { templateId: string }) => {
  const { data: leads = [], isLoading } = useTemplateLeads(templateId);
  const navigate = useNavigate();

  if (isLoading) {
    return <span className="text-gray-400 text-sm">טוען...</span>;
  }

  if (leads.length === 0) {
    return <span className="text-gray-400 text-sm">אין לידים מחוברים</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-blue-50 text-blue-600 hover:text-blue-700"
        >
          <Users className="h-4 w-4 ml-1" />
          <span>{leads.length} ליד{leads.length > 1 ? 'ים' : ''}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" dir="rtl">
        <div className="space-y-2">
          <div className="font-semibold text-sm mb-3 pb-2 border-b">
            לידים מחוברים לתוכנית זו
            <p className="text-xs font-normal text-gray-500 mt-1">
              שינוי התוכנית לא ישפיע על התוכניות הקיימות של הלידים
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {leads.map((lead) => (
              <div
                key={lead.plan_id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group"
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {lead.lead_name}
                  </div>
                  {lead.lead_email && (
                    <div className="text-xs text-gray-500 truncate">
                      {lead.lead_email}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    נוצר: {format(new Date(lead.plan_created_at), 'dd/MM/yyyy', { locale: he })}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mr-2" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TemplatesManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const [hasAppliedView, setHasAppliedView] = useState(false);
  const { defaultView, isLoading: isLoadingDefaultView } = useDefaultView('templates');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && !isLoadingDefaultView) {
      if (defaultView) {
        navigate(`/dashboard/templates?view_id=${defaultView.id}`, { replace: true });
      }
    }
  }, [viewId, defaultView, navigate, isLoadingDefaultView]);

  // Reset filters when navigating to base resource (no view_id) - but only if we're not loading default view
  useEffect(() => {
    if (!viewId && !isLoadingDefaultView && !defaultView) {
      setSearchQuery('');
      setSelectedTags([]);
      setSelectedDate(undefined);
      setSelectedHasLeads('all');
      setHasAppliedView(false);
    }
  }, [viewId, isLoadingDefaultView, defaultView]);

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
      if (filterConfig.selectedTags !== undefined) {
        setSelectedTags(filterConfig.selectedTags || []);
      }
      if (filterConfig.selectedHasLeads !== undefined) {
        setSelectedHasLeads(filterConfig.selectedHasLeads || 'all');
      }
      if (filterConfig.columnVisibility) {
        setColumnVisibility((prev) => ({
          ...prev,
          ...filterConfig.columnVisibility,
        }));
      }
      
      setHasAppliedView(true);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getCurrentFilterConfig = () => {
    return {
      searchQuery,
      selectedTags,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      selectedHasLeads,
    };
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHasLeads, setSelectedHasLeads] = useState<string>('all');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<TemplateColumnVisibility>({
    name: true,
    description: true,
    tags: true,
    connectedLeads: true,
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

  const { data: templates = [], isLoading } = useWorkoutTemplates({
    search: undefined, // We'll do search client-side to include lead data
    goalTags: selectedTags.length > 0 ? selectedTags : undefined,
  });
  const { data: templatesWithLeadsSet = new Set<string>() } = useTemplatesWithLeads();
  
  // Fetch all templates with their connected leads for search
  const { data: templatesWithLeadsData } = useQuery({
    queryKey: ['templates-with-leads-data'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('workout_plans')
          .select(`
            template_id,
            leads:lead_id (
              id,
              full_name,
              phone,
              email
            )
          `)
          .not('template_id', 'is', null)
          .not('lead_id', 'is', null);

        if (error) {
          console.error('Error fetching templates with leads data:', error);
          return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        }

        // Group by template_id and collect all leads
        const templateLeadsMap = new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        if (data) {
          data.forEach((plan: any) => {
            if (plan.template_id && plan.leads) {
              const leads = templateLeadsMap.get(plan.template_id) || [];
              leads.push({
                name: plan.leads.full_name || '',
                phone: plan.leads.phone || '',
                email: plan.leads.email || '',
              });
              templateLeadsMap.set(plan.template_id, leads);
            }
          });
        }

        return templateLeadsMap;
      } catch (err) {
        console.error('Error in templates with leads query:', err);
        return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createTemplate = useCreateWorkoutTemplate();
  const updateTemplate = useUpdateWorkoutTemplate();
  const deleteTemplate = useDeleteWorkoutTemplate();

  // Get all unique tags from templates
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      template.goal_tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query (including lead data)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        // Search in template name and description
        const nameMatch = template.name?.toLowerCase().includes(searchLower);
        const descMatch = template.description?.toLowerCase().includes(searchLower);
        
        // Search in connected leads data
        let leadMatch = false;
        if (templatesWithLeadsData) {
          const templateLeads = templatesWithLeadsData.get(template.id) || [];
          leadMatch = templateLeads.some((lead) => {
            return (
              lead.name?.toLowerCase().includes(searchLower) ||
              lead.phone?.includes(searchQuery) ||
              lead.email?.toLowerCase().includes(searchLower)
            );
          });
        }

        return nameMatch || descMatch || leadMatch;
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

    // Filter by connected leads
    if (selectedHasLeads === 'has') {
      filtered = filtered.filter((template) => templatesWithLeadsSet.has(template.id));
    } else if (selectedHasLeads === 'none') {
      filtered = filtered.filter((template) => !templatesWithLeadsSet.has(template.id));
    }

    return filtered;
  }, [templates, searchQuery, selectedDate, selectedHasLeads, templatesWithLeadsSet, templatesWithLeadsData]);

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
                    <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">תכניות אימונים</h2>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="חיפוש לפי שם, תיאור, שם ליד, טלפון או אימייל..."
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
                        <span>הוסף תוכנית</span>
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
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-600 mb-1 text-right">
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
                          <SelectTrigger className="h-9 text-xs bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
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
                        <label className="text-xs font-medium text-gray-600 mb-1 text-right">
                          לידים מחוברים
                        </label>
                        <Select
                          value={selectedHasLeads}
                          onValueChange={setSelectedHasLeads}
                        >
                          <SelectTrigger className="h-9 text-xs bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white transition-all hover:shadow-md">
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
                  </div>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    {filteredTemplates.length} {filteredTemplates.length === 1 ? 'תוכנית' : 'תוכניות'} נמצאו
                  </p>
                </div>

                {/* Templates Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  {(isLoading || isLoadingDefaultView) ? (
                    <div className="p-8 text-center text-gray-500">טוען...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {searchQuery ? 'לא נמצאו תוכניות התואמות לחיפוש' : 'אין תוכניות. צור תוכנית חדשה כדי להתחיל'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columnVisibility.name && (
                            <TableHead className="text-right">שם התוכנית</TableHead>
                          )}
                          {columnVisibility.description && (
                            <TableHead className="text-right">תיאור</TableHead>
                          )}
                          {columnVisibility.tags && (
                            <TableHead className="text-right">תגיות</TableHead>
                          )}
                          {columnVisibility.connectedLeads && (
                            <TableHead className="text-right">לידים מחוברים</TableHead>
                          )}
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
                            {columnVisibility.tags && (
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
                            )}
                            {columnVisibility.connectedLeads && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <TemplateLeadsCell templateId={template.id} />
                              </TableCell>
                            )}
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
                  setEditingTemplate(null);
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

