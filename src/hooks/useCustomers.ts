import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  total_leads?: number; // Aggregated count
  avatar_url?: string | null;
  total_spent?: number;
  membership_tier?: 'New' | 'Standard' | 'Premium' | 'VIP';
}

export interface CustomerWithLeads extends Customer {
  daily_protocol?: {
    stepsGoal?: number;
    workoutGoal?: number;
    supplements?: string[];
  };
  workout_history?: Array<{
    name?: string;
    startDate?: string;
    validUntil?: string;
    duration?: string;
    description?: string;
    split?: {
      strength?: number;
      cardio?: number;
      intervals?: number;
    };
    strengthCount?: number;
    cardioCount?: number;
    intervalsCount?: number;
  }>;
  steps_history?: Array<{
    weekNumber?: string;
    week?: string;
    startDate?: string;
    dates?: string;
    endDate?: string;
    target?: number;
  }>;
  leads: Array<{
    id: string;
    created_at: string;
    status_main: string | null;
    status_sub: string | null;
    source: string | null;
    fitness_goal: string | null;
    birth_date: string | null;
    height: number | null;
    weight: number | null;
    activity_level: string | null;
    preferred_time: string | null;
    notes: string | null;
    city: string | null;
    gender: string | null;
    subscription_data?: any;
  }>;
}

// Fetch all customers with lead counts
export const useCustomers = () => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['customers', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');

      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      if (!customersData || customersData.length === 0) {
        return [];
      }

      // Fetch lead counts for all customers in one query
      const customerIds = customersData.map((c: any) => c.id);
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('customer_id')
        .in('customer_id', customerIds);

      if (leadsError) throw leadsError;

      // Count leads per customer
      const leadCounts = (leadsData || []).reduce((acc: Record<string, number>, lead: any) => {
        const customerId = lead.customer_id;
        acc[customerId] = (acc[customerId] || 0) + 1;
        return acc;
      }, {});

      // Transform the data to include total_leads
      return customersData.map((customer: any) => ({
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        total_leads: leadCounts[customer.id] || 0,
      })) as Customer[];
    },
    enabled: !!user?.email,
  });
};

// Fetch a single customer with all their leads
export const useCustomer = (customerId: string | undefined) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['customer', customerId, user?.email],
    queryFn: async () => {
      if (!customerId || !user?.email) return null;

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          leads(*)
        `)
        .eq('id', customerId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        daily_protocol: data.daily_protocol || {},
        workout_history: data.workout_history || [],
        steps_history: data.steps_history || [],
        leads: (data.leads || []).map((lead: any) => ({
          id: lead.id,
          created_at: lead.created_at,
          status_main: lead.status_main,
          status_sub: lead.status_sub,
          source: lead.source,
          fitness_goal: lead.fitness_goal,
          birth_date: lead.birth_date,
          height: lead.height,
          weight: lead.weight,
          activity_level: lead.activity_level,
          preferred_time: lead.preferred_time,
          notes: lead.notes,
          city: lead.city,
          gender: lead.gender,
          subscription_data: lead.subscription_data,
        })),
      } as CustomerWithLeads;
    },
    enabled: !!customerId && !!user?.email,
  });
};
