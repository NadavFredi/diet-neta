/**
 * BudgetLinkBadge Component
 * 
 * Shows a badge indicating that a plan is linked to a budget
 */

import { Badge } from '@/components/ui/badge';
import { Link } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface BudgetLinkBadgeProps {
  budgetId: string | null | undefined;
  className?: string;
}

export const BudgetLinkBadge = ({ budgetId, className }: BudgetLinkBadgeProps) => {
  const { data: budget } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name')
        .eq('id', budgetId)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!budgetId,
  });

  if (!budgetId || !budget) return null;

  return (
    <Badge
      variant="outline"
      className={`bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5 font-medium flex items-center gap-1 ${className || ''}`}
      dir="rtl"
    >
      <Link className="h-3 w-3" />
      מקושר לתקציב: {budget.name}
    </Badge>
  );
};

