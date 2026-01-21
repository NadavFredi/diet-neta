/**
 * CollectionDetailView Logic
 * 
 * Business logic for the collection detail view page.
 * Matches the structure and functionality of MeetingDetailView and PaymentDetailView.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import { useCustomer } from '@/hooks/useCustomers';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { selectCustomerNotes, fetchCustomerNotes } from '@/store/slices/leadViewSlice';
import { useToast } from '@/hooks/use-toast';

export const useCollectionDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  const { data: collection, isLoading } = useCollection(id || null);

  // Get customer from collection
  const customerId = collection?.customer_id;
  const { data: customer } = useCustomer(customerId || null);

  // Get lead data for ClientHero
  const { data: leadData } = useQuery({
    queryKey: ['lead', collection?.lead_id],
    queryFn: async () => {
      if (!collection?.lead_id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', collection.lead_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!collection?.lead_id,
  });

  // Fetch all leads for the customer (for history sidebar)
  const { data: allLeads } = useQuery({
    queryKey: ['leads-for-customer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // Sort leads by created_at descending (most recent first)
  const sortedLeads = allLeads || [];

  // Update handlers for ClientHero
  const updateLead = useUpdateLead();
  const updateCustomer = useUpdateCustomer();

  // Modal state management
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isTraineeSettingsOpen, setIsTraineeSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get sidebar states from Redux
  const notesOpen = useAppSelector((state) => state.leadView.notesOpen);
  const leftSidebar = useAppSelector((state) => state.leadView.leftSidebar);

  // Get notes count for the customer
  const customerNotesSelector = useMemo(
    () => selectCustomerNotes(customer?.id),
    [customer?.id]
  );
  const notes = useAppSelector(customerNotesSelector);
  const notesCount = notes?.length || 0;

  // Fetch notes when customer changes
  useEffect(() => {
    if (customer?.id) {
      dispatch(fetchCustomerNotes(customer.id));
    }
  }, [customer?.id, dispatch]);

  const handleBack = () => {
    // Check if we have a return URL from location state
    const returnTo = (location.state as any)?.returnTo;
    if (returnTo) {
      navigate(returnTo);
    } else {
      // Default to collections list page
      navigate('/dashboard/collections');
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleWhatsApp = () => {
    const phone = customer?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleUpdateLead = async (updates: any) => {
    if (!leadData?.id) return;
    await updateLead.mutateAsync({
      leadId: leadData.id,
      updates,
    });
  };

  const handleUpdateCustomer = async (updates: any) => {
    if (!customer?.id) return;
    await updateCustomer.mutateAsync({
      customerId: customer.id,
      updates,
    });
  };

  const handleViewCustomerProfile = () => {
    if (customer?.id) {
      navigate(`/leads/${collection?.lead_id || customer.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    const statusStr = String(status);
    if (statusStr.includes('בוטל') || statusStr.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusStr.includes('הושלם') || statusStr.includes('שולם')) return 'bg-green-50 text-green-700 border-green-200';
    if (statusStr.includes('מתוכנן') || statusStr.includes('ממתין')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (statusStr.includes('חלקי')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Collection status configuration
  const getStatusConfig = (status: string) => {
    const statusStr = String(status);
    if (statusStr === 'הושלם') {
      return { label: 'הושלם', className: 'bg-green-50 text-green-700 border-green-200' };
    }
    if (statusStr === 'חלקי') {
      return { label: 'חלקי', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (statusStr === 'ממתין') {
      return { label: 'ממתין', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    }
    if (statusStr === 'בוטל') {
      return { label: 'בוטל', className: 'bg-red-50 text-red-700 border-red-200' };
    }
    return { label: statusStr, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const formattedTotalAmount = collection
    ? new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(collection.total_amount)
    : '₪ 0.00';

  const formattedPaidAmount = collection
    ? new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(collection.paid_amount || 0)
    : '₪ 0.00';

  const formattedRemainingAmount = collection
    ? new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(collection.remaining_amount || 0)
    : '₪ 0.00';

  return {
    collection,
    isLoading,
    customer,
    leadData,
    sortedLeads,
    user,
    notesOpen,
    leftSidebar,
    notesCount,
    isPaymentHistoryOpen,
    setIsPaymentHistoryOpen,
    isTraineeSettingsOpen,
    setIsTraineeSettingsOpen,
    isExpanded,
    setIsExpanded,
    handleBack,
    handleLogout,
    handleWhatsApp,
    handleUpdateLead,
    handleUpdateCustomer,
    handleViewCustomerProfile,
    getStatusColor,
    getStatusConfig,
    formattedTotalAmount,
    formattedPaidAmount,
    formattedRemainingAmount,
  };
};
