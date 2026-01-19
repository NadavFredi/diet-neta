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

      // First, try to fetch from workout_plans table
      const { data: workoutPlanData, error: workoutPlanError } = await supabase
        .from('workout_plans')
        .select('*, budget_id')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (workoutPlanError && workoutPlanError.code !== 'PGRST116') {
        throw workoutPlanError;
      }

      if (workoutPlanData) {
        setWorkoutPlan({
          id: workoutPlanData.id,
          user_id: workoutPlanData.user_id,
          lead_id: workoutPlanData.lead_id,
          template_id: workoutPlanData.template_id,
          budget_id: workoutPlanData.budget_id,
          start_date: workoutPlanData.start_date,
          description: workoutPlanData.description || '',
          strength: workoutPlanData.strength || 0,
          cardio: workoutPlanData.cardio || 0,
          intervals: workoutPlanData.intervals || 0,
          custom_attributes: workoutPlanData.custom_attributes || { schema: [], data: {} },
          is_active: workoutPlanData.is_active ?? true,
          deleted_at: workoutPlanData.deleted_at,
          created_at: workoutPlanData.created_at,
          updated_at: workoutPlanData.updated_at,
        });
        return;
      }

      // If no workout plan found, try to fetch from budget assignment
      // Budgets can be assigned to either customer_id OR lead_id
      // If assigned to lead_id, we need to find the lead for this customer
      console.log('[useWorkoutPlan] No workout plan found, checking budget assignment for customer:', customerId);
      
      // First, try to find the lead(s) for this customer
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('customer_id', customerId);
      
      const leadIds = leads?.map(l => l.id) || [];
      console.log('[useWorkoutPlan] Found leads for customer:', { customerId, leadIds });
      
      // Check for budget assignments by customer_id OR lead_id
      // Try customer_id first
      let budgetAssignment = null;
      let budgetError = null;
      
      const { data: customerAssignment, error: customerError } = await supabase
        .from('budget_assignments')
        .select(`
          *,
          budget:budgets(
            id,
            name,
            description,
            workout_template_id,
            created_at
          )
        `)
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (customerAssignment) {
        budgetAssignment = customerAssignment;
      } else if (leadIds.length > 0) {
        // If no customer assignment, check lead assignments
        const { data: leadAssignment, error: leadErr } = await supabase
          .from('budget_assignments')
          .select(`
            *,
            budget:budgets(
              id,
              name,
              description,
              workout_template_id,
              created_at
            )
          `)
          .in('lead_id', leadIds)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (leadAssignment) {
          budgetAssignment = leadAssignment;
        }
        budgetError = leadErr;
      } else {
        budgetError = customerError;
      }

      if (budgetError && budgetError.code !== 'PGRST116') {
        console.error('[useWorkoutPlan] Error fetching budget assignment:', budgetError);
      }

      console.log('[useWorkoutPlan] Budget assignment result:', {
        found: !!budgetAssignment,
        budgetId: budgetAssignment?.budget?.id,
        workoutTemplateId: budgetAssignment?.budget?.workout_template_id,
        assignedToCustomer: budgetAssignment?.customer_id === customerId,
        assignedToLead: !!budgetAssignment?.lead_id,
        leadId: budgetAssignment?.lead_id
      });

      if (budgetAssignment?.budget?.workout_template_id) {
        const budget = budgetAssignment.budget as any;
        
        // Fetch the workout template
        const { data: workoutTemplate, error: templateError } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('id', budget.workout_template_id)
          .single();

        if (templateError) {
          console.error('Error fetching workout template:', templateError);
          setWorkoutPlan(null);
          return;
        }

        if (workoutTemplate) {
          console.log('[useWorkoutPlan] Found workout template:', {
            templateId: workoutTemplate.id,
            templateName: workoutTemplate.name,
            routine_data: workoutTemplate.routine_data,
            hasWeeklyWorkout: !!workoutTemplate.routine_data?.weeklyWorkout
          });

          // Extract weekly workout data - match PrintBudgetPage structure
          // PrintBudgetPage uses: workoutTemplate.routine_data.weeklyWorkout
          const weeklyWorkoutData = workoutTemplate.routine_data?.weeklyWorkout;

          console.log('[useWorkoutPlan] Extracted weekly workout data:', {
            hasData: !!weeklyWorkoutData,
            hasDays: !!weeklyWorkoutData?.days,
            daysCount: weeklyWorkoutData?.days ? Object.keys(weeklyWorkoutData.days).length : 0,
            generalGoals: weeklyWorkoutData?.generalGoals
          });

          // Convert workout template to WorkoutPlan format
          const convertedPlan: WorkoutPlan = {
            id: `template-${workoutTemplate.id}`, // Use a synthetic ID
            user_id: workoutTemplate.created_by || user.id,
            customer_id: customerId,
            template_id: workoutTemplate.id,
            budget_id: budget.id,
            start_date: budgetAssignment.assigned_at || new Date().toISOString(),
            description: workoutTemplate.description || workoutTemplate.name || '',
            strength: 0, // Not available in template
            cardio: 0, // Not available in template
            intervals: 0, // Not available in template
            custom_attributes: {
              schema: [],
              data: weeklyWorkoutData ? {
                weeklyWorkout: weeklyWorkoutData
              } : {}
            },
            is_active: true,
            created_at: workoutTemplate.created_at,
            updated_at: workoutTemplate.updated_at,
          };

          console.log('[useWorkoutPlan] Converted plan:', {
            id: convertedPlan.id,
            hasWeeklyWorkout: !!convertedPlan.custom_attributes.data.weeklyWorkout,
            days: convertedPlan.custom_attributes.data.weeklyWorkout?.days,
            daysCount: convertedPlan.custom_attributes.data.weeklyWorkout?.days ? Object.keys(convertedPlan.custom_attributes.data.weeklyWorkout.days).length : 0
          });

          setWorkoutPlan(convertedPlan);
          return;
        } else {
          console.log('[useWorkoutPlan] Workout template not found for template ID:', budget.workout_template_id);
        }
      }

      // No workout plan or template found
      setWorkoutPlan(null);
    } catch (err) {
      console.error('Error fetching workout plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workout plan');
      setWorkoutPlan(null);
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





