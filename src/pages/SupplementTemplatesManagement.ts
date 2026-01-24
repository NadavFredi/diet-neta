/**
 * SupplementTemplatesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  useSupplementTemplates,
  useDeleteSupplementTemplate,
  useCreateSupplementTemplate,
  useUpdateSupplementTemplate,
  type SupplementTemplate,
  type SupplementItem,
} from '@/hooks/useSupplementTemplates';
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

export const useSupplementTemplatesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SupplementTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SupplementTemplate | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('supplement_templates');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'supplement_templates'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'supplement_templates'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'supplement_templates'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'supplement_templates'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'supplement_templates'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'supplement_templates'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'supplement_templates'));
  const tableColumnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'supplement_templates'));
  const tableColumnOrder = useAppSelector((state) => selectColumnOrder(state, 'supplement_templates'));
  const tableColumnSizing = useAppSelector((state) => selectColumnSizing(state, 'supplement_templates'));
  
  const { data: templatesData, isLoading } = useSupplementTemplates({
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
        dispatch(setCurrentPage({ resourceKey: 'supplement_templates', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);

  const createTemplate = useCreateSupplementTemplate();
  const updateTemplate = useUpdateSupplementTemplate();
  const deleteTemplate = useDeleteSupplementTemplate();
  const bulkDeleteTemplates = useBulkDeleteRecords({
    table: 'supplement_templates',
    invalidateKeys: [['supplementTemplates']],
    createdByField: 'created_by',
  });

  useSyncSavedViewFilters('supplement_templates', savedView, isLoadingView);

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/supplement-templates?view_id=${defaultView.id}`, { replace: true });
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
      navigate('/login');
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsAddDialogOpen(true);
  };

  const handleEditTemplate = (template: SupplementTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = async (
    data: { name: string; description: string; supplements: SupplementItem[] }
  ) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplate.id,
          name: data.name,
          description: data.description,
          supplements: data.supplements,
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
          supplements: data.supplements,
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

  const handleDeleteClick = (template: SupplementTemplate) => {
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
    dispatch(setSortBy({ resourceKey: 'supplement_templates', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'supplement_templates', sortOrder: order }));
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
