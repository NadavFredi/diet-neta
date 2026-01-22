/**
 * NutritionTemplatesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { 
  selectFilterGroup, 
  selectSearchQuery, 
  selectCurrentPage,
  selectPageSize,
  selectSortBy,
  selectSortOrder,
  selectGroupByKeys,
  selectColumnVisibility,
  selectColumnOrder,
  selectColumnSizing,
  setCurrentPage,
  setPageSize,
  setSortBy,
  setSortOrder,
} from '@/store/slices/tableStateSlice';

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

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('nutrition_templates');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'nutrition_templates'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'nutrition_templates'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'nutrition_templates'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'nutrition_templates'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'nutrition_templates'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'nutrition_templates'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'nutrition_templates'));
  const tableColumnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'nutrition_templates'));
  const tableColumnOrder = useAppSelector((state) => selectColumnOrder(state, 'nutrition_templates'));
  const tableColumnSizing = useAppSelector((state) => selectColumnSizing(state, 'nutrition_templates'));
  
  const { data: templatesData, isLoading } = useNutritionTemplates({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
    sortBy,
    sortOrder,
  });
  
  const templates = templatesData?.data || [];
  const totalTemplates = templatesData?.totalCount || 0;
  
  // Reset to page 1 when filters, search, or grouping change
  const prevFiltersRef = useRef<string>('');
  useEffect(() => {
    const currentFilters = JSON.stringify({ 
      searchQuery, 
      filterGroup,
      groupByKeys: [groupByKeys[0], groupByKeys[1]],
    });
    if (prevFiltersRef.current && prevFiltersRef.current !== currentFilters) {
      if (currentPage !== 1) {
        dispatch(setCurrentPage({ resourceKey: 'nutrition_templates', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
  const createTemplate = useCreateNutritionTemplate();
  const updateTemplate = useUpdateNutritionTemplate();
  const deleteTemplate = useDeleteNutritionTemplate();
  const bulkDeleteTemplates = useBulkDeleteRecords({
    table: 'nutrition_templates',
    invalidateKeys: [['nutritionTemplates']],
    createdByField: 'created_by',
  });

  useSyncSavedViewFilters('nutrition_templates', savedView, isLoadingView);

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/nutrition-templates?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Filter templates
  const filteredTemplates = useMemo(() => templates, [templates]);

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

  const handleSortChange = (columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'nutrition_templates', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'nutrition_templates', sortOrder: order }));
  };

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    await bulkDeleteTemplates.mutateAsync(payload.ids);
    toast({
      title: 'הצלחה',
      description: 'התבניות נמחקו בהצלחה',
    });
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (advancedFilters?: any[]) => {
    return {
      searchQuery,
      filterGroup,
      columnVisibility: tableColumnVisibility,
      columnOrder: tableColumnOrder,
      columnWidths: tableColumnSizing,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  return {
    // Data
    templates: filteredTemplates,
    totalTemplates,
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
    sortBy,
    sortOrder,
    
    // Setters
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    setIsSettingsOpen,
    
    // Handlers
    handleLogout,
    handleAddTemplate,
    handleEditTemplate,
    handleSaveTemplate,
    handleDeleteClick,
    handleConfirmDelete,
    handleSortChange,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteTemplate,
  };
};
