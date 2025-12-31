/**
 * Budget Plan Sync Service
 * 
 * Handles automatic creation/update of workout_plans, nutrition_plans, and supplement_plans
 * when a budget is assigned to a lead or customer.
 */

import { supabase } from '@/lib/supabaseClient';
import type { Budget } from '@/store/slices/budgetSlice';

interface SyncPlansParams {
  budget: Budget;
  customerId?: string | null;
  leadId?: string | null;
  userId: string;
}

/**
 * Syncs workout, nutrition, and supplement plans when a budget is assigned
 */
export async function syncPlansFromBudget({
  budget,
  customerId,
  leadId,
  userId,
}: SyncPlansParams): Promise<{
  workoutPlanId?: string;
  nutritionPlanId?: string;
  supplementPlanId?: string;
}> {
  const result: {
    workoutPlanId?: string;
    nutritionPlanId?: string;
    supplementPlanId?: string;
  } = {};

  // Get customer_id from lead if only leadId is provided
  let finalCustomerId = customerId;
  if (leadId && !customerId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('customer_id')
      .eq('id', leadId)
      .single();
    
    if (lead?.customer_id) {
      finalCustomerId = lead.customer_id;
    }
  }

  if (!finalCustomerId && !leadId) {
    throw new Error('Either customerId or leadId must be provided');
  }

  // 1. Sync Workout Plan
  if (budget.workout_template_id) {
    // Fetch the workout template
    const { data: workoutTemplate, error: templateError } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', budget.workout_template_id)
      .single();

    if (templateError) {
      console.error('Error fetching workout template:', templateError);
    } else if (workoutTemplate) {
      // Deactivate existing active workout plans for this customer/lead
      if (finalCustomerId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('customer_id', finalCustomerId)
          .eq('is_active', true);
      }

      // Create new workout plan from template
      const { data: workoutPlan, error: workoutError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: userId,
          customer_id: finalCustomerId || null,
          lead_id: leadId || null,
          template_id: budget.workout_template_id,
          budget_id: budget.id,
          start_date: new Date().toISOString().split('T')[0],
          description: `תוכנית אימונים מתקציב: ${budget.name}`,
          strength: workoutTemplate.routine_data?.weeklyWorkout?.strength || 0,
          cardio: workoutTemplate.routine_data?.weeklyWorkout?.cardio || 0,
          intervals: workoutTemplate.routine_data?.weeklyWorkout?.intervals || 0,
          custom_attributes: workoutTemplate.routine_data || { schema: [], data: {} },
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating workout plan:', workoutError);
      } else {
        result.workoutPlanId = workoutPlan.id;
      }
    }
  }

  // 2. Sync Nutrition Plan
  if (budget.nutrition_template_id || budget.nutrition_targets) {
    // Deactivate existing active nutrition plans for this customer/lead
    if (finalCustomerId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true);
    }

    let nutritionTargets = budget.nutrition_targets;

    // If template is used, fetch its targets
    if (budget.nutrition_template_id && !nutritionTargets) {
      const { data: nutritionTemplate } = await supabase
        .from('nutrition_templates')
        .select('targets')
        .eq('id', budget.nutrition_template_id)
        .single();

      if (nutritionTemplate?.targets) {
        nutritionTargets = nutritionTemplate.targets;
      }
    }

    // Create new nutrition plan
    const { data: nutritionPlan, error: nutritionError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: userId,
        customer_id: finalCustomerId || null,
        lead_id: leadId || null,
        template_id: budget.nutrition_template_id || null,
        budget_id: budget.id,
        start_date: new Date().toISOString().split('T')[0],
        description: `תוכנית תזונה מתקציב: ${budget.name}`,
        targets: nutritionTargets || {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber: 30,
        },
        created_by: userId,
      })
      .select()
      .single();

    if (nutritionError) {
      console.error('Error creating nutrition plan:', nutritionError);
    } else {
      result.nutritionPlanId = nutritionPlan.id;
    }
  }

  // 3. Update daily_protocol with steps_goal from budget
  if (budget.steps_goal && budget.steps_goal > 0 && finalCustomerId) {
    // Update customer's daily_protocol with steps goal
    const { data: customer } = await supabase
      .from('customers')
      .select('daily_protocol')
      .eq('id', finalCustomerId)
      .single();

    if (customer) {
      const dailyProtocol = customer.daily_protocol || {};
      const updatedProtocol = {
        ...dailyProtocol,
        stepsGoal: budget.steps_goal,
      };

      await supabase
        .from('customers')
        .update({ daily_protocol: updatedProtocol })
        .eq('id', finalCustomerId);
    }
  }

  // 4. Sync Supplement Plan
  if (budget.supplements && budget.supplements.length > 0) {
    // Deactivate existing active supplement plans for this customer/lead
    if (finalCustomerId) {
      await supabase
        .from('supplement_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true);
    } else if (leadId) {
      await supabase
        .from('supplement_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);
    }

    // Create new supplement plan
    const { data: supplementPlan, error: supplementError } = await supabase
      .from('supplement_plans')
      .insert({
        user_id: userId,
        customer_id: finalCustomerId || null,
        lead_id: leadId || null,
        budget_id: budget.id,
        start_date: new Date().toISOString().split('T')[0],
        description: `תוכנית תוספים מתקציב: ${budget.name}`,
        supplements: budget.supplements,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (supplementError) {
      console.error('Error creating supplement plan:', supplementError);
    } else {
      result.supplementPlanId = supplementPlan.id;
    }
  }

  return result;
}

/**
 * Gets associated plans for a budget assignment
 */
export async function getAssociatedPlans(budgetId: string): Promise<{
  workoutPlans: any[];
  nutritionPlans: any[];
  supplementPlans: any[];
}> {
  const [workoutResult, nutritionResult, supplementResult] = await Promise.all([
    supabase
      .from('workout_plans')
      .select('id, start_date, is_active')
      .eq('budget_id', budgetId),
    supabase
      .from('nutrition_plans')
      .select('id, start_date, is_active')
      .eq('budget_id', budgetId),
    supabase
      .from('supplement_plans')
      .select('id, start_date, is_active')
      .eq('budget_id', budgetId),
  ]);

  return {
    workoutPlans: workoutResult.data || [],
    nutritionPlans: nutritionResult.data || [],
    supplementPlans: supplementResult.data || [],
  };
}

/**
 * Deletes associated plans when a budget is deleted
 */
export async function deleteAssociatedPlans(
  budgetId: string,
  deletePlans: boolean
): Promise<void> {
  if (!deletePlans) {
    // Just remove the budget_id reference
    await Promise.all([
      supabase
        .from('workout_plans')
        .update({ budget_id: null })
        .eq('budget_id', budgetId),
      supabase
        .from('nutrition_plans')
        .update({ budget_id: null })
        .eq('budget_id', budgetId),
      supabase
        .from('supplement_plans')
        .update({ budget_id: null })
        .eq('budget_id', budgetId),
    ]);
  } else {
    // Delete the plans
    await Promise.all([
      supabase
        .from('workout_plans')
        .delete()
        .eq('budget_id', budgetId),
      supabase
        .from('nutrition_plans')
        .delete()
        .eq('budget_id', budgetId),
      supabase
        .from('supplement_plans')
        .delete()
        .eq('budget_id', budgetId),
    ]);
  }
}

