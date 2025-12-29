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

// Helper function to get user ID from email
const getUserIdFromEmail = async (email: string): Promise<string> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user && !authError) return user.id;
  } catch (e) {
    // Auth session not available, continue to profile lookup
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profile && profile.id) {
    return profile.id;
  }

  throw new Error(
    `User profile not found for email: ${email}. ` +
    `Please contact an administrator to create your account via the secure invitation system.`
  );
};

// Fetch all budgets (public + user's own)
export const useBudgets = (filters?: { search?: string; isPublic?: boolean }) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['budgets', filters, user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);
      let query = supabase
        .from('budgets')
        .select('*')
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
    enabled: !!user?.email,
  });
};

// Fetch a single budget by ID
export const useBudget = (budgetId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['budget', budgetId, user?.email],
    queryFn: async () => {
      if (!budgetId) return null;
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .single();

      if (error) throw error;
      return data as Budget | null;
    },
    enabled: !!budgetId && !!user?.email,
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

      const updateData: Partial<Budget> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== 'budgetId' && updates[key as keyof typeof updates] !== undefined) {
          updateData[key as keyof Budget] = updates[key as keyof typeof updates] as any;
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'lead', variables.leadId] });
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
      if (!user?.email) throw new Error('User not authenticated');

      const userId = await getUserIdFromEmail(user.email);

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
      return data as BudgetAssignment & { budget: Budget };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgetAssignment', 'customer', variables.customerId] });
    },
  });
};

