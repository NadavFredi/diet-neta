/**
 * useLeadSidebar Hook
 * 
 * Custom hook for managing sidebar toggle logic in Lead Details view.
 * Provides convenient methods for opening/closing sidebars.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectLeftSidebar,
  selectNotesOpen,
  selectActiveSidebar,
  toggleLeftSidebar,
  setLeftSidebar,
  setSelectedFormType,
  setNotesOpen,
  toggleNotes as toggleNotesAction,
  closeSidebar,
  type SidebarType,
  type LeftSidebarType,
} from '@/store/slices/leadViewSlice';

export const useLeadSidebar = () => {
  const dispatch = useAppDispatch();
  const leftSidebar = useAppSelector(selectLeftSidebar);
  const notesOpen = useAppSelector(selectNotesOpen);
  const activeSidebar = useAppSelector(selectActiveSidebar); // Legacy compatibility

  const openHistory = useCallback(() => {
    dispatch(setLeftSidebar('history'));
  }, [dispatch]);

  const openNotes = useCallback(() => {
    dispatch(setNotesOpen(true));
  }, [dispatch]);

  const toggleHistory = useCallback(() => {
    dispatch(toggleLeftSidebar('history'));
  }, [dispatch]);

  const toggleNotes = useCallback(() => {
    dispatch(toggleNotesAction());
  }, [dispatch]);

  const close = useCallback(() => {
    dispatch(closeSidebar());
  }, [dispatch]);

  const closeHistory = useCallback(() => {
    dispatch(setLeftSidebar('none'));
  }, [dispatch]);

  const closeNotes = useCallback(() => {
    dispatch(setNotesOpen(false));
  }, [dispatch]);

  const isHistoryOpen = leftSidebar === 'history';
  const isSubmissionOpen = leftSidebar === 'submission';
  const isNotesOpen = notesOpen;
  const isAnyOpen = leftSidebar !== 'none' || notesOpen;

  return {
    activeSidebar, // Legacy compatibility
    leftSidebar,
    notesOpen,
    isHistoryOpen,
    isSubmissionOpen,
    isNotesOpen,
    isAnyOpen,
    openHistory,
    openNotes,
    toggleHistory,
    toggleNotes,
    close,
    closeHistory,
    closeNotes,
  };
};


