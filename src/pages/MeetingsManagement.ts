/**
 * MeetingsManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
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

export const useMeetingsManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetings();

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
      console.error('[MeetingsManagement] Logout error:', error);
      navigate('/login');
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'meetings', searchQuery: value }));
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

    // Apply active filters
    if (activeFilters && activeFilters.length > 0) {
      activeFilters.forEach((filter) => {
        switch (filter.fieldId) {
          case 'created_at':
            // Filter by creation date
            if (filter.operator === 'equals' && filter.value) {
              const filterDate = format(new Date(filter.value as string), 'yyyy-MM-dd');
              result = result.filter((meeting) => {
                const meetingDate = format(new Date(meeting.created_at), 'yyyy-MM-dd');
                return meetingDate === filterDate;
              });
            } else if (filter.operator === 'before' && filter.value) {
              const filterDate = new Date(filter.value as string);
              result = result.filter((meeting) => new Date(meeting.created_at) < filterDate);
            } else if (filter.operator === 'after' && filter.value) {
              const filterDate = new Date(filter.value as string);
              result = result.filter((meeting) => new Date(meeting.created_at) > filterDate);
            }
            break;
          case 'meeting_date':
            // Filter by meeting date (from meeting_data)
            if (filter.operator === 'equals' && filter.value) {
              const filterDate = format(new Date(filter.value as string), 'yyyy-MM-dd');
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const meetingDateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
                if (!meetingDateValue) return false;
                try {
                  const meetingDate = format(new Date(meetingDateValue), 'yyyy-MM-dd');
                  return meetingDate === filterDate;
                } catch {
                  return false;
                }
              });
            }
            break;
          case 'status':
            // Filter by status
            if (filter.operator === 'is' && filter.value) {
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const status = String(meetingData.status || meetingData['סטטוס'] || '');
                return status === filter.value;
              });
            } else if (filter.operator === 'isNot' && filter.value) {
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const status = String(meetingData.status || meetingData['סטטוס'] || '');
                return status !== filter.value;
              });
            }
            break;
        }
      });
    }

    return result;
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

