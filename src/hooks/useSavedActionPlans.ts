/**
 * Hook for managing saved action plans (snapshots)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import type { Budget } from '@/store/slices/budgetSlice';

export interface SavedActionPlan {
  id: string;
  user_id: string;
  lead_id: string | null;
  budget_id: string | null;
  name: string;
  description: string | null;
  saved_at: string;
  snapshot: any; // Full budget snapshot
  notes: string | null;
}

export interface SaveActionPlanData {
  budget_id: string | null;
  lead_id?: string | null;
  name: string;
  description?: string | null;
  snapshot: any;
  notes?: string | null;
}

/**
 * Fetch all saved action plans for the current user, optionally filtered by lead_id
 */
export const useSavedActionPlans = (leadId?: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['savedActionPlans', user?.id, leadId],
    queryFn: async () => {
      if (!user?.id) return { data: [], totalCount: 0 };

      let query = supabase
        .from('saved_action_plans')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Filter by lead_id if provided
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error, count } = await query.order('saved_at', { ascending: false });

      if (error) throw error;

      return {
        data: (data || []) as SavedActionPlan[],
        totalCount: count || 0,
      };
    },
    enabled: !!user?.id,
  });
};

/**
 * Fetch a single saved action plan by ID
 */
export const useSavedActionPlan = (id: string | null) => {
  return useQuery({
    queryKey: ['savedActionPlan', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('saved_action_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SavedActionPlan;
    },
    enabled: !!id,
  });
};

/**
 * Save a new action plan snapshot
 */
export const useSaveActionPlan = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (data: SaveActionPlanData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: savedPlan, error } = await supabase
        .from('saved_action_plans')
        .insert({
          user_id: user.id,
          lead_id: data.lead_id || null,
          budget_id: data.budget_id,
          name: data.name,
          description: data.description || null,
          snapshot: data.snapshot,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return savedPlan as SavedActionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedActionPlans'] });
    },
  });
};

/**
 * Delete a saved action plan
 */
export const useDeleteSavedActionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_action_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedActionPlans'] });
    },
  });
};

/**
 * Create a complete snapshot of a budget for saving
 */
export const createBudgetSnapshot = (budget: Budget, nutritionTemplate?: any, workoutTemplate?: any): any => {
  return {
    // Basic info
    id: budget.id,
    name: budget.name,
    description: budget.description,
    
    // Nutrition
    nutrition_template_id: budget.nutrition_template_id,
    nutrition_targets: budget.nutrition_targets || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber_min: 20,
      water_min: 2.5,
    },
    nutrition_template: nutritionTemplate ? {
      id: nutritionTemplate.id,
      name: nutritionTemplate.name,
      description: nutritionTemplate.description,
      targets: nutritionTemplate.targets,
      activity_entries: nutritionTemplate.activity_entries,
      manual_fields: nutritionTemplate.manual_fields,
      manual_override: nutritionTemplate.manual_override,
    } : null,
    
    // Workout
    workout_template_id: budget.workout_template_id,
    workout_template: workoutTemplate ? {
      id: workoutTemplate.id,
      name: workoutTemplate.name,
      description: workoutTemplate.description,
      goal_tags: workoutTemplate.goal_tags,
      routine_data: workoutTemplate.routine_data,
    } : null,
    
    // Supplements
    supplements: budget.supplements || [],
    
    // Cardio & Intervals
    cardio_training: budget.cardio_training || null,
    interval_training: budget.interval_training || null,
    
    // Steps
    steps_goal: budget.steps_goal || 0,
    steps_min: budget.steps_min || null,
    steps_max: budget.steps_max || null,
    steps_instructions: budget.steps_instructions || null,
    
    // Guidelines
    eating_order: budget.eating_order || null,
    eating_rules: budget.eating_rules || null,
    
    // Metadata
    created_at: budget.created_at,
    updated_at: budget.updated_at,
  };
};
