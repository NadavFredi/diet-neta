/**
 * BudgetManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import {
  useBudgets,
  useDeleteBudget,
  useCreateBudget,
  useUpdateBudget,
  type Budget,
} from '@/hooks/useBudgets';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import type { NutritionTargets, Supplement } from '@/store/slices/budgetSlice';

export interface BudgetColumnVisibility {
  name: boolean;
  description: boolean;
  steps_goal: boolean;
  createdDate: boolean;
  actions: boolean;
}

export const useBudgetManagement = () => {
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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<BudgetColumnVisibility>({
    name: true,
    description: true,
    steps_goal: true,
    createdDate: true,
    actions: true,
  });

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('budgets');
  const { data: budgets = [], isLoading } = useBudgets({
    search: undefined,
  });
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  // Auto-navigate to default view (only if defaultView exists)
  // If no defaultView, show all budgets (no view_id)
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/budgets?view_id=${defaultView.id}`, { replace: true });
    }
    // If no viewId and no defaultView, stay on /dashboard/budgets (shows all budgets)
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

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    let filtered = budgets;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((budget) => {
        const nameMatch = budget.name?.toLowerCase().includes(searchLower);
        const descMatch = budget.description?.toLowerCase().includes(searchLower);
        return nameMatch || descMatch;
      });
    }

    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((budget) => {
        const budgetDate = format(new Date(budget.created_at), 'yyyy-MM-dd');
        return budgetDate === selectedDateStr;
      });
    }

    return filtered;
  }, [budgets, searchQuery, selectedDate]);

  // Handlers
  const handleLogout = async () => {
    try {
      console.log('[BudgetManagement] Logout initiated');
      await dispatch(logoutUser()).unwrap();
      console.log('[BudgetManagement] Logout successful, navigating to login');
      navigate('/login');
    } catch (error) {
      console.error('[BudgetManagement] Logout error:', error);
      // Navigate to login even if logout fails
      navigate('/login');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  const handleToggleColumn = (key: keyof BudgetColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddBudget = () => {
    setEditingBudget(null);
    setIsAddDialogOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
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
      supplements: Supplement[];
      eating_order?: string | null;
      eating_rules?: string | null;
    }
  ) => {
    try {
      if (editingBudget) {
        await updateBudget.mutateAsync({
          budgetId: editingBudget.id,
          ...data,
        });
        toast({
          title: 'הצלחה',
          description: 'התקציב עודכן בהצלחה',
        });
        setIsEditDialogOpen(false);
        setEditingBudget(null);
      } else {
        await createBudget.mutateAsync({
          name: data.name!,
          description: data.description,
          nutrition_template_id: (data as any).nutrition_template_id,
          nutrition_targets: (data as any).nutrition_targets,
          steps_goal: (data as any).steps_goal,
          steps_instructions: (data as any).steps_instructions,
          workout_template_id: (data as any).workout_template_id,
          supplements: (data as any).supplements,
          eating_order: (data as any).eating_order,
          eating_rules: (data as any).eating_rules,
          is_public: false,
        });
        toast({
          title: 'הצלחה',
          description: 'התקציב נוצר בהצלחה',
        });
        setIsAddDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת התקציב',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudget.mutateAsync(budgetToDelete.id);
      toast({
        title: 'הצלחה',
        description: 'התקציב נמחק בהצלחה',
      });
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת התקציב',
        variant: 'destructive',
      });
    }
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (
    advancedFilters?: any[],
    columnOrder?: string[],
    columnWidths?: Record<string, number>,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) => {
    return {
      searchQuery: searchQuery || '',
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      columnVisibility: columnVisibility || {},
      columnOrder: columnOrder || [],
      columnWidths: columnWidths || {},
      sortBy: sortBy || null,
      sortOrder: sortOrder || 'asc',
      advancedFilters: advancedFilters || [],
    };
  };

  return {
    // Data
    budgets: filteredBudgets,
    editingBudget,
    budgetToDelete,
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
    setSelectedHasLeads: () => {}, // Not used for budgets
    
    // Handlers
    handleLogout,
    handleToggleColumn,
    handleAddBudget,
    handleEditBudget,
    handleSaveBudget,
    handleDeleteClick,
    handleConfirmDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteBudget,
  };
};

