/**
 * BudgetManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  useBudgets,
  useDeleteBudget,
  useCreateBudget,
  useUpdateBudget,
  useBudget,
} from '@/hooks/useBudgets';
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { setGeneratingPDF, setSendingWhatsApp } from '@/store/slices/budgetSlice';
import { useToast } from '@/hooks/use-toast';
import { generateBudgetPDF } from '@/services/pdfService';
import { syncPlansFromBudget, deleteAssociatedPlans } from '@/services/budgetPlanSync';
import { supabase } from '@/lib/supabaseClient';
import type { Budget, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
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

export const useBudgetManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  
  // Fetch budget data when editingBudgetId is set (ensures fresh data)
  const { data: editingBudget, refetch: refetchEditingBudget } = useBudget(editingBudgetId);
  
  // Refetch budget when dialog opens to ensure fresh data
  useEffect(() => {
    if (editingBudgetId) {
      refetchEditingBudget();
    }
  }, [editingBudgetId, refetchEditingBudget]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sendingBudget, setSendingBudget] = useState<Budget | null>(null);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('budgets');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'budgets'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'budgets'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'budgets'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'budgets'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'budgets'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'budgets'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'budgets'));
  const tableColumnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'budgets'));
  const tableColumnOrder = useAppSelector((state) => selectColumnOrder(state, 'budgets'));
  const tableColumnSizing = useAppSelector((state) => selectColumnSizing(state, 'budgets'));
  
  const { data: budgetsData, isLoading } = useBudgets({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
    sortBy,
    sortOrder,
  });
  
  const budgets = budgetsData?.data || [];
  const totalBudgets = budgetsData?.totalCount || 0;
  
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
        dispatch(setCurrentPage({ resourceKey: 'budgets', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
  
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const bulkDeleteBudgets = useBulkDeleteRecords({
    table: 'budgets',
    invalidateKeys: [['budgets']],
    createdByField: 'created_by',
  });

  useSyncSavedViewFilters('budgets', savedView, isLoadingView);

  // Auto-navigate to default view (only if defaultView exists)
  // If no defaultView, show all budgets (no view_id)
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/budgets?view_id=${defaultView.id}`, { replace: true });
    }
    // If no viewId and no defaultView, stay on /dashboard/budgets (shows all budgets)
  }, [viewId, defaultView, navigate]);

  // Filter budgets
  const filteredBudgets = useMemo(() => budgets, [budgets]);

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

  const handleAddBudget = () => {
    setEditingBudgetId(null);
    setIsAddDialogOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    setIsEditDialogOpen(true);
  };

  const handleSaveBudget = async (
    data: Partial<Budget> | {
      name: string;
      description: string;
      nutrition_template_id?: string | null;
      nutrition_targets: NutritionTargets;
      steps_goal: number;
      steps_instructions?: string | null;
      workout_template_id?: string | null;
      supplement_template_id?: string | null;
      supplements: Supplement[];
      eating_order?: string | null;
      eating_rules?: string | null;
    }
  ) => {
    try {
      if (editingBudget) {
        const updateResult = await updateBudget.mutateAsync({
          budgetId: editingBudget.id,
          name: data.name,
          description: data.description,
          nutrition_template_id: (data as any).nutrition_template_id ?? null,
          nutrition_targets: (data as any).nutrition_targets,
          steps_goal: (data as any).steps_goal,
          steps_instructions: (data as any).steps_instructions ?? null,
          workout_template_id: (data as any).workout_template_id ?? null,
          supplement_template_id: (data as any).supplement_template_id ?? null,
          supplements: (data as any).supplements,
          eating_order: (data as any).eating_order ?? null,
          eating_rules: (data as any).eating_rules ?? null,
        });

        // Update the editingBudgetId to trigger refetch and get latest data
        // The useBudget hook will automatically refetch when the ID changes
        setEditingBudgetId(updateResult.id);
        
        // If budget templates changed, sync plans for existing assignments
        // (Budget is a template - changes should propagate to all assigned customers)
        const budgetChanged = 
          (data as any).workout_template_id !== undefined ||
          (data as any).nutrition_template_id !== undefined ||
          (data as any).supplements !== undefined;
        
        if (budgetChanged) {
          // Get active assignments for this budget
          const { data: assignments } = await supabase
            .from('budget_assignments')
            .select('customer_id, lead_id')
            .eq('budget_id', editingBudget.id)
            .eq('is_active', true);

          if (assignments && assignments.length > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const updatedBudget = { ...editingBudget, ...data } as Budget;
              
              // Sync plans for each assignment
              for (const assignment of assignments) {
                try {
                  await syncPlansFromBudget({
                    budget: updatedBudget,
                    customerId: assignment.customer_id,
                    leadId: assignment.lead_id,
                    userId: user.id,
                  });
                } catch (syncError) {
                  // Silent failure
                }
              }
            }
          }
        }
        
        toast({
          title: 'הצלחה',
          description: 'תכנית הפעולה עודכנה בהצלחה',
        });
        setIsEditDialogOpen(false);
        setEditingBudgetId(null);
      } else {
        const newBudget = await createBudget.mutateAsync({
          name: data.name!,
          description: data.description,
          nutrition_template_id: (data as any).nutrition_template_id,
          nutrition_targets: (data as any).nutrition_targets,
          steps_goal: (data as any).steps_goal,
          steps_instructions: (data as any).steps_instructions,
          workout_template_id: (data as any).workout_template_id,
          supplement_template_id: (data as any).supplement_template_id,
          supplements: (data as any).supplements,
          eating_order: (data as any).eating_order,
          eating_rules: (data as any).eating_rules,
          is_public: false,
        });
        
        toast({
          title: 'הצלחה',
          description: 'תכנית הפעולה נוצרה בהצלחה. ניתן להקצות אותה ללקוחות מהדף שלהם.',
        });
        setIsAddDialogOpen(false);
        
        // Return the created budget for assignment
        return newBudget;
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת תכנית הפעולה',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (deletePlans: boolean) => {
    if (!budgetToDelete) return;

    try {
      // Delete associated plans if requested
      if (deletePlans) {
        await deleteAssociatedPlans(budgetToDelete.id, true);
      } else {
        // Just remove the budget_id reference
        await deleteAssociatedPlans(budgetToDelete.id, false);
      }

      // Delete the budget
      await deleteBudget.mutateAsync(budgetToDelete.id);
      
      toast({
        title: 'הצלחה',
        description: 'תכנית הפעולה נמחקה בהצלחה',
      });
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת תכנית הפעולה',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    await bulkDeleteBudgets.mutateAsync(payload.ids);
    toast({
      title: 'הצלחה',
      description: 'תכניות הפעולה נמחקו בהצלחה',
    });
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const handleExportPDF = async (budget: Budget) => {
    try {
      dispatch(setGeneratingPDF({ budgetId: budget.id, isGenerating: true }));
      await generateBudgetPDF(budget);
      toast({
        title: 'הצלחה',
        description: 'קובץ PDF נוצר והורד בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת קובץ PDF',
        variant: 'destructive',
      });
    } finally {
      dispatch(setGeneratingPDF({ budgetId: budget.id, isGenerating: false }));
    }
  };

  const handleSendWhatsApp = (budget: Budget | null) => {
    setSendingBudget(budget);
  };

  const handleSortChange = (columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'budgets', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'budgets', sortOrder: order }));
  };

  const getCurrentFilterConfig = (
    advancedFilters?: any[]
  ) => {
    return {
      searchQuery: searchQuery || '',
      filterGroup,
      columnVisibility: tableColumnVisibility || {},
      columnOrder: tableColumnOrder || [],
      columnWidths: tableColumnSizing || {},
      sortBy: sortBy || null,
      sortOrder: sortOrder || 'asc',
      advancedFilters: advancedFilters || [],
    };
  };

  return {
    // Data
    budgets: filteredBudgets,
    totalBudgets,
    editingBudget,
    budgetToDelete,
    isLoading,
    isLoadingView,
    sendingBudget,
    
    // State
    searchQuery,
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
    handleAddBudget,
    handleEditBudget,
    handleSaveBudget,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSaveViewClick,
    handleExportPDF,
    handleSendWhatsApp,
    getCurrentFilterConfig,
    handleSortChange,
    
    // Mutations
    deleteBudget,
  };
};
