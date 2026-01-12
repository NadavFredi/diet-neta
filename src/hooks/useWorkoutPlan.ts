import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';

export const useWorkoutPlan = (customerId?: string) => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    fetchWorkoutPlan();
  }, [customerId]);

  const fetchWorkoutPlan = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('workout_plans')
        .select('*, budget_id')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setWorkoutPlan({
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          budget_id: data.budget_id,
          start_date: data.start_date,
          description: data.description || '',
          strength: data.strength || 0,
          cardio: data.cardio || 0,
          intervals: data.intervals || 0,
          custom_attributes: data.custom_attributes || { schema: [], data: {} },
          is_active: data.is_active ?? true,
          deleted_at: data.deleted_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } else {
        setWorkoutPlan(null);
      }
    } catch (err) {
      console.error('Error fetching workout plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workout plan');
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkoutPlan = async (planData: Partial<WorkoutPlan>) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: createError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          customer_id: customerId,
          lead_id: planData.lead_id,
          template_id: planData.template_id,
          budget_id: planData.budget_id,
          start_date: planData.start_date,
          description: planData.description,
          strength: planData.strength,
          cardio: planData.cardio,
          intervals: planData.intervals,
          custom_attributes: planData.custom_attributes,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        const newPlan: WorkoutPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          budget_id: data.budget_id,
          start_date: data.start_date,
          description: data.description || '',
          strength: data.strength || 0,
          cardio: data.cardio || 0,
          intervals: data.intervals || 0,
          custom_attributes: data.custom_attributes || { schema: [], data: {} },
          is_active: data.is_active ?? true,
          deleted_at: data.deleted_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setWorkoutPlan(newPlan);
        return newPlan;
      }
    } catch (err) {
      console.error('Error creating workout plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to create workout plan');
      throw err;
    }
  };

  const updateWorkoutPlan = async (planData: Partial<WorkoutPlan>) => {
    if (!workoutPlan) {
      throw new Error('No workout plan to update');
    }

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('workout_plans')
        .update({
          start_date: planData.start_date,
          description: planData.description,
          strength: planData.strength,
          cardio: planData.cardio,
          intervals: planData.intervals,
          custom_attributes: planData.custom_attributes,
        })
        .eq('id', workoutPlan.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        const updatedPlan: WorkoutPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          start_date: data.start_date,
          description: data.description || '',
          strength: data.strength || 0,
          cardio: data.cardio || 0,
          intervals: data.intervals || 0,
          custom_attributes: data.custom_attributes || { schema: [], data: {} },
          is_active: data.is_active ?? true,
          deleted_at: data.deleted_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setWorkoutPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update workout plan');
      throw err;
    }
  };

  const deleteWorkoutPlan = async () => {
    if (!workoutPlan) {
      throw new Error('No workout plan to delete');
    }

    try {
      setError(null);

      // Mark as inactive instead of deleting
      const { error: updateError } = await supabase
        .from('workout_plans')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', workoutPlan.id);

      if (updateError) throw updateError;

      setWorkoutPlan(null);
    } catch (err) {
      console.error('Error deleting workout plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete workout plan');
      throw err;
    }
  };

  const fetchWorkoutPlanHistory = async () => {
    if (!customerId) return [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []).map((plan) => ({
        id: plan.id,
        user_id: plan.user_id,
        lead_id: plan.lead_id,
        template_id: plan.template_id,
        start_date: plan.start_date,
        description: plan.description || '',
        strength: plan.strength || 0,
        cardio: plan.cardio || 0,
        intervals: plan.intervals || 0,
        custom_attributes: plan.custom_attributes || { schema: [], data: {} },
        is_active: plan.is_active ?? true,
        deleted_at: plan.deleted_at,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }));
    } catch (err) {
      console.error('Error fetching workout plan history:', err);
      return [];
    }
  };

  return {
    workoutPlan,
    isLoading,
    error,
    fetchWorkoutPlan,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    fetchWorkoutPlanHistory,
  };
};





