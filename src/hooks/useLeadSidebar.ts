/**
 * useLeadSidebar Hook
 * 
 * Custom hook for managing sidebar toggle logic in Lead Details view.
 * Provides convenient methods for opening/closing sidebars.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectActiveSidebar,
  toggleSidebar,
  setActiveSidebar,
  closeSidebar,
  type SidebarType,
} from '@/store/slices/leadViewSlice';

export const useLeadSidebar = () => {
  const dispatch = useAppDispatch();
  const activeSidebar = useAppSelector(selectActiveSidebar);

  const openHistory = useCallback(() => {
    dispatch(setActiveSidebar('history'));
  }, [dispatch]);

  const openNotes = useCallback(() => {
    dispatch(setActiveSidebar('notes'));
  }, [dispatch]);

  const toggleHistory = useCallback(() => {
    dispatch(toggleSidebar('history'));
  }, [dispatch]);

  const toggleNotes = useCallback(() => {
    dispatch(toggleSidebar('notes'));
  }, [dispatch]);

  const close = useCallback(() => {
    dispatch(closeSidebar());
  }, [dispatch]);

  const isHistoryOpen = activeSidebar === 'history';
  const isNotesOpen = activeSidebar === 'notes';
  const isAnyOpen = activeSidebar !== 'none';

  return {
    activeSidebar,
    isHistoryOpen,
    isNotesOpen,
    isAnyOpen,
    openHistory,
    openNotes,
    toggleHistory,
    toggleNotes,
    close,
  };
};
