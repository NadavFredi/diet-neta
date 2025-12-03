import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
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
  toggleColumnVisibility,
} from '@/store/slices/dashboardSlice';
import { logout } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { ColumnKey } from '@/utils/dashboard';

export const useDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const {
    filteredLeads,
    searchQuery,
    selectedDate,
    selectedStatus,
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
  } = useAppSelector((state) => state.dashboard);
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

  const handleAgeChange = (value: string) => {
    dispatch(setSelectedAge(value === 'all' ? null : value));
  };

  const handleHeightChange = (value: string) => {
    dispatch(setSelectedHeight(value === 'all' ? null : value));
  };

  const handleWeightChange = (value: string) => {
    dispatch(setSelectedWeight(value === 'all' ? null : value));
  };

  const handleFitnessGoalChange = (value: string) => {
    dispatch(setSelectedFitnessGoal(value === 'all' ? null : value));
  };

  const handleActivityLevelChange = (value: string) => {
    dispatch(setSelectedActivityLevel(value === 'all' ? null : value));
  };

  const handlePreferredTimeChange = (value: string) => {
    dispatch(setSelectedPreferredTime(value === 'all' ? null : value));
  };

  const handleSourceChange = (value: string) => {
    dispatch(setSelectedSource(value === 'all' ? null : value));
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
    selectedAge,
    selectedHeight,
    selectedWeight,
    selectedFitnessGoal,
    selectedActivityLevel,
    selectedPreferredTime,
    selectedSource,
    columnVisibility,
    user,
    isSettingsOpen,
    datePickerOpen,
    
    // Actions
    handleSearchChange,
    handleDateSelect,
    handleStatusChange,
    handleAgeChange,
    handleHeightChange,
    handleWeightChange,
    handleFitnessGoalChange,
    handleActivityLevelChange,
    handlePreferredTimeChange,
    handleSourceChange,
    handleToggleColumn,
    handleLogout,
    setIsSettingsOpen,
    setDatePickerOpen,
  };
};

