import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface BudgetHistoryItem {
  id: string;
  budget_id: string;
  lead_id: string | null;
  changed_at: string;
  changed_by: string | null;
  change_type: 'create' | 'update' | 'nutrition_create' | 'nutrition_update' | 'workout_create' | 'workout_update' | 'supplement_create' | 'supplement_update' | 'steps_create' | 'steps_update';
  changes: {
    old?: any;
    new?: any;
  };
  snapshot?: any;
  changer_name?: string; // We might want to join with profiles/users
}

export const useBudgetHistory = (budgetId: string | undefined | null, leadId?: string | null) => {
  return useQuery({
    queryKey: ['budget-history', budgetId, leadId],
    queryFn: async () => {
      if (!budgetId) return [];

      let query = supabase
        .from('budget_history')
        .select(`
          *,
          changer:changed_by (
            email,
            full_name
          )
        `)
        .eq('budget_id', budgetId);

      // Filter by lead_id if provided
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.order('changed_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Map changer email to a displayable name if possible, or just use it
      return data.map((item: any) => ({
        ...item,
        changer_name: item.changer?.full_name || item.changer?.email || 'מערכת'
      })) as BudgetHistoryItem[];
    },
    enabled: !!budgetId,
    // Only refetch on mount and window focus, rely on cache invalidation for updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });
};
