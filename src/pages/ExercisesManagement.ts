/**
 * ExercisesManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  useExercises,
  useDeleteExercise,
  useCreateExercise,
  useUpdateExercise,
  type Exercise,
} from '@/hooks/useExercises';
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
  setCurrentPage,
  setPageSize,
  setSortBy,
  setSortOrder,
} from '@/store/slices/tableStateSlice';

export const useExercisesManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('exercises');
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'exercises'));
  const filterGroup = useAppSelector((state) => selectFilterGroup(state, 'exercises'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'exercises'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'exercises'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'exercises'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'exercises'));
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, 'exercises'));
  
  const { data: exercisesData, isLoading } = useExercises({
    search: searchQuery,
    filterGroup,
    page: currentPage,
    pageSize,
    groupByLevel1: groupByKeys[0] || null,
    groupByLevel2: groupByKeys[1] || null,
    sortBy,
    sortOrder,
  });
  
  const exercises = exercisesData?.data || [];
  const totalExercises = exercisesData?.totalCount || 0;
  
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
        dispatch(setCurrentPage({ resourceKey: 'exercises', page: 1 }));
      }
    }
    prevFiltersRef.current = currentFilters;
  }, [searchQuery, filterGroup, groupByKeys, currentPage, dispatch]);
  
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const bulkDeleteExercises = useBulkDeleteRecords({
    table: 'exercises',
    invalidateKeys: [['exercises']],
    createdByField: 'created_by',
  });

  useSyncSavedViewFilters('exercises', savedView, isLoadingView);

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/exercises?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Filter exercises
  const filteredExercises = useMemo(() => exercises, [exercises]);

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

  const handleAddExercise = () => {
    setEditingExercise(null);
    setIsAddDialogOpen(true);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsEditDialogOpen(true);
  };

  const handleSaveExercise = async (
    data: Partial<Exercise> | { name: string; repetitions?: number | null; weight?: number | null; image?: string | null; video_link?: string | null }
  ) => {
    try {
      if (editingExercise) {
        await updateExercise.mutateAsync({
          exerciseId: editingExercise.id,
          name: data.name,
          repetitions: data.repetitions,
          weight: data.weight,
          image: data.image,
          video_link: data.video_link,
        });
        toast({
          title: 'הצלחה',
          description: 'התרגיל עודכן בהצלחה',
        });
        setIsEditDialogOpen(false);
        setEditingExercise(null);
      } else {
        await createExercise.mutateAsync({
          name: data.name,
          repetitions: data.repetitions,
          weight: data.weight,
          image: data.image,
          video_link: data.video_link,
        });
        toast({
          title: 'הצלחה',
          description: 'התרגיל נוצר בהצלחה',
        });
        setIsAddDialogOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת התרגיל',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;

    try {
      await deleteExercise.mutateAsync(exerciseToDelete.id);
      toast({
        title: 'הצלחה',
        description: 'התרגיל נמחק בהצלחה',
      });
      setDeleteDialogOpen(false);
      setExerciseToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת התרגיל',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async (payload: { ids: string[] }) => {
    await bulkDeleteExercises.mutateAsync(payload.ids);
    toast({
      title: 'הצלחה',
      description: 'התרגילים נמחקו בהצלחה',
    });
  };

  const handleSortChange = (columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'exercises', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'exercises', sortOrder: order }));
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery,
      filterGroup,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  return {
    // Data
    exercises: filteredExercises,
    totalExercises,
    savedView,
    editingExercise,
    exerciseToDelete,
    isLoading,
    isLoadingView,
    
    // State
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
    handleAddExercise,
    handleEditExercise,
    handleSaveExercise,
    handleDeleteClick,
    handleConfirmDelete,
    handleBulkDelete,
    handleSortChange,
    handleSaveViewClick,
    getCurrentFilterConfig,
    
    // Mutations
    deleteExercise,
  };
};
