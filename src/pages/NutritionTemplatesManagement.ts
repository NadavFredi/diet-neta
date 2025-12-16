/**
 * NutritionTemplatesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import {
  useNutritionTemplates,
  useDeleteNutritionTemplate,
  useCreateNutritionTemplate,
  useUpdateNutritionTemplate,
  type NutritionTemplate,
} from '@/hooks/useNutritionTemplates';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { TemplateColumnVisibility } from '@/components/dashboard/TemplateColumnSettings';

export const useNutritionTemplatesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

  const [hasAppliedView, setHasAppliedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
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

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/nutrition-templates?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Reset filters
  useEffect(() => {
    if (!viewId) {
      setSearchQuery('');
      setSelectedDate(undefined);
      setHasAppliedView(false);
    }
  }, [viewId]);

  // Apply saved view
  useEffect(() => {
    if (viewId && savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as any;
      if (filterConfig.searchQuery !== undefined) {
        setSearchQuery(filterConfig.searchQuery);
      }
      if (filterConfig.selectedDate !== undefined && filterConfig.selectedDate) {
        setSelectedDate(new Date(filterConfig.selectedDate));
      }
      setHasAppliedView(true);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId]);

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

    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((template) => {
        const templateDate = format(new Date(template.created_at), 'yyyy-MM-dd');
        return templateDate === selectedDateStr;
      });
    }

    return filtered;
  }, [templates, searchQuery, selectedDate]);

  // Handlers
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
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

  const getCurrentFilterConfig = () => {
    return {
      searchQuery,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
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
    searchQuery,
    selectedDate,
    datePickerOpen,
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    isSettingsOpen,
    columnVisibility,
    
    // Setters
    setSearchQuery,
    handleDateSelect,
    setDatePickerOpen,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    setIsSettingsOpen,
    setSelectedHasLeads: () => {}, // Not used for nutrition templates
    
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

