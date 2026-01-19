/**
 * UnifiedProfileView Logic
 * 
 * Handles all business logic, data fetching, and state management
 * for the Unified Profile View page.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useCustomer } from '@/hooks/useCustomers';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { useLeadStatus } from '@/hooks/useLeadStatus';
import { formatPhoneNumberForWhatsApp } from '@/components/ui/phone-input';

export interface LeadData {
  id: string;
  created_at: string;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  birth_date: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  city: string | null;
  gender: string | null;
  join_date: string | null;
  subscription_data?: any;
  workout_history?: any;
  steps_history?: any;
  nutrition_history?: any;
  supplements_history?: any;
  assigned_to: string | null;
  customer_id: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  date: string;
}

export const useUnifiedProfileView = () => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const updateLead = useUpdateLead();

  // Determine route type
  const isLeadRoute = location.pathname.startsWith('/leads/');
  const isCustomerRoute = location.pathname.startsWith('/dashboard/customers/');
  const routeId = params.id;

  // State
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | undefined>(undefined);
  const [selectedInterestId, setSelectedInterestId] = useState<string | undefined>(undefined);

  // Fetch lead data if coming from /leads/:id route
  const { data: leadData } = useQuery({
    queryKey: ['lead-for-customer', routeId],
    queryFn: async () => {
      if (!routeId || !isLeadRoute) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('customer_id, id')
        .eq('id', routeId)
        .single();
      if (error) throw error;
      return data as { customer_id: string; id: string };
    },
    enabled: !!routeId && isLeadRoute,
  });

  // Resolve customer ID based on route
  useEffect(() => {
    if (isLeadRoute && leadData) {
      setResolvedCustomerId(leadData.customer_id);
      setSelectedInterestId(leadData.id);
    } else if (isCustomerRoute && routeId) {
      setResolvedCustomerId(routeId);
    }
  }, [isLeadRoute, isCustomerRoute, leadData, routeId]);

  // Fetch customer with all leads
  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(resolvedCustomerId);

  // Sort leads by date (most recent first)
  const sortedLeads = useMemo(() => {
    if (!customer?.leads) return [];
    return [...customer.leads].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [customer?.leads]);

  // Auto-select most recent lead
  useEffect(() => {
    if (!selectedInterestId && sortedLeads.length > 0) {
      setSelectedInterestId(sortedLeads[0].id);
    }
  }, [sortedLeads, selectedInterestId]);

  // Update selected lead when route changes
  useEffect(() => {
    if (isLeadRoute && leadData?.id && leadData.id !== selectedInterestId) {
      setSelectedInterestId(leadData.id);
    }
  }, [isLeadRoute, leadData, selectedInterestId]);

  // Fetch active lead data
  const { data: activeLead, isLoading: isLoadingLead } = useQuery({
    queryKey: ['lead', selectedInterestId],
    queryFn: async () => {
      if (!selectedInterestId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', selectedInterestId)
        .single();
      if (error) throw error;
      console.log('[UnifiedProfileView] Fetched lead data:', { id: data?.id, age: data?.age, birth_date: data?.birth_date });
      return data as LeadData;
    },
    enabled: !!selectedInterestId,
  });

  // Get most recent lead for top banner (MUST be before statusManagement)
  const mostRecentLead = sortedLeads && sortedLeads.length > 0 ? sortedLeads[0] : null;
  const mostRecentLeadStatus = mostRecentLead?.status_sub || mostRecentLead?.status_main || 'ללא סטטוס';

  // Status management for selected lead
  const statusManagement = useLeadStatus(
    selectedInterestId || mostRecentLead?.id || '', 
    activeLead?.status_sub || activeLead?.status_main || mostRecentLeadStatus
  );

  // Handlers
  const handleBack = () => navigate('/dashboard');

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone.replace(/-/g, '')}`;
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const phoneNumber = formatPhoneNumberForWhatsApp(customer.phone);
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handleInterestSelect = (leadId: string) => {
    setSelectedInterestId(leadId);
    if (isLeadRoute) {
      navigate(`/leads/${leadId}`, { replace: true });
    }
  };

  // Extract subscription data
  const subscriptionData = activeLead?.subscription_data || {};
  
  // Calculate products from subscription
  const products: Product[] = useMemo(() => {
    const items: Product[] = [];
    if (subscriptionData.months > 0) {
      items.push({
        id: 'subscription',
        name: `חבילת מנוי - ${subscriptionData.months} חודשים`,
        price: subscriptionData.initialPrice || 0,
        quantity: 1,
        date: activeLead?.join_date || activeLead?.created_at || '',
      });
    }
    if (subscriptionData.renewalPrice > 0) {
      items.push({
        id: 'renewal',
        name: 'חידוש חודשי',
        price: subscriptionData.renewalPrice,
        quantity: 1,
        date: activeLead?.join_date || activeLead?.created_at || '',
      });
    }
    return items;
  }, [subscriptionData, activeLead]);

  // Calculate age
  const calculateAge = (birthDate: string | null): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Use age directly from database, or calculate from birth_date as fallback
  const customerAge = activeLead?.age !== null && activeLead?.age !== undefined 
    ? activeLead.age 
    : (activeLead?.birth_date ? calculateAge(activeLead.birth_date) : 0);
  const displayStatus = activeLead?.status_sub || activeLead?.status_main || 'ללא סטטוס';

  // Calculate profile stats for Rich Hero
  const totalSpent = useMemo(() => {
    if (!customer?.leads) return 0;
    return customer.leads.reduce((total, lead) => {
      const subData = lead.subscription_data || {};
      return total + (subData.initialPrice || 0) + ((subData.renewalPrice || 0) * (subData.months || 0));
    }, 0);
  }, [customer?.leads]);

  const lastVisit = useMemo(() => {
    if (!sortedLeads || sortedLeads.length === 0) return null;
    return sortedLeads[0].created_at;
  }, [sortedLeads]);

  const membershipTier = useMemo(() => {
    if (totalSpent >= 5000) return 'VIP';
    if (totalSpent >= 2000) return 'Premium';
    if (totalSpent >= 500) return 'Standard';
    return 'New';
  }, [totalSpent]);

  const totalLeads = sortedLeads?.length || 0;
  const activeLeadsCount = sortedLeads?.filter(lead => 
    lead.status_sub === 'פעיל' || lead.status_main === 'פעיל'
  ).length || 0;

  return {
    // Data
    customer,
    activeLead,
    sortedLeads,
    products,
    subscriptionData,
    displayStatus,
    customerAge,
    selectedInterestId,
    
    // Profile Stats
    totalSpent,
    lastVisit,
    membershipTier,
    totalLeads,
    activeLeadsCount,
    
    // Most Recent Lead (for top banner) - already declared above
    mostRecentLead,
    mostRecentLeadStatus,
    
    // Loading states
    isLoadingCustomer: isLoadingCustomer || (isLeadRoute && !leadData),
    isLoadingLead,
    
    // Handlers
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
    handleInterestSelect,
    
    // Status management
    statusManagement,
    
    // Update functions
    updateLead,
  };
};

// Helper to get customer initials for avatar
export const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Status color mapping
export const getStatusColor = (status: string | null) => {
  if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'פעיל') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'לא פעיל') return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'מתקדמת לתהליך') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
      status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  // Legacy statuses
  switch (status) {
    case 'חדש':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'בטיפול':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'הושלם':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Get status border color for list items
export const getStatusBorderColor = (status: string | null) => {
  if (!status) return 'border-r-gray-300';
  if (status === 'פעיל' || status === 'מתקדמת לתהליך') return 'border-r-emerald-500';
  if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
      status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
    return 'border-r-red-500';
  }
  if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי' || status === 'חדש') {
    return 'border-r-blue-500';
  }
  if (status === 'בטיפול') return 'border-r-amber-500';
  if (status === 'הושלם') return 'border-r-emerald-500';
  return 'border-r-gray-300';
};







