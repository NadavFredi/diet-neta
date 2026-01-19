/**
 * NutritionTemplatesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  useNutritionTemplates,
  useDeleteNutritionTemplate,
  useCreateNutritionTemplate,
  useUpdateNutritionTemplate,
  type NutritionTemplate,
} from '@/hooks/useNutritionTemplates';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { TemplateColumnVisibility } from '@/components/dashboard/TemplateColumnSettings';
import { selectActiveFilters, selectSearchQuery } from '@/store/slices/tableStateSlice';
import { applyTableFilters } from '@/utils/tableFilterUtils';
import { getNutritionTemplateFilterFields } from '@/hooks/useTableFilters';

export const useNutritionTemplatesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

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
    tags: false,
    connectedLeads: false,
    createdDate: true,
    actions: true,
  });

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('nutrition_templates');
  const { data: templates = [], isLoading } = useNutritionTemplates({
    search: undefined,
  });
  const createTemplate = useCreateNutritionTemplate();
  const updateTemplate = useUpdateNutritionTemplate();
  const deleteTemplate = useDeleteNutritionTemplate();

  useSyncSavedViewFilters('nutrition_templates', savedView, isLoadingView);

  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'nutrition_templates'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'nutrition_templates'));

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/nutrition-templates?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        const nameMatch = template.name?.toLowerCase().includes(searchLower);
        const descMatch = template.description?.toLowerCase().includes(searchLower);
        return nameMatch || descMatch;
      });
    }

    const filterFields = getNutritionTemplateFilterFields(templates);

    return applyTableFilters(
      filtered,
      activeFilters,
      filterFields,
      (template, fieldId) => {
        if (fieldId === 'is_public') return template.is_public;
        if (fieldId === 'calories_range') {
          const calories = template.targets?.calories;
          if (calories === undefined || calories === null) return null;
          if (calories < 1000) return '0-1000';
          if (calories < 1500) return '1000-1500';
          if (calories < 2000) return '1500-2000';
          if (calories < 2500) return '2000-2500';
          return '2500+';
        }
        if (fieldId === 'protein_range') {
          const protein = template.targets?.protein;
          if (protein === undefined || protein === null) return null;
          if (protein < 100) return '0-100';
          if (protein < 150) return '100-150';
          if (protein < 200) return '150-200';
          return '200+';
        }
        return (template as any)[fieldId];
      }
    );
  }, [templates, searchQuery, activeFilters]);

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

  const handleEditTemplate = (template: NutritionTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = async (
    data: Partial<NutritionTemplate> | { name: string; description: string; targets: any; manual_override?: any; manual_fields?: any; activity_entries?: any }
  ) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplate.id,
          name: data.name,
          description: data.description,
          targets: data.targets,
          manual_override: (data as any).manual_override,
          manual_fields: (data as any).manual_fields,
          activity_entries: (data as any).activity_entries,
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
          manual_override: (data as any).manual_override,
          manual_fields: (data as any).manual_fields,
          activity_entries: (data as any).activity_entries,
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

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery,
      columnVisibility,
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
    savedView,
    editingTemplate,
    templateToDelete,
    isLoading,
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





