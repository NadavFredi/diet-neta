/**
 * SubscriptionTypesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import {
  useSubscriptionTypes,
  useDeleteSubscriptionType,
  useCreateSubscriptionType,
  useUpdateSubscriptionType,
} from '@/hooks/useSubscriptionTypes';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';

export interface SubscriptionTypeColumnVisibility {
  name: boolean;
  duration: boolean;
  price: boolean;
  createdDate: boolean;
  actions: boolean;
}

export const useSubscriptionTypesManagement = () => {
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
  const [editingSubscriptionType, setEditingSubscriptionType] = useState<SubscriptionType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionTypeToDelete, setSubscriptionTypeToDelete] = useState<SubscriptionType | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<SubscriptionTypeColumnVisibility>({
    name: true,
    duration: true,
    price: true,
    createdDate: true,
    actions: true,
  });

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('subscription_types');
  const { data: subscriptionTypes = [], isLoading } = useSubscriptionTypes({
    search: undefined,
  });
  const createSubscriptionType = useCreateSubscriptionType();
  const updateSubscriptionType = useUpdateSubscriptionType();
  const deleteSubscriptionType = useDeleteSubscriptionType();

  // Auto-navigate to default view (only if defaultView exists)
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/subscription-types?view_id=${defaultView.id}`, { replace: true });
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

  // Filter subscription types
  const filteredSubscriptionTypes = useMemo(() => {
    let filtered = subscriptionTypes;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((st) => {
        const nameMatch = st.name?.toLowerCase().includes(searchLower);
        return nameMatch;
      });
    }

    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((st) => {
        const stDate = format(new Date(st.created_at), 'yyyy-MM-dd');
        return stDate === selectedDateStr;
      });
    }

    return filtered;
  }, [subscriptionTypes, searchQuery, selectedDate]);

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  const handleToggleColumn = (key: keyof SubscriptionTypeColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddSubscriptionType = () => {
    setEditingSubscriptionType(null);
    setIsAddDialogOpen(true);
  };

  const handleEditSubscriptionType = (subscriptionType: SubscriptionType) => {
    setEditingSubscriptionType(subscriptionType);
    setIsEditDialogOpen(true);
  };

  const handleSaveSubscriptionType = async (
    data: { subscriptionTypeId?: string; name: string; duration: number; duration_unit?: string; price: number; currency?: string }
  ) => {
    try {
      if (editingSubscriptionType) {
        await updateSubscriptionType.mutateAsync({
          subscriptionTypeId: editingSubscriptionType.id,
          name: data.name,
          duration: data.duration,
          duration_unit: (data.duration_unit || 'months') as any,
          price: data.price,
          currency: data.currency as any,
        });
        
        toast({
          title: 'הצלחה',
          description: 'סוג המנוי עודכן בהצלחה',
        });
        setIsEditDialogOpen(false);
        setEditingSubscriptionType(null);
      } else {
        await createSubscriptionType.mutateAsync({
          name: data.name,
          duration: data.duration,
          duration_unit: (data.duration_unit || 'months') as any,
          price: data.price,
          currency: (data.currency || 'ILS') as any,
        });
        
        toast({
          title: 'הצלחה',
          description: 'סוג המנוי נוצר בהצלחה',
        });
        setIsAddDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת סוג המנוי',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDeleteClick = (subscriptionType: SubscriptionType) => {
    setSubscriptionTypeToDelete(subscriptionType);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subscriptionTypeToDelete) return;

    try {
      await deleteSubscriptionType.mutateAsync(subscriptionTypeToDelete.id);
      
      toast({
        title: 'הצלחה',
        description: 'סוג המנוי נמחק בהצלחה',
      });
      setDeleteDialogOpen(false);
      setSubscriptionTypeToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת סוג המנוי',
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
    subscriptionTypes: filteredSubscriptionTypes,
    editingSubscriptionType,
    subscriptionTypeToDelete,
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
    columnVisibility,
    
    // Setters
    setSearchQuery,
    handleDateSelect,
    setDatePickerOpen,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    
    // Handlers
    handleLogout,
    handleToggleColumn,
    handleAddSubscriptionType,
    handleEditSubscriptionType,
    handleSaveSubscriptionType,
    handleDeleteClick,
    handleConfirmDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteSubscriptionType,
  };
};
