/**
 * useUpdateCustomer Hook
 * 
 * Hook for updating customer fields in the database.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId, updates }: { customerId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;
      return updates;
    },
    onSuccess: (_, variables) => {
      // Invalidate customer queries to refetch
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'הצלחה',
        description: 'השדה עודכן בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון השדה',
        variant: 'destructive',
      });
    },
  });
};




