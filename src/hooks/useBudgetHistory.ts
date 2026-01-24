import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface BudgetHistoryItem {
  id: string;
  budget_id: string;
  changed_at: string;
  changed_by: string | null;
  change_type: 'create' | 'update';
  changes: {
    old?: any;
    new?: any;
  };
  snapshot?: any;
  changer_name?: string; // We might want to join with profiles/users
}

export const useBudgetHistory = (budgetId: string | undefined | null) => {
  return useQuery({
    queryKey: ['budget-history', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from('budget_history')
        .select(`
          *,
          changer:changed_by (
            email
          )
        `)
        .eq('budget_id', budgetId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching budget history:', error);
        throw error;
      }

      // Map changer email to a displayable name if possible, or just use it
      return data.map((item: any) => ({
        ...item,
        changer_name: item.changer?.email || 'מערכת'
      })) as BudgetHistoryItem[];
    },
    enabled: !!budgetId,
  });
};
