/**
 * PaymentsManagement Logic
 * 
 * Business logic for the payments management page.
 */

import { useAllPayments } from '@/hooks/useAllPayments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export const usePaymentsManagement = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const { data: payments, isLoading: isLoadingPayments, error } = useAllPayments();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return {
    payments: payments || [],
    isLoadingPayments,
    error,
    user,
    handleLogout,
  };
};
