/**
 * MeetingsManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMeetings } from '@/hooks/useMeetings';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useSavedView } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import {
  selectSearchQuery,
  selectActiveFilters,
  setSearchQuery,
  addFilter as addFilterAction,
  removeFilter as removeFilterAction,
  clearFilters as clearFiltersAction,
  initializeTableState,
} from '@/store/slices/tableStateSlice';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { applyTableFilters } from '@/utils/tableFilterUtils';
import { getMeetingFilterFields } from '@/hooks/useTableFilters';

export const useMeetingsManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetings();
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('meetings', savedView, isLoadingView);

  // Initialize table state for meetings
  useEffect(() => {
    dispatch(initializeTableState({ resourceKey: 'meetings' }));
  }, [dispatch]);

  // Get search query and filters from Redux
  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'meetings'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'meetings'));

  // Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'meetings', query: value }));
  };

  const addFilter = (filter: ActiveFilter) => {
    dispatch(addFilterAction({ resourceKey: 'meetings', filter }));
  };

  const removeFilter = (filterId: string) => {
    dispatch(removeFilterAction({ resourceKey: 'meetings', filterId }));
  };

  const clearFilters = () => {
    dispatch(clearFiltersAction({ resourceKey: 'meetings' }));
  };

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery: searchQuery || '',
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  // Filter meetings based on search query and active filters
  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((meeting) => {
        const customerName = meeting.customer?.full_name?.toLowerCase() || '';
        const phone = meeting.customer?.phone?.toLowerCase() || '';
        const meetingData = meeting.meeting_data || {};
        const meetingDate = String(meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'] || '').toLowerCase();
        const status = String(meetingData.status || meetingData['סטטוס'] || '').toLowerCase();
        
        return (
          customerName.includes(query) ||
          phone.includes(query) ||
          meetingDate.includes(query) ||
          status.includes(query)
        );
      });
    }

    const filterFields = getMeetingFilterFields(meetings);

    return applyTableFilters(
      result,
      activeFilters,
      filterFields,
      (meeting, fieldId) => {
        if (fieldId === 'meeting_date') {
          const meetingData = meeting.meeting_data || {};
          return meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
        }
        if (fieldId === 'status') {
          const meetingData = meeting.meeting_data || {};
          return meetingData.status || meetingData['סטטוס'] || '';
        }
        return (meeting as any)[fieldId];
      }
    );
  }, [meetings, searchQuery, activeFilters]);

  return {
    meetings,
    filteredMeetings,
    isLoadingMeetings,
    handleLogout,
    getCurrentFilterConfig,
    searchQuery,
    activeFilters,
    handleSearchChange,
    addFilter,
    removeFilter,
    clearFilters,
  };
};
