/**
 * PaymentsManagement Logic
 * 
 * Business logic for the payments management page.
 */

import { useState, useMemo } from 'react';
import { useAllPayments } from '@/hooks/useAllPayments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { useSyncSavedViewFilters } from '@/hooks/useSyncSavedViewFilters';
import type { ActiveFilter } from '@/components/dashboard/TableFilter';
import { selectActiveFilters, selectSearchQuery } from '@/store/slices/tableStateSlice';
import { applyTableFilters } from '@/utils/tableFilterUtils';
import { getPaymentFilterFields } from '@/hooks/useTableFilters';

export const usePaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { user } = useAppSelector((state) => state.auth);
  
  const { data: payments, isLoading: isLoadingPayments, error } = useAllPayments();
  const { defaultView } = useDefaultView('payments');
  const { data: savedView, isLoading: isLoadingView } = useSavedView(viewId);

  useSyncSavedViewFilters('payments', savedView, isLoadingView);

  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'payments'));
  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'payments'));

  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const getCurrentFilterConfig = (filters: ActiveFilter[]): FilterConfig => {
    return {
      searchQuery: searchQuery || '',
      advancedFilters: filters.map((filter) => ({
        id: filter.id,
        fieldId: filter.fieldId,
        fieldLabel: filter.fieldLabel,
        operator: filter.operator,
        values: filter.values,
        type: filter.type,
      })),
    };
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments || [];

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((payment) => {
        const product = payment.product_name?.toLowerCase() || '';
        const customer = payment.customer_name?.toLowerCase() || '';
        const lead = payment.lead_name?.toLowerCase() || '';
        return product.includes(query) || customer.includes(query) || lead.includes(query);
      });
    }

    const statusMap: Record<string, string> = {
      paid: 'שולם',
      pending: 'ממתין',
      refunded: 'הוחזר',
      failed: 'נכשל',
    };

    const filterFields = getPaymentFilterFields(filtered);

    return applyTableFilters(
      filtered,
      activeFilters,
      filterFields,
      (payment, fieldId) => {
        if (fieldId === 'created_at') return payment.date;
        if (fieldId === 'status') return statusMap[payment.status] || payment.status;
        return (payment as any)[fieldId];
      }
    );
  }, [payments, searchQuery, activeFilters]);

  return {
    payments: filteredPayments,
    isLoadingPayments,
    error,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    savedView,
    isLoadingView,
    defaultView,
    viewId,
  };
};
