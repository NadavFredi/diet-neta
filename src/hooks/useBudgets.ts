/**
 * Budget (Taktziv) Hooks
 * 
 * React Query hooks for budget data fetching and mutations
 * Follows the same pattern as useNutritionTemplates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { Budget, BudgetAssignment, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import { syncPlansFromBudget } from '@/services/budgetPlanSync';

// Note: We now use user.id from Redux auth state instead of getUserIdFromEmail
// This eliminates redundant API calls to getUser() and profiles table

// Fetch all budgets (public + user's own)
export const useBudgets = (filters?: { search?: string; isPublic?: boolean }) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['budgets', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call
      let query = supabase
        .from('budgets')
        .select(`
          *,
          workout_template:workout_templates(id, name),
          nutrition_template:nutrition_templates(id, name)
        `)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply public filter
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budgets:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התקציבים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as Budget[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch a single budget by ID
export const useBudget = (budgetId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['budget', budgetId, user?.id],
    queryFn: async () => {
      if (!budgetId) return null;
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as Budget | null;
    },
    enabled: !!budgetId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Fetch active budget for a lead
export const useActiveBudgetForLead = (leadId: string | null) => {
  return useQuery({
    queryKey: ['budgetAssignment', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('budget_assignments')
        .select(`
          *,
          budget:budgets(*)
        `)
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as (BudgetAssignment & { budget: Budget }) | null;
    },
    enabled: !!leadId,
  });
};

// Fetch active budget for a customer
export const useActiveBudgetForCustomer = (customerId: string | null) => {
  return useQuery({
    queryKey: ['budgetAssignment', 'customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('budget_assignments')
        .select(`
          *,
          budget:budgets(*)
        `)
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as (BudgetAssignment & { budget: Budget }) | null;
    },
    enabled: !!customerId,
  });
};

// Create a new budget
export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      description,
      nutrition_template_id,
      nutrition_targets,
      steps_goal,
      steps_instructions,
      workout_template_id,
      supplements,
      eating_order,
      eating_rules,
      is_public = false,
    }: {
      name: string;
      description?: string;
      nutrition_template_id?: string | null;
      nutrition_targets: NutritionTargets;
      steps_goal: number;
      steps_instructions?: string | null;
      workout_template_id?: string | null;
      supplements: Supplement[];
      eating_order?: string | null;
      eating_rules?: string | null;
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          name,
          description: description || null,
          nutrition_template_id: nutrition_template_id || null,
          nutrition_targets,
          steps_goal,
          steps_instructions: steps_instructions || null,
          workout_template_id: workout_template_id || null,
          supplements,
          eating_order: eating_order || null,
          eating_rules: eating_rules || null,
          is_public,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating budget:', error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התקציבים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as Budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// Update an existing budget
export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      budgetId,
      ...updates
    }: {
      budgetId: string;
      name?: string;
      description?: string;
      nutrition_template_id?: string | null;
      nutrition_targets?: NutritionTargets;
      steps_goal?: number;
      steps_instructions?: string | null;
      workout_template_id?: string | null;
      supplements?: Supplement[];
      eating_order?: string | null;
      eating_rules?: string | null;
      is_public?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const updateData: Partial<Budget> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== 'budgetId' && updates[key as keyof typeof updates] !== undefined) {
          (updateData as any)[key] = updates[key as keyof typeof updates];
        }
      });

      const { data, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', budgetId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget', data.id] });
    },
  });
};

// Delete a budget
export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('created_by', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// Assign budget to lead
export const useAssignBudgetToLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      budgetId,
      leadId,
      notes,
    }: {
      budgetId: string;
      leadId: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      // Fetch the budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (budgetError) throw budgetError;
      if (!budget) throw new Error('Budget not found');

      // Get lead data to find customer_id
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('customer_id')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      const customerId = lead?.customer_id || null;

      // Deactivate any existing active budget for this lead
      await supabase
        .from('budget_assignments')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);

      // If lead has a customer, also deactivate any existing active budget for that customer
      if (customerId) {
        await supabase
          .from('budget_assignments')
          .update({ is_active: false })
          .eq('customer_id', customerId)
          .eq('is_active', true);
      }

      // Create new lead assignment
      const { data, error } = await supabase
        .from('budget_assignments')
        .insert({
          budget_id: budgetId,
          lead_id: leadId,
          assigned_by: userId,
          is_active: true,
          notes: notes || null,
        })
        .select(`
          *,
          budget:budgets(*)
        `)
        .single();

      if (error) throw error;

      // If lead has a customer, also create a customer assignment
      if (customerId) {
        const { error: customerAssignmentError } = await supabase
          .from('budget_assignments')
          .insert({
            budget_id: budgetId,
            customer_id: customerId,
            assigned_by: userId,
            is_active: true,
            notes: notes ? `${notes} (הוקצה אוטומטית דרך ליד)` : 'הוקצה אוטומטית דרך ליד',
          });

        if (customerAssignmentError) {
          console.error('[useAssignBudgetToLead] Error creating customer assignment:', customerAssignmentError);
          // Don't throw - lead assignment succeeded, just log the error
        } else {
          console.log('[useAssignBudgetToLead] ✅ Customer assignment created automatically:', {
            customerId,
            budgetId,
          });
        }
      }

      // Auto-sync plans from budget
      try {
        console.log('[useAssignBudgetToLead] Starting plan sync:', {
          budgetId: budget.id,
          budgetName: budget.name,
          leadId,
          customerId: customerId,
          hasStepsGoal: !!budget.steps_goal,
          stepsGoal: budget.steps_goal,
          hasWorkoutTemplate: !!budget.workout_template_id,
          hasNutritionTemplate: !!budget.nutrition_template_id,
          hasSupplements: !!(budget.supplements && budget.supplements.length > 0),
        });

        const syncResult = await syncPlansFromBudget({
          budget: budget as Budget,
          customerId: customerId,
          leadId,
          userId,
        });

        console.log('[useAssignBudgetToLead] ✅ Plan sync completed:', syncResult);
      } catch (syncError: any) {
        console.error('[useAssignBudgetToLead] ❌ Error syncing plans from budget:', syncError);
        console.error('[useAssignBudgetToLead] Error details:', {
          message: syncError?.message,
          stack: syncError?.stack,
          error: syncError,
        });
        // Don't throw - assignment succeeded, just log the error
      }

      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: async (_, variables) => {
      // Get customerId from lead for query invalidation
      const { data: leadData } = await supabase
        .from('leads')
        .select('customer_id')
        .eq('id', variables.leadId)
        .single();
      
      const customerId = leadData?.customer_id || null;
      
      // Invalidate all relevant queries to refresh the UI
      const invalidationPromises = [
        queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'lead', variables.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['budget-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }), // This invalidates all plans-history queries
        queryClient.invalidateQueries({ queryKey: ['plans-history', customerId, variables.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['steps-plans'] }),
      ];

      // Also invalidate customer assignment queries if customer exists
      if (customerId) {
        invalidationPromises.push(
          queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer', customerId] })
        );
      }

      await Promise.all(invalidationPromises);
      
      // Force refetch to ensure UI updates immediately
      if (customerId || variables.leadId) {
        await queryClient.refetchQueries({ queryKey: ['plans-history', customerId, variables.leadId] });
      }
    },
  });
};

// Assign budget to customer
export const useAssignBudgetToCustomer = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      budgetId,
      customerId,
      notes,
    }: {
      budgetId: string;
      customerId: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call

      // Fetch the budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (budgetError) throw budgetError;
      if (!budget) throw new Error('Budget not found');

      // Deactivate any existing active budget for this customer
      await supabase
        .from('budget_assignments')
        .update({ is_active: false })
        .eq('customer_id', customerId)
        .eq('is_active', true);

      // Create new assignment
      const { data, error } = await supabase
        .from('budget_assignments')
        .insert({
          budget_id: budgetId,
          customer_id: customerId,
          assigned_by: userId,
          is_active: true,
          notes: notes || null,
        })
        .select(`
          *,
          budget:budgets(*)
        `)
        .single();

      if (error) throw error;

      // Auto-sync plans from budget
      try {
        console.log('[useAssignBudgetToCustomer] Starting plan sync:', {
          budgetId: budget.id,
          budgetName: budget.name,
          customerId,
          hasStepsGoal: !!budget.steps_goal,
          stepsGoal: budget.steps_goal,
          hasWorkoutTemplate: !!budget.workout_template_id,
          hasNutritionTemplate: !!budget.nutrition_template_id,
          hasSupplements: !!(budget.supplements && budget.supplements.length > 0),
        });

        const syncResult = await syncPlansFromBudget({
          budget: budget as Budget,
          customerId,
          leadId: null,
          userId,
        });

        console.log('[useAssignBudgetToCustomer] ✅ Plan sync completed:', syncResult);
      } catch (syncError: any) {
        console.error('[useAssignBudgetToCustomer] ❌ Error syncing plans from budget:', syncError);
        console.error('[useAssignBudgetToCustomer] Error details:', {
          message: syncError?.message,
          stack: syncError?.stack,
          error: syncError,
        });
        // Don't throw - assignment succeeded, just log the error
      }

      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: async (_, variables) => {
      // Invalidate all relevant queries to refresh the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer', variables.customerId] }),
        queryClient.invalidateQueries({ queryKey: ['budget-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }), // This invalidates all plans-history queries
        queryClient.invalidateQueries({ queryKey: ['plans-history', variables.customerId, undefined] }),
        queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['steps-plans'] }),
      ]);
      
      // Force refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ['plans-history', variables.customerId, undefined] });
    },
  });
};

// Delete a budget assignment and all associated plans
export const useDeleteBudgetAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First, get the assignment to find the budget_id
      // Using * to ensure RLS policies can properly evaluate (they need to check the budgets table)
      const { data: assignment, error: assignmentError } = await supabase
        .from('budget_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error('Budget assignment not found');

      const budgetId = assignment.budget_id;
      const leadId = assignment.lead_id;
      const customerId = assignment.customer_id;

      // Delete all plans associated with this budget assignment
      // Delete workout plans
      if (leadId) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('lead_id', leadId);
      } else if (customerId) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('customer_id', customerId);
      }

      // Delete nutrition plans
      if (leadId) {
        await supabase
          .from('nutrition_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('lead_id', leadId);
      } else if (customerId) {
        await supabase
          .from('nutrition_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('customer_id', customerId);
      }

      // Delete supplement plans
      if (leadId) {
        await supabase
          .from('supplement_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('lead_id', leadId);
      } else if (customerId) {
        await supabase
          .from('supplement_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('customer_id', customerId);
      }

      // Delete steps plans
      if (leadId) {
        await supabase
          .from('steps_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('lead_id', leadId);
      } else if (customerId) {
        await supabase
          .from('steps_plans')
          .delete()
          .eq('budget_id', budgetId)
          .eq('customer_id', customerId);
      }

      // Finally, delete the budget assignment itself
      const { error } = await supabase
        .from('budget_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      return { assignmentId, budgetId, leadId, customerId };
    },
    onSuccess: async (data) => {
      // Invalidate all relevant queries to refresh the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budget-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['supplementPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
        queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['supplement-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['steps-plans'] }),
      ]);

      // Invalidate specific queries based on lead/customer
      if (data.leadId) {
        await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'lead', data.leadId] });
        await queryClient.invalidateQueries({ queryKey: ['plans-history', undefined, data.leadId] });
      }
      if (data.customerId) {
        await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer', data.customerId] });
        await queryClient.invalidateQueries({ queryKey: ['plans-history', data.customerId, undefined] });
      }
    },
  });
};

