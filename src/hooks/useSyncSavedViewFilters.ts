import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveFilters, setSearchQuery, type ResourceKey } from '@/store/slices/tableStateSlice';
import type { SavedView } from '@/hooks/useSavedViews';

export const useSyncSavedViewFilters = (
  resourceKey: ResourceKey,
  savedView: SavedView | null | undefined,
  isLoadingView?: boolean
) => {
  const dispatch = useAppDispatch();
  const isInitialized = useAppSelector((state) => !!state.tableState.tables[resourceKey]);
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const lastAppliedViewIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (!viewId) {
      dispatch(setSearchQuery({ resourceKey, query: '' }));
      dispatch(setActiveFilters({ resourceKey, filters: [] }));
      lastAppliedViewIdRef.current = null;
      return;
    }
    if (!savedView || isLoadingView) return;
    if (lastAppliedViewIdRef.current === savedView.id) return;

    const filterConfig = savedView.filter_config as any;
    if (filterConfig.searchQuery !== undefined) {
      dispatch(setSearchQuery({ resourceKey, query: filterConfig.searchQuery || '' }));
    }
    if (filterConfig.advancedFilters && Array.isArray(filterConfig.advancedFilters)) {
      dispatch(setActiveFilters({ resourceKey, filters: filterConfig.advancedFilters }));
    } else {
      dispatch(setActiveFilters({ resourceKey, filters: [] }));
    }

    lastAppliedViewIdRef.current = savedView.id;
  }, [viewId, savedView, isLoadingView, resourceKey, dispatch, isInitialized]);
};
