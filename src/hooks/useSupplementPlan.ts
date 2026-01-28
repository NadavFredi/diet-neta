import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export interface SupplementPlan {
  id: string;
  user_id: string;
  lead_id?: string;
  budget_id?: string | null;
  start_date: string;
  description?: string;
  supplements: any[];
  created_at: string;
  updated_at: string;
}

export const useSupplementPlan = (customerId?: string) => {
  const [supplementPlan, setSupplementPlan] = useState<SupplementPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    fetchSupplementPlan();
    
    // Set up polling to sync with budget changes (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchSupplementPlan();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [customerId]);

  const fetchSupplementPlan = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('supplement_plans')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSupplementPlan(data as SupplementPlan);
      } else {
        setSupplementPlan(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplement plan');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    supplementPlan,
    isLoading,
    error,
    fetchSupplementPlan,
  };
};
