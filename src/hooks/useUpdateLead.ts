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
      
      // Filter out undefined values and null values that shouldn't be updated
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      if (Object.keys(cleanUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }
      
      // Add updated_at timestamp
      cleanUpdates.updated_at = new Date().toISOString();
      
      // Perform the update and fetch the updated data to ensure consistency
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update(cleanUpdates)
        .eq('id', leadId)
        .select('*, workout_history, steps_history, nutrition_history, supplements_history')
        .single();

      if (updateError) {
        console.error('useUpdateLead: Database error:', updateError);
        console.error('useUpdateLead: Update details:', { leadId, cleanUpdates });
        throw new Error(`Failed to update lead: ${updateError.message}`);
      }
      
      if (!updatedLead) {
        throw new Error('Update succeeded but no data returned');
      }
      
      // Return the updated lead data
      console.log('useUpdateLead: Update successful', { leadId, updates: cleanUpdates, updatedLead });
      return updatedLead;
    },
    onMutate: async ({ leadId, updates }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      await queryClient.cancelQueries({ queryKey: ['lead-for-customer'] });
      await queryClient.cancelQueries({ queryKey: ['customer'] });
      
      // Snapshot the previous value for rollback
      const previousLead = queryClient.getQueryData(['lead', leadId]);
      const previousCustomers = queryClient.getQueriesData({ queryKey: ['customer'] });
      const previousLeadForCustomer = queryClient.getQueriesData({ queryKey: ['lead-for-customer'] });
      
      // Optimistically update the lead query - merge updates properly
      queryClient.setQueryData(['lead', leadId], (old: any) => {
        if (!old) {
          console.warn('useUpdateLead: No existing lead data found for optimistic update', leadId);
          return old;
        }
        // Deep merge to handle nested objects like subscription_data
        const merged = { ...old };
        Object.keys(updates).forEach(key => {
          if (key === 'subscription_data' && typeof updates[key] === 'object' && typeof old[key] === 'object') {
            merged[key] = { ...old[key], ...updates[key] };
          } else {
            merged[key] = updates[key];
          }
        });
        console.log('useUpdateLead: Optimistic update applied', { leadId, updates, merged });
        return merged;
      });
      
      // Optimistically update customer queries that contain this lead
      previousCustomers.forEach(([queryKey, customerData]: [any, any]) => {
        if (customerData?.leads && Array.isArray(customerData.leads)) {
          const updatedLeads = customerData.leads.map((lead: any) => {
            if (lead.id === leadId) {
              // Deep merge for nested objects
              const merged = { ...lead };
              Object.keys(updates).forEach(key => {
                if (key === 'subscription_data' && typeof updates[key] === 'object' && typeof lead[key] === 'object') {
                  merged[key] = { ...lead[key], ...updates[key] };
                } else {
                  merged[key] = updates[key];
                }
              });
              return merged;
            }
            return lead;
          });
          queryClient.setQueryData(queryKey, {
            ...customerData,
            leads: updatedLeads,
          });
        }
      });
      
      return { previousLead, previousCustomers, previousLeadForCustomer };
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
      if (context?.previousLeadForCustomer) {
        context.previousLeadForCustomer.forEach(([queryKey, data]: [any, any]) => {
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
    onSuccess: async (updatedLead, variables) => {
      console.log('useUpdateLead: onSuccess called', { updatedLead, variables });
      
      // Update the query cache with the fresh data from the database
      // This ensures the UI shows the correct data immediately
      if (updatedLead) {
        // Update the main lead query
        queryClient.setQueryData(['lead', variables.leadId], updatedLead);
        console.log('useUpdateLead: Updated lead query cache', ['lead', variables.leadId]);
        
        // Also update customer queries that contain this lead
        const customerQueries = queryClient.getQueriesData({ queryKey: ['customer'] });
        customerQueries.forEach(([queryKey, customerData]: [any, any]) => {
          if (customerData?.leads && Array.isArray(customerData.leads)) {
            const updatedLeads = customerData.leads.map((lead: any) =>
              lead.id === variables.leadId ? updatedLead : lead
            );
            queryClient.setQueryData(queryKey, {
              ...customerData,
              leads: updatedLeads,
            });
            console.log('useUpdateLead: Updated customer query cache', queryKey);
          }
        });
        
        // Also update lead-for-customer queries
        const leadForCustomerQueries = queryClient.getQueriesData({ queryKey: ['lead-for-customer'] });
        leadForCustomerQueries.forEach(([queryKey, data]: [any, any]) => {
          if (data?.id === variables.leadId) {
            queryClient.setQueryData(queryKey, { ...data, ...updatedLead });
            console.log('useUpdateLead: Updated lead-for-customer query cache', queryKey);
          }
        });
      }
      
      // Invalidate queries to trigger refetch in the background
      // Don't await - let it happen in the background
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['lead-for-customer'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['filtered-leads'] });
      
      console.log('Lead update successful:', { leadId: variables.leadId, updates: variables.updates, updatedLead });
      
      toast({
        title: 'הצלחה',
        description: 'השדה עודכן בהצלחה',
      });
    },
  });
};
