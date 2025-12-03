import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSearchQuery,
  setSelectedDate,
  setSelectedStatus,
  toggleColumnVisibility,
} from '@/store/slices/dashboardSlice';
import { logout } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { ColumnKey } from '@/utils/dashboard';

export const useDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { filteredLeads, searchQuery, selectedDate, selectedStatus, columnVisibility } =
    useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.auth);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery(value));
  };

  const handleDateSelect = (date: Date | undefined) => {
    dispatch(setSelectedDate(date ? format(date, 'yyyy-MM-dd') : null));
    setDatePickerOpen(false);
  };

  const handleStatusChange = (value: string) => {
    dispatch(setSelectedStatus(value === 'all' ? null : value));
  };

  const handleToggleColumn = (key: ColumnKey) => {
    dispatch(toggleColumnVisibility(key));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return {
    // State
    filteredLeads,
    searchQuery,
    selectedDate,
    selectedStatus,
    columnVisibility,
    user,
    isSettingsOpen,
    datePickerOpen,
    
    // Actions
    handleSearchChange,
    handleDateSelect,
    handleStatusChange,
    handleToggleColumn,
    handleLogout,
    setIsSettingsOpen,
    setDatePickerOpen,
  };
};

