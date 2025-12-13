import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { useAppDispatch } from '@/store/hooks';
import { fetchLeads } from '@/store/slices/dashboardSlice';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import {
  setSearchQuery,
  setSelectedDate,
  setSelectedStatus,
  setSelectedAge,
  setSelectedHeight,
  setSelectedWeight,
  setSelectedFitnessGoal,
  setSelectedActivityLevel,
  setSelectedPreferredTime,
  setSelectedSource,
  setColumnVisibility,
} from '@/store/slices/dashboardSlice';
import { format } from 'date-fns';

export const useDashboardPage = () => {
  const dispatch = useAppDispatch();
  const dashboard = useDashboard();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const [hasAppliedView, setHasAppliedView] = useState(false);
  
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  // Fetch leads from Supabase on component mount
  useEffect(() => {
    dispatch(fetchLeads());
  }, [dispatch]);

  // Apply saved view filter config when view is loaded
  useEffect(() => {
    if (savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as FilterConfig;
      
      // Apply all filters from the saved view
      if (filterConfig.searchQuery !== undefined) {
        dispatch(setSearchQuery(filterConfig.searchQuery));
      }
      if (filterConfig.selectedDate !== undefined) {
        dispatch(setSelectedDate(filterConfig.selectedDate));
      }
      if (filterConfig.selectedStatus !== undefined) {
        dispatch(setSelectedStatus(filterConfig.selectedStatus));
      }
      if (filterConfig.selectedAge !== undefined) {
        dispatch(setSelectedAge(filterConfig.selectedAge));
      }
      if (filterConfig.selectedHeight !== undefined) {
        dispatch(setSelectedHeight(filterConfig.selectedHeight));
      }
      if (filterConfig.selectedWeight !== undefined) {
        dispatch(setSelectedWeight(filterConfig.selectedWeight));
      }
      if (filterConfig.selectedFitnessGoal !== undefined) {
        dispatch(setSelectedFitnessGoal(filterConfig.selectedFitnessGoal));
      }
      if (filterConfig.selectedActivityLevel !== undefined) {
        dispatch(setSelectedActivityLevel(filterConfig.selectedActivityLevel));
      }
      if (filterConfig.selectedPreferredTime !== undefined) {
        dispatch(setSelectedPreferredTime(filterConfig.selectedPreferredTime));
      }
      if (filterConfig.selectedSource !== undefined) {
        dispatch(setSelectedSource(filterConfig.selectedSource));
      }
      if (filterConfig.columnVisibility) {
        dispatch(setColumnVisibility(filterConfig.columnVisibility));
      }
      
      setHasAppliedView(true);
    } else if (!viewId && hasAppliedView) {
      // Reset applied view flag when view_id is cleared
      setHasAppliedView(false);
    }
  }, [savedView, hasAppliedView, isLoadingView, viewId, dispatch]);

  // Get current filter config for saving views
  const getCurrentFilterConfig = (): FilterConfig => {
    return {
      searchQuery: dashboard.searchQuery,
      selectedDate: dashboard.selectedDate,
      selectedStatus: dashboard.selectedStatus,
      selectedAge: dashboard.selectedAge,
      selectedHeight: dashboard.selectedHeight,
      selectedWeight: dashboard.selectedWeight,
      selectedFitnessGoal: dashboard.selectedFitnessGoal,
      selectedActivityLevel: dashboard.selectedActivityLevel,
      selectedPreferredTime: dashboard.selectedPreferredTime,
      selectedSource: dashboard.selectedSource,
      columnVisibility: dashboard.columnVisibility,
    };
  };

  return {
    ...dashboard,
    getCurrentFilterConfig,
    activeViewId: viewId,
    isLoadingView,
  };
};



