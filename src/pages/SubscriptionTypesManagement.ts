/**
 * SubscriptionTypesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('subscription_types');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'subscription_types'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'subscription_types'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'subscription_types'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'subscription_types'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'subscription_types'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'subscription_types'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'subscription_types'));
  const tableColumnVisibility = useAppSelector((state) => selectColumnVisibility(state, 'subscription_types'));
  const tableColumnOrder = useAppSelector((state) => selectColumnOrder(state, 'subscription_types'));
  const tableColumnSizing = useAppSelector((state) => selectColumnSizing(state, 'subscription_types'));
  
  const { data: subscriptionTypesData, isLoading } = useSubscriptionTypes({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
    sortBy,
    sortOrder,
  });
  
  const subscriptionTypes = subscriptionTypesData?.data || [];
  const totalSubscriptionTypes = subscriptionTypesData?.totalCount || 0;
  
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
        dispatch(setCurrentPage({ resourceKey: 'subscription_types', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
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

  const handleAddSubscriptionType = () => {
    setEditingSubscriptionType(null);
    setIsAddDialogOpen(true);
  };

  const handleEditSubscriptionType = (subscriptionType: SubscriptionType) => {
    setEditingSubscriptionType(subscriptionType);
    setIsEditDialogOpen(true);
  };

  const handleSaveSubscriptionType = async (
    data: { 
      subscriptionTypeId?: string; 
      name: string; 
      duration: number; 
      duration_unit?: string; 
      price: number; 
      currency?: string;
      second_period?: {
        duration: number;
        duration_unit: string;
        price: number;
        currency: string;
      } | null;
    }
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
          second_period: data.second_period ? {
            duration: data.second_period.duration,
            duration_unit: data.second_period.duration_unit as any,
            price: data.second_period.price,
            currency: data.second_period.currency as any,
          } : null,
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
          second_period: data.second_period ? {
            duration: data.second_period.duration,
            duration_unit: data.second_period.duration_unit as any,
            price: data.second_period.price,
            currency: data.second_period.currency as any,
          } : null,
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

  const handleSortChange = (columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'subscription_types', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'subscription_types', sortOrder: order }));
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
    subscriptionTypes: filteredSubscriptionTypes,
    totalSubscriptionTypes,
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
    sortBy,
    sortOrder,
    
    // Setters
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setDeleteDialogOpen,
    setIsSaveViewModalOpen,
    
    // Handlers
    handleLogout,
    handleAddSubscriptionType,
    handleEditSubscriptionType,
    handleSaveSubscriptionType,
    handleDeleteClick,
    handleConfirmDelete,
    handleSortChange,
    handleBulkDelete,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteSubscriptionType,
  };
};
