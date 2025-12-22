/**
 * CustomersManagement Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView } from '@/hooks/useSavedViews';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';

export const useCustomersManagement = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  
  const [hasAppliedView, setHasAppliedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);
  const { defaultView } = useDefaultView('customers');
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();

  // Auto-navigate to default view
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/customers?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  // Reset filters when navigating to base resource
  useEffect(() => {
    if (!viewId) {
      setSearchQuery('');
      setSelectedDate(undefined);
      setHasAppliedView(false);
    }
  }, [viewId]);

  // Apply saved view filter config
  useEffect(() => {
    if (viewId && savedView && !hasAppliedView && !isLoadingView) {
      const filterConfig = savedView.filter_config as any;
      if (filterConfig.searchQuery !== undefined) {
        setSearchQuery(filterConfig.searchQuery);
      }
      if (filterConfig.selectedDate !== undefined && filterConfig.selectedDate) {
        setSelectedDate(new Date(filterConfig.selectedDate));
      }
      setHasAppliedView(true);
    }
  }, [viewId, savedView, hasAppliedView, isLoadingView]);

  // Handlers
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  const getCurrentFilterConfig = (advancedFilters?: any[], columnOrder?: string[], columnWidths?: Record<string, number>, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    return {
      searchQuery,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      columnOrder,
      columnWidths,
      sortBy,
      sortOrder,
      advancedFilters,
    };
  };

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.full_name.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          (customer.email && customer.email.toLowerCase().includes(query))
      );
    }

    if (selectedDate) {
      const filterDate = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((customer) => {
        const customerDate = format(new Date(customer.created_at), 'yyyy-MM-dd');
        return customerDate === filterDate;
      });
    }

    return filtered;
  }, [customers, searchQuery, selectedDate]);

  return {
    // Data
    customers: filteredCustomers,
    savedView,
    isLoadingCustomers,
    isLoadingView,
    
    // State
    searchQuery,
    selectedDate,
    datePickerOpen,
    isSaveViewModalOpen,
    
    // Handlers
    setSearchQuery,
    handleDateSelect,
    setDatePickerOpen,
    handleSaveViewClick,
    setIsSaveViewModalOpen,
    handleLogout,
    getCurrentFilterConfig,
  };
};







