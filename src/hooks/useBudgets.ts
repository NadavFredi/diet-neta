/**
 * Budget (Taktziv) Hooks
 * 
 * React Query hooks for budget data fetching and mutations
 * Follows the same pattern as useNutritionTemplates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { FilterGroup } from '@/components/dashboard/TableFilter';
import { applyFilterGroupToQuery, type FilterFieldConfigMap } from '@/utils/postgrestFilterUtils';
import { createSearchGroup, mergeFilterGroups } from '@/utils/filterGroupUtils';
import type { Budget, BudgetAssignment, NutritionTargets, Supplement } from '@/store/slices/budgetSlice';
import { syncPlansFromBudget } from '@/services/budgetPlanSync';

// Note: We now use user.id from Redux auth state instead of getUserIdFromEmail
// This eliminates redundant API calls to getUser() and profiles table

// Fetch all budgets (public + user's own)
export const useBudgets = (filters?: { 
  search?: string; 
  filterGroup?: FilterGroup | null;
  page?: number;
  pageSize?: number;
  groupByLevel1?: string | null;
  groupByLevel2?: string | null;
}) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery<{ data: Budget[]; totalCount: number }>({
    queryKey: ['budgets', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const userId = user.id; // Use user.id from Redux instead of API call
      const fieldConfigs: FilterFieldConfigMap = {
        created_at: { column: 'created_at', type: 'date' },
        is_public: { column: 'is_public', type: 'select', valueMap: (value) => (value === 'כן' ? true : value === 'לא' ? false : value) },
        steps_goal: { column: 'steps_goal', type: 'number' },
        name: { column: 'name', type: 'text' },
      };

      const accessGroup: FilterGroup = {
        id: `access-${userId}`,
        operator: 'or',
        children: [
          {
            id: `public-${userId}`,
            fieldId: 'is_public',
            fieldLabel: 'is_public',
            operator: 'is',
            values: ['כן'],
            type: 'select',
          },
          {
            id: `owner-${userId}`,
            fieldId: 'created_by',
            fieldLabel: 'created_by',
            operator: 'is',
            values: [userId],
            type: 'select',
          },
        ],
      };

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 100;
      
      const searchGroup = filters?.search ? createSearchGroup(filters.search, ['name']) : null;
      const combinedGroup = mergeFilterGroups(accessGroup, mergeFilterGroups(filters?.filterGroup || null, searchGroup));

      // When grouping is active, fetch ALL matching records (no pagination)
      const isGroupingActive = !!(filters?.groupByLevel1 || filters?.groupByLevel2);
      
      // Map groupBy columns to database columns
      const groupByMap: Record<string, string> = {
        name: 'name',
        is_public: 'is_public',
        created_at: 'created_at',
        steps_goal: 'steps_goal',
      };

      let query = supabase
        .from('budgets')
        .select(`
          *,
          workout_template:workout_templates(id, name),
          nutrition_template:nutrition_templates(id, name)
        `);

      // Only apply pagination if grouping is NOT active
      if (!isGroupingActive) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      // Apply grouping as ORDER BY (for proper sorting before client-side grouping)
      if (filters?.groupByLevel1 && groupByMap[filters.groupByLevel1]) {
        query = query.order(groupByMap[filters.groupByLevel1], { ascending: true });
      }
      if (filters?.groupByLevel2 && groupByMap[filters.groupByLevel2]) {
        query = query.order(groupByMap[filters.groupByLevel2], { ascending: true });
      }
      
      // Apply default sorting if no grouping
      if (!filters?.groupByLevel1 && !filters?.groupByLevel2) {
        query = query.order('created_at', { ascending: false });
      }

      if (combinedGroup) {
        query = applyFilterGroupToQuery(query, combinedGroup, fieldConfigs);
      }

      // Get total count for pagination (only when not grouping)
      let totalCount = 0;
      if (!isGroupingActive) {
        let countQuery = supabase
          .from('budgets')
          .select('id', { count: 'exact', head: true });

        if (combinedGroup) {
          countQuery = applyFilterGroupToQuery(countQuery, combinedGroup, fieldConfigs);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        totalCount = count || 0;
      }

      const { data, error } = await query;
  
        if (error) {
          if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התקציבים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }

      // Filter out any invalid budgets (ensure name exists and budget is valid)
      const validBudgets = (data || []).filter((budget: any) => {
        // Ensure budget has required fields
        return budget &&
          budget.id &&
          budget.name &&
          budget.name.trim() !== '' &&
          (budget.is_public === true || budget.created_by === userId);
      });

      // When grouping is active, totalCount is the length of all fetched data
      if (isGroupingActive) {
        totalCount = validBudgets.length;
      }

      return { data: validBudgets as Budget[], totalCount };
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
    refetchInterval: 30000, // Refetch every 30 seconds to sync with manager portal
    staleTime: 10000, // Consider data stale after 10 seconds
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
    refetchInterval: 30000, // Refetch every 30 seconds to sync with manager portal
    staleTime: 10000, // Consider data stale after 10 seconds
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
          if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('טבלת התקציבים לא נמצאה. אנא ודא שהמיגרציה הופעלה בהצלחה.');
        }
        throw error;
      }
      return data as Budget;
    },
    onSuccess: () => {
      // Invalidate all budget queries to ensure new budget appears everywhere
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      // Also refetch immediately to update UI
      queryClient.refetchQueries({ queryKey: ['budgets'] });
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

      // Explicitly ensure workout_template_id is included if provided (even if null)
      if ('workout_template_id' in updates) {
        updateData.workout_template_id = updates.workout_template_id ?? null;
      }

      const { data, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', budgetId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Budget;
    },
    onSuccess: (data) => {
      // Invalidate all budget queries to ensure updated budget appears everywhere
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget', data.id] });
      // Also refetch immediately to update UI
      queryClient.refetchQueries({ queryKey: ['budgets'] });
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
      // Invalidate all budget queries to ensure deleted budget is removed everywhere
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      // Also refetch immediately to update UI
      queryClient.refetchQueries({ queryKey: ['budgets'] });
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

      // Deactivate any existing active budget for this lead
      await supabase
        .from('budget_assignments')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);

      // Create new assignment
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

      // Auto-sync plans from budget
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', leadId)
          .single();

        const syncResult = await syncPlansFromBudget({
          budget: budget as Budget,
          customerId: lead?.customer_id || null,
          leadId,
          userId,
        });

      } catch (syncError: any) {
        // Don't throw - assignment succeeded, just log the error
      }

      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: async (_, variables) => {
      // Invalidate all budget-related queries
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] });
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'lead', variables.leadId] });
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer'] });
      
      // Invalidate all plan queries to ensure workout and nutrition plans update
      await queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      
      // Refetch immediately to update UI
      await queryClient.refetchQueries({ queryKey: ['budgetAssignment'] });
      
      // Also refetch plans-history to ensure supplement and steps plans appear
      await queryClient.refetchQueries({ queryKey: ['plans-history'] });
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
        const syncResult = await syncPlansFromBudget({
          budget: budget as Budget,
          customerId,
          leadId: null,
          userId,
        });

      } catch (syncError: any) {
        // Don't throw - assignment succeeded, just log the error
      }

      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: async (_, variables) => {
      // Invalidate all budget-related queries
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] });
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer', variables.customerId] });
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'lead'] });
      
      // Invalidate all plan queries to ensure workout and nutrition plans update
      await queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      
      // Refetch immediately to update UI
      await queryClient.refetchQueries({ queryKey: ['budgetAssignment'] });
      
      // Also refetch plans-history to ensure supplement and steps plans appear
      await queryClient.refetchQueries({ queryKey: ['plans-history'] });
    },
  });
};

// Delete a budget assignment
export const useDeleteBudgetAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First, get the assignment to find associated lead/customer
      const { data: assignment, error: fetchError } = await supabase
        .from('budget_assignments')
        .select('lead_id, customer_id, budget_id')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Budget assignment not found');

      // Delete the assignment
      const { error } = await supabase
        .from('budget_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Also delete associated plans if they exist
      // Delete workout plans
      if (assignment.lead_id) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('lead_id', assignment.lead_id)
          .eq('budget_id', assignment.budget_id);
      }
      if (assignment.customer_id) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('customer_id', assignment.customer_id)
          .eq('budget_id', assignment.budget_id);
      }

      // Delete nutrition plans
      if (assignment.lead_id) {
        await supabase
          .from('nutrition_plans')
          .delete()
          .eq('lead_id', assignment.lead_id)
          .eq('budget_id', assignment.budget_id);
      }
      if (assignment.customer_id) {
        await supabase
          .from('nutrition_plans')
          .delete()
          .eq('customer_id', assignment.customer_id)
          .eq('budget_id', assignment.budget_id);
      }

      // Delete supplement plans
      if (assignment.lead_id) {
        await supabase
          .from('supplement_plans')
          .delete()
          .eq('lead_id', assignment.lead_id)
          .eq('budget_id', assignment.budget_id);
      }
      if (assignment.customer_id) {
        await supabase
          .from('supplement_plans')
          .delete()
          .eq('customer_id', assignment.customer_id)
          .eq('budget_id', assignment.budget_id);
      }

      // Delete steps plans
      if (assignment.lead_id) {
        await supabase
          .from('steps_plans')
          .delete()
          .eq('lead_id', assignment.lead_id)
          .eq('budget_id', assignment.budget_id);
      }
      if (assignment.customer_id) {
        await supabase
          .from('steps_plans')
          .delete()
          .eq('customer_id', assignment.customer_id)
          .eq('budget_id', assignment.budget_id);
      }

      return { success: true };
    },
    onSuccess: async () => {
      // Invalidate all budget-related queries
      await queryClient.invalidateQueries({ queryKey: ['budget-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['budgetAssignment'] });
      
      // Invalidate all plan queries to ensure workout and nutrition plans update
      await queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['nutritionPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['supplementPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['plans-history'] });
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['supplement-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['steps-plans'] });
      
      // Refetch immediately to update UI
      await queryClient.refetchQueries({ queryKey: ['budgetAssignment'] });
    },
  });
};
