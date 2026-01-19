/**
 * TemplatesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import { 
  useWorkoutTemplates, 
  useDeleteWorkoutTemplate, 
  useCreateWorkoutTemplate, 
  useUpdateWorkoutTemplate, 
  type WorkoutTemplate 
} from '@/hooks/useWorkoutTemplates';
import { useTemplatesWithLeads } from '@/hooks/useTemplatesWithLeads';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { TemplateColumnVisibility } from '@/components/dashboard/TemplateColumnSettings';
import { selectActiveFilters, selectSearchQuery } from '@/store/slices/tableStateSlice';
import { applyTableFilters } from '@/utils/tableFilterUtils';
import { getWorkoutTemplateFilterFields } from '@/hooks/useTableFilters';

export const useTemplatesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

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

  const { defaultView, isLoading: isLoadingDefaultView } = useDefaultView('templates');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { data: templates = [], isLoading } = useWorkoutTemplates({
    search: undefined,
    goalTags: undefined,
  });
  const { data: templatesWithLeadsSet = new Set<string>() } = useTemplatesWithLeads();
  
  // Fetch templates with leads data for search
  const { data: templatesWithLeadsData } = useQuery({
    queryKey: ['templates-with-leads-data'],
    queryFn: async () => {
      try {
        // Fetch workout plans with template_id and lead_id
        const { data: plans, error: plansError } = await supabase
          .from('workout_plans')
          .select('template_id, lead_id')
          .not('template_id', 'is', null)
          .not('lead_id', 'is', null);

        if (plansError) {
          return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        }

        if (!plans || plans.length === 0) {
          return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        }

        // Get unique lead IDs
        const leadIds = [...new Set(plans.map((p: any) => p.lead_id).filter(Boolean))];

        if (leadIds.length === 0) {
          return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        }

        // Fetch leads with customer information
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select(`
            id,
            customer_id,
            customer:customers!inner (
              full_name,
              phone,
              email
            )
          `)
          .in('id', leadIds);

        if (leadsError) {
          return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        }

        // Create a map of lead_id to lead data
        const leadsMap = new Map(
          (leads || []).map((lead: any) => [lead.id, lead])
        );

        // Build template leads map
        const templateLeadsMap = new Map<string, Array<{ name: string; phone: string; email?: string }>>();
        plans.forEach((plan: any) => {
          if (plan.template_id && plan.lead_id) {
            const lead = leadsMap.get(plan.lead_id);
            if (lead && lead.customer) {
              const leadInfo = {
                name: lead.customer.full_name || 'ללא שם',
                phone: lead.customer.phone || '',
                email: lead.customer.email || undefined,
              };

              if (!templateLeadsMap.has(plan.template_id)) {
                templateLeadsMap.set(plan.template_id, []);
              }

              // Avoid duplicates
              const existing = templateLeadsMap.get(plan.template_id);
              if (existing && !existing.some((l) => l.name === leadInfo.name && l.phone === leadInfo.phone)) {
                existing.push(leadInfo);
              }
            }
          }
        });

        return templateLeadsMap;
      } catch (err) {
        return new Map<string, Array<{ name: string; phone: string; email?: string }>>();
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createTemplate = useCreateWorkoutTemplate();
  const updateTemplate = useUpdateWorkoutTemplate();
  const deleteTemplate = useDeleteWorkoutTemplate();

  useSyncSavedViewFilters('templates', savedView, isLoadingView);

  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'templates'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'templates'));

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && !isLoadingDefaultView && defaultView) {
      navigate(`/dashboard/templates?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, isLoadingDefaultView, defaultView, navigate]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      template.goal_tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        const nameMatch = template.name?.toLowerCase().includes(searchLower);
        const descMatch = template.description?.toLowerCase().includes(searchLower);
        
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

    const filterFields = getWorkoutTemplateFilterFields(templates);

    return applyTableFilters(
      filtered,
      activeFilters,
      filterFields,
      (template, fieldId) => {
        if (fieldId === 'goal_tags') return template.goal_tags || [];
        if (fieldId === 'is_public') return template.is_public;
        if (fieldId === 'has_leads') {
          return templatesWithLeadsSet.has(template.id) ? 'כן' : 'לא';
        }
        return (template as any)[fieldId];
      }
    );
  }, [templates, searchQuery, templatesWithLeadsSet, templatesWithLeadsData, activeFilters]);

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      // Navigate to login even if logout fails
      navigate('/login');
    }
  };

  const handleToggleColumn = (key: keyof TemplateColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery,
      columnVisibility: columnVisibility as unknown as Record<string, boolean>,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  return {
    // Data
    templates: filteredTemplates,
    allTags,
    savedView,
    editingTemplate,
    templateToDelete,
    isLoading: isLoading || isLoadingDefaultView,
    isLoadingView,
    
    // State
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    isSettingsOpen,
    columnVisibility,
    
    // Setters
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    setIsSettingsOpen,
    
    // Handlers
    handleLogout,
    handleToggleColumn,
    handleAddTemplate,
    handleEditTemplate,
    handleSaveTemplate,
    handleDeleteClick,
    handleConfirmDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteTemplate,
  };
};





