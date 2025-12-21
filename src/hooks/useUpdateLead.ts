/**
 * useUpdateLead Hook
 * 
 * Hook for updating lead fields in the database with optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: Record<string, any> }) => {
      console.log('useUpdateLead: Updating lead:', { leadId, updates });
      
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      if (Object.keys(cleanUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }
      
      // Perform the update - fast path, no select needed
      // Optimistic updates already handle the UI immediately
      const { error: updateError } = await supabase
        .from('leads')
        .update(cleanUpdates)
        .eq('id', leadId);

      if (updateError) {
        console.error('useUpdateLead: Database error:', updateError);
        throw new Error(`Failed to update lead: ${updateError.message}`);
      }
      
      // Return the updates - optimistic update already updated the UI
      // We'll fetch fresh data in onSuccess if needed, but don't block here
      console.log('useUpdateLead: Update successful');
      return cleanUpdates;
    },
    onMutate: async ({ leadId, updates }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      await queryClient.cancelQueries({ queryKey: ['customer'] });
      
      // Snapshot the previous value for rollback
      const previousLead = queryClient.getQueryData(['lead', leadId]);
      const previousCustomers = queryClient.getQueriesData({ queryKey: ['customer'] });
      
      // Optimistically update the lead query
      queryClient.setQueryData(['lead', leadId], (old: any) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
      
      // Optimistically update customer queries that contain this lead
      previousCustomers.forEach(([queryKey, customerData]: [any, any]) => {
        if (customerData?.leads) {
          queryClient.setQueryData(queryKey, {
            ...customerData,
            leads: customerData.leads.map((lead: any) =>
              lead.id === leadId ? { ...lead, ...updates } : lead
            ),
          });
        }
      });
      
      return { previousLead, previousCustomers };
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', variables.leadId], context.previousLead);
      }
      if (context?.previousCustomers) {
        context.previousCustomers.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      console.error('useUpdateLead: Error updating lead:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון השדה',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Optimistic update already updated the UI, so we're done
      // Just invalidate queries in the background for eventual consistency
      // This is non-blocking and won't delay the user experience
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-for-customer'] });
      queryClient.invalidateQueries({ queryKey: ['filtered-leads'] });
      
      console.log('Lead update successful:', { leadId: variables.leadId, updates: variables.updates });
      
      toast({
        title: 'הצלחה',
        description: 'השדה עודכן בהצלחה',
      });
    },
  });
};
