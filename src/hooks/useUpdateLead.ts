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
      
      // Helper function to round to 2 decimal places properly
      const roundTo2Decimals = (num: number): number => {
        return Math.round((num + Number.EPSILON) * 100) / 100;
      };

      // Validate numeric fields against database constraints
      // Convert empty strings to null for numeric fields
      if ('height' in cleanUpdates) {
        if (cleanUpdates.height === '' || cleanUpdates.height === null || cleanUpdates.height === undefined) {
          cleanUpdates.height = null;
        } else {
          let height = typeof cleanUpdates.height === 'string' ? parseFloat(cleanUpdates.height) : Number(cleanUpdates.height);
          if (isNaN(height) || height > 999.99 || height < 0) {
            throw new Error('גובה חייב להיות בין 0 ל-999.99 ס"מ');
          }
          // Round to 2 decimal places to match DECIMAL(5,2) and ensure precision
          height = roundTo2Decimals(height);
          // Ensure it doesn't exceed max
          if (height > 999.99) height = 999.99;
          // Convert to string with exactly 2 decimal places to avoid precision issues
          cleanUpdates.height = parseFloat(height.toFixed(2));
        }
      }
      
      if ('weight' in cleanUpdates) {
        if (cleanUpdates.weight === '' || cleanUpdates.weight === null || cleanUpdates.weight === undefined) {
          cleanUpdates.weight = null;
        } else {
          let weight = typeof cleanUpdates.weight === 'string' ? parseFloat(cleanUpdates.weight) : Number(cleanUpdates.weight);
          if (isNaN(weight) || weight > 999.99 || weight < 0) {
            throw new Error('משקל חייב להיות בין 0 ל-999.99 ק"ג');
          }
          // Round to 2 decimal places to match DECIMAL(5,2) and ensure precision
          weight = roundTo2Decimals(weight);
          // Ensure it doesn't exceed max
          if (weight > 999.99) weight = 999.99;
          // Convert to string with exactly 2 decimal places to avoid precision issues
          cleanUpdates.weight = parseFloat(weight.toFixed(2));
        }
      }
      
      // age is INTEGER - should be reasonable (0-150)
      if ('age' in cleanUpdates) {
        if (cleanUpdates.age === '' || cleanUpdates.age === null || cleanUpdates.age === undefined) {
          cleanUpdates.age = null;
        } else {
          const age = typeof cleanUpdates.age === 'string' ? parseInt(cleanUpdates.age, 10) : Number(cleanUpdates.age);
          if (isNaN(age) || !Number.isInteger(age) || age > 150 || age < 0) {
            throw new Error('גיל חייב להיות מספר שלם בין 0 ל-150');
          }
          // Ensure it's an integer within bounds
          const intAge = Math.max(0, Math.min(150, Math.round(age)));
          cleanUpdates.age = intAge;
        }
      }
      
      // bmi is DECIMAL(4, 2) - max value is 99.99
      if ('bmi' in cleanUpdates) {
        if (cleanUpdates.bmi === '' || cleanUpdates.bmi === null || cleanUpdates.bmi === undefined) {
          cleanUpdates.bmi = null;
        } else {
          let bmi = typeof cleanUpdates.bmi === 'string' ? parseFloat(cleanUpdates.bmi) : Number(cleanUpdates.bmi);
          if (isNaN(bmi) || bmi > 99.99 || bmi < 0) {
            throw new Error('BMI חייב להיות בין 0 ל-99.99');
          }
          // Round to 2 decimal places to match DECIMAL(4,2) and ensure precision
          bmi = roundTo2Decimals(bmi);
          // Ensure it doesn't exceed max
          if (bmi > 99.99) bmi = 99.99;
          // Convert to string with exactly 2 decimal places to avoid precision issues
          cleanUpdates.bmi = parseFloat(bmi.toFixed(2));
        }
      }
      
      // If updating height or weight, pre-calculate and cap BMI to prevent overflow
      // The database trigger will recalculate BMI, but we need to ensure it doesn't exceed 99.99
      if (('height' in cleanUpdates && cleanUpdates.height !== null) || 
          ('weight' in cleanUpdates && cleanUpdates.weight !== null)) {
        // Fetch current lead to get the other value we need for BMI calculation
        const { data: currentLead } = await supabase
          .from('leads')
          .select('height, weight')
          .eq('id', leadId)
          .single();
        
        const heightForBmi = cleanUpdates.height ?? currentLead?.height;
        const weightForBmi = cleanUpdates.weight ?? currentLead?.weight;
        
        // If both height and weight are available, calculate BMI and validate it won't overflow
        if (heightForBmi && weightForBmi && heightForBmi > 0 && weightForBmi > 0) {
          const calculatedBmi = weightForBmi / Math.pow(heightForBmi / 100, 2);
          const cappedBmi = Math.min(99.99, roundTo2Decimals(calculatedBmi));
          
          // If calculated BMI exceeds 99.99, prevent the update to avoid database overflow
          if (calculatedBmi > 99.99) {
            throw new Error(`ערך BMI מחושב (${calculatedBmi.toFixed(2)}) עולה על המקסימום המותר (99.99). אנא בדוק את הגובה והמשקל.`);
          }
        }
      }
      
      // Add updated_at timestamp
      cleanUpdates.updated_at = new Date().toISOString();
      
      // Perform the update and fetch the updated data to ensure consistency
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update(cleanUpdates)
        .eq('id', leadId)
        .select('*, workout_history, steps_history, nutrition_history, supplements_history, age')
        .single();

      if (updateError) {
        console.error('useUpdateLead: Database error:', updateError);
        console.error('useUpdateLead: Update details:', { 
          leadId, 
          cleanUpdates,
          cleanUpdatesStringified: JSON.stringify(cleanUpdates, null, 2),
          numericFields: {
            height: cleanUpdates.height,
            weight: cleanUpdates.weight,
            age: cleanUpdates.age,
            bmi: cleanUpdates.bmi,
          }
        });
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
