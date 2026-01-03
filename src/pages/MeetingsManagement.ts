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
            if (filter.operator === 'equals' && filter.values && filter.values[0]) {
              const filterDate = format(new Date(filter.values[0]), 'yyyy-MM-dd');
              result = result.filter((meeting) => {
                const meetingDate = format(new Date(meeting.created_at), 'yyyy-MM-dd');
                return meetingDate === filterDate;
              });
            } else if (filter.operator === 'before' && filter.values && filter.values[0]) {
              const filterDate = new Date(filter.values[0]);
              result = result.filter((meeting) => new Date(meeting.created_at) < filterDate);
            } else if (filter.operator === 'after' && filter.values && filter.values[0]) {
              const filterDate = new Date(filter.values[0]);
              result = result.filter((meeting) => new Date(meeting.created_at) > filterDate);
            } else if (filter.operator === 'between' && filter.values && filter.values[0] && filter.values[1]) {
              const filterDateStart = new Date(filter.values[0]);
              const filterDateEnd = new Date(filter.values[1]);
              result = result.filter((meeting) => {
                const meetingDate = new Date(meeting.created_at);
                return meetingDate >= filterDateStart && meetingDate <= filterDateEnd;
              });
            }
            break;
          case 'meeting_date':
            // Filter by meeting date (from meeting_data)
            if (filter.operator === 'equals' && filter.values && filter.values[0]) {
              const filterDate = format(new Date(filter.values[0]), 'yyyy-MM-dd');
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
            } else if (filter.operator === 'before' && filter.values && filter.values[0]) {
              const filterDate = new Date(filter.values[0]);
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const meetingDateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
                if (!meetingDateValue) return false;
                try {
                  return new Date(meetingDateValue) < filterDate;
                } catch {
                  return false;
                }
              });
            } else if (filter.operator === 'after' && filter.values && filter.values[0]) {
              const filterDate = new Date(filter.values[0]);
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const meetingDateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
                if (!meetingDateValue) return false;
                try {
                  return new Date(meetingDateValue) > filterDate;
                } catch {
                  return false;
                }
              });
            } else if (filter.operator === 'between' && filter.values && filter.values[0] && filter.values[1]) {
              const filterDateStart = new Date(filter.values[0]);
              const filterDateEnd = new Date(filter.values[1]);
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const meetingDateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
                if (!meetingDateValue) return false;
                try {
                  const meetingDate = new Date(meetingDateValue);
                  return meetingDate >= filterDateStart && meetingDate <= filterDateEnd;
                } catch {
                  return false;
                }
              });
            }
            break;
          case 'status':
            // Filter by status
            if (filter.operator === 'is' && filter.values && filter.values.length > 0) {
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const status = String(meetingData.status || meetingData['סטטוס'] || '');
                return filter.values.includes(status);
              });
            } else if (filter.operator === 'isNot' && filter.values && filter.values.length > 0) {
              result = result.filter((meeting) => {
                const meetingData = meeting.meeting_data || {};
                const status = String(meetingData.status || meetingData['סטטוס'] || '');
                return !filter.values.includes(status);
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

