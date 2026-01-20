/**
 * SubscriptionTypesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  useSubscriptionTypes,
  useDeleteSubscriptionType,
  useCreateSubscriptionType,
  useUpdateSubscriptionType,
} from '@/hooks/useSubscriptionTypes';
import { useBulkDeleteRecords } from '@/hooks/useBulkDeleteRecords';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';
import { selectFilterGroup, selectSearchQuery } from '@/store/slices/tableStateSlice';

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
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'subscription_types'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'subscription_types'));
  const { data: subscriptionTypes = [], isLoading } = useSubscriptionTypes({
    search: searchQuery,
    filterGroup,
  });
  const createSubscriptionType = useCreateSubscriptionType();
  const updateSubscriptionType = useUpdateSubscriptionType();
  const deleteSubscriptionType = useDeleteSubscriptionType();
  const bulkDeleteSubscriptionTypes = useBulkDeleteRecords({
    table: 'subscription_types',
    invalidateKeys: [['subscriptionTypes']],
    createdByField: 'created_by',
  });

  useSyncSavedViewFilters('subscription_types', savedView, isLoadingView);

  // Auto-navigate to default view (only if defaultView exists)
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/subscription-types?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Filter subscription types
  const filteredSubscriptionTypes = useMemo(() => subscriptionTypes, [subscriptionTypes]);

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
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

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    await bulkDeleteSubscriptionTypes.mutateAsync(payload.ids);
    toast({
      title: 'הצלחה',
      description: 'סוגי המנוי נמחקו בהצלחה',
    });
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
      filterGroup,
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
    isAddDialogOpen,
    isEditDialogOpen,
    deleteDialogOpen,
    isSaveViewModalOpen,
    columnVisibility,
    
    // Setters
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
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteSubscriptionType,
  };
};
