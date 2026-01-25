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
  stepsPlanId?: string;
}> {
  const result: {
    workoutPlanId?: string;
    nutritionPlanId?: string;
    supplementPlanId?: string;
    stepsPlanId?: string;
  } = {};

  // Get customer_id from lead if only leadId is provided
  let finalCustomerId = customerId;
  if (leadId && !customerId) {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('customer_id')
      .eq('id', leadId)
      .single();
    
    if (leadError) {
    }
    
    if (lead?.customer_id) {
      finalCustomerId = lead.customer_id;
    }
  }

  if (!finalCustomerId && !leadId) {
    throw new Error('Either customerId or leadId must be provided');
  }


  // 1. Sync Workout Plan
  if (budget.workout_template_id) {
    try {
      // Fetch the workout template
      const { data: workoutTemplate, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', budget.workout_template_id)
        .single();

      if (templateError) {
        throw templateError;
      }
      
      if (workoutTemplate) {
      // First, deactivate ALL existing active workout plans for this customer/lead
      // If both customerId and leadId are provided, deactivate plans matching both
      if (finalCustomerId && leadId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('customer_id', finalCustomerId)
          .eq('lead_id', leadId)
          .eq('is_active', true);
      } else if (finalCustomerId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('customer_id', finalCustomerId)
          .eq('is_active', true);
      } else if (leadId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true);
      }

      // DELETE all existing workout plans for this specific budget + customer/lead combination
      // This ensures we only have one plan per budget assignment
      // Delete plans that match budget_id AND (customer_id OR lead_id OR both)
      try {
        let deleteQuery = supabase
          .from('workout_plans')
          .delete()
          .eq('budget_id', budget.id);
        
        // Build OR condition for customer_id and lead_id
        if (finalCustomerId && leadId) {
          deleteQuery = deleteQuery.or(`customer_id.eq.${finalCustomerId},lead_id.eq.${leadId}`);
        } else if (finalCustomerId) {
          deleteQuery = deleteQuery.eq('customer_id', finalCustomerId);
        } else if (leadId) {
          deleteQuery = deleteQuery.eq('lead_id', leadId);
        }
        
        const { error: deleteError } = await deleteQuery;
        if (deleteError) {
          // Log but don't throw - continue to create new plan
        }
      } catch (deleteError) {
        // Don't throw - continue to create new plan
      }

      // Create new workout plan from template
      // Ensure custom_attributes structure matches what WorkoutPlanCard expects
      const weeklyWorkoutData = workoutTemplate.routine_data?.weeklyWorkout;
      const planData = {
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
        // Store in consistent format: data.weeklyWorkout (matches useWorkoutPlan fallback conversion)
        custom_attributes: {
          schema: [],
          data: weeklyWorkoutData ? {
            weeklyWorkout: weeklyWorkoutData
          } : (workoutTemplate.routine_data || {})
        },
        is_active: true,
        created_by: userId,
      };

      const { data: workoutPlan, error: workoutError } = await supabase
        .from('workout_plans')
        .insert(planData)
        .select()
        .single();

      if (workoutError) {
        throw new Error(`Failed to create workout plan: ${workoutError.message}`);
      }

        result.workoutPlanId = workoutPlan.id;
      }
    } catch (error: any) {
      // Don't throw - continue with other plans
    }
  } else {
  }

  // 2. Sync Nutrition Plan
  if (budget.nutrition_template_id || budget.nutrition_targets) {
    try {
    // DELETE all existing nutrition plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    // Delete plans that match budget_id AND (customer_id OR lead_id OR both)
    try {
      let deleteQuery = supabase
        .from('nutrition_plans')
        .delete()
        .eq('budget_id', budget.id);
      
      // Build OR condition for customer_id and lead_id
      if (finalCustomerId && leadId) {
        deleteQuery = deleteQuery.or(`customer_id.eq.${finalCustomerId},lead_id.eq.${leadId}`);
      } else if (finalCustomerId) {
        deleteQuery = deleteQuery.eq('customer_id', finalCustomerId);
      } else if (leadId) {
        deleteQuery = deleteQuery.eq('lead_id', leadId);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError && !deleteError.message?.includes('does not exist') && !deleteError.message?.includes('relation')) {
        // Log but don't throw - continue to create new plan
      }
    } catch (deleteError) {
      // Don't throw - continue to create new plan
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
    const planData: any = {
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
    };
    
    // Add is_active if column exists (after migration 20260121000009)
    // Supabase will ignore this field if column doesn't exist
    planData.is_active = true;

    const { data: nutritionPlan, error: nutritionError } = await supabase
      .from('nutrition_plans')
      .insert(planData)
      .select()
      .single();

    if (nutritionError) {
      throw new Error(`Failed to create nutrition plan: ${nutritionError.message}`);
    }

      result.nutritionPlanId = nutritionPlan?.id;
    } catch (error: any) {
      // Don't throw - continue with other plans
    }
  } else {
  }

  // 3. Sync Steps Plan
  if (budget.steps_goal && budget.steps_goal > 0) {
    try {

    // First, deactivate ALL existing active steps plans for this customer/lead
    // If both customerId and leadId are provided, deactivate plans matching both
    if (finalCustomerId && leadId) {
      const { error: deactivateError } = await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('lead_id', leadId)
        .eq('is_active', true);
      
      if (deactivateError && !deactivateError.message?.includes('does not exist') && !deactivateError.message?.includes('relation')) {
      }
    } else if (finalCustomerId) {
      const { error: deactivateError } = await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true);
      
      if (deactivateError && !deactivateError.message?.includes('does not exist') && !deactivateError.message?.includes('relation')) {
      }
    } else if (leadId) {
      const { error: deactivateError } = await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);
      
      if (deactivateError && !deactivateError.message?.includes('does not exist') && !deactivateError.message?.includes('relation')) {
      }
    }

    // DELETE all existing steps plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    // Delete plans that match budget_id AND (customer_id OR lead_id OR both)
    try {
      let deleteQuery = supabase
        .from('steps_plans')
        .delete()
        .eq('budget_id', budget.id);
      
      // Build OR condition for customer_id and lead_id
      if (finalCustomerId && leadId) {
        deleteQuery = deleteQuery.or(`customer_id.eq.${finalCustomerId},lead_id.eq.${leadId}`);
      } else if (finalCustomerId) {
        deleteQuery = deleteQuery.eq('customer_id', finalCustomerId);
      } else if (leadId) {
        deleteQuery = deleteQuery.eq('lead_id', leadId);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError && (deleteError.message?.includes('does not exist') || deleteError.message?.includes('relation'))) {
        // Table doesn't exist, use fallback
        if (finalCustomerId) {
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
        return result; // Return early if table doesn't exist
      } else if (deleteError) {
        // Log but don't throw - continue to create new plan
      }
    } catch (deleteError: any) {
      if (deleteError?.message?.includes('does not exist') || deleteError?.message?.includes('relation')) {
        // Table doesn't exist, use fallback
        if (finalCustomerId) {
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
        return result; // Return early if table doesn't exist
      }
      // Don't throw - continue to create new plan
    }

    // Create new steps plan
    const planData = {
      user_id: userId,
      customer_id: finalCustomerId || null,
      lead_id: leadId || null,
      budget_id: budget.id,
      start_date: new Date().toISOString().split('T')[0],
      description: `תוכנית צעדים מתקציב: ${budget.name}`,
      steps_goal: budget.steps_goal,
      steps_instructions: budget.steps_instructions || null,
      is_active: true,
      created_by: userId,
    };

    const { data: stepsPlan, error: stepsError } = await supabase
      .from('steps_plans')
      .insert(planData)
      .select()
      .single();

    if (stepsError) {
      
      // If table doesn't exist, fallback to daily_protocol
      if (stepsError.message?.includes('does not exist') || stepsError.message?.includes('relation')) {
        // Fallback: update daily_protocol instead
        if (finalCustomerId) {
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
        return result; // Don't throw, just return
      }
      
      throw new Error(`Failed to create steps plan: ${stepsError.message}`);
    }

      result.stepsPlanId = stepsPlan?.id;
    } catch (error: any) {
      // Don't throw - continue with other plans
    }
  } else {
  }

  // 4. Sync Supplement Plan
  if (budget.supplements && budget.supplements.length > 0) {
    try {
    // First, deactivate ALL existing active supplement plans for this customer/lead
    // If both customerId and leadId are provided, deactivate plans matching both
    if (finalCustomerId && leadId) {
      await supabase
        .from('supplement_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('lead_id', leadId)
        .eq('is_active', true);
    } else if (finalCustomerId) {
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

    // DELETE all existing supplement plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    // Delete plans that match budget_id AND (customer_id OR lead_id OR both)
    try {
      let deleteQuery = supabase
        .from('supplement_plans')
        .delete()
        .eq('budget_id', budget.id);
      
      // Build OR condition for customer_id and lead_id
      if (finalCustomerId && leadId) {
        deleteQuery = deleteQuery.or(`customer_id.eq.${finalCustomerId},lead_id.eq.${leadId}`);
      } else if (finalCustomerId) {
        deleteQuery = deleteQuery.eq('customer_id', finalCustomerId);
      } else if (leadId) {
        deleteQuery = deleteQuery.eq('lead_id', leadId);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        // Log but don't throw - continue to create new plan
      }
    } catch (deleteError) {
      // Don't throw - continue to create new plan
    }

    // Create new supplement plan
    const planData = {
      user_id: userId,
      customer_id: finalCustomerId || null,
      lead_id: leadId || null,
      budget_id: budget.id,
      start_date: new Date().toISOString().split('T')[0],
      description: `תוכנית תוספים מתקציב: ${budget.name}`,
      supplements: budget.supplements,
      is_active: true,
      created_by: userId,
    };

    const { data: supplementPlan, error: supplementError } = await supabase
      .from('supplement_plans')
      .insert(planData)
      .select()
      .single();

    if (supplementError) {
      throw new Error(`Failed to create supplement plan: ${supplementError.message}`);
    }

      result.supplementPlanId = supplementPlan?.id;
    } catch (error: any) {
      // Don't throw - continue with other plans
    }
  } else {
  }

  return result;
}

/**
 * Syncs supplement_plans when a budget is updated (e.g. user adds/edits supplements via Edit Budget).
 * Updates existing plans for this budget, or creates new ones for each assignment if none exist.
 */
export async function syncSupplementPlansFromBudgetUpdate(
  budgetId: string,
  budgetName: string,
  supplements: { name: string; dosage: string; timing: string }[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const description = `תוכנית תוספים מתקציב: ${budgetName}`;
  const supplementsJson = supplements ?? [];

  const { data: existing } = await supabase
    .from('supplement_plans')
    .select('id')
    .eq('budget_id', budgetId);

  if (existing && existing.length > 0) {
    await supabase
      .from('supplement_plans')
      .update({ supplements: supplementsJson, description })
      .eq('budget_id', budgetId);
    return;
  }

  if (supplementsJson.length === 0) return;

  const { data: assignments } = await supabase
    .from('budget_assignments')
    .select('customer_id, lead_id')
    .eq('budget_id', budgetId);

  const seen = new Set<string>();
  for (const a of assignments ?? []) {
    const cid = a.customer_id ?? null;
    const lid = a.lead_id ?? null;
    if (!cid && !lid) continue;
    const key = `${cid ?? ''}|${lid ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await supabase.from('supplement_plans').insert({
      user_id: user.id,
      customer_id: cid,
      lead_id: lid,
      budget_id: budgetId,
      start_date: new Date().toISOString().split('T')[0],
      description,
      supplements: supplementsJson,
      is_active: true,
      created_by: user.id,
    });
  }
}

/**
 * Syncs steps_plans when a budget is updated (e.g. user edits steps_goal via inline edit).
 * Updates existing plans for this budget, or creates new ones for each assignment if none exist.
 */
export async function syncStepsPlansFromBudgetUpdate(
  budgetId: string,
  budgetName: string,
  stepsGoal: number,
  stepsInstructions?: string | null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!stepsGoal || stepsGoal <= 0) return;

  const description = `תוכנית צעדים מתקציב: ${budgetName}`;

  // Update existing steps plans for this budget
  const { data: existing } = await supabase
    .from('steps_plans')
    .select('id')
    .eq('budget_id', budgetId);

  if (existing && existing.length > 0) {
    await supabase
      .from('steps_plans')
      .update({ 
        steps_goal: stepsGoal, 
        steps_instructions: stepsInstructions || null,
        description 
      })
      .eq('budget_id', budgetId);
    return;
  }

  // If no existing plans, create new ones for each assignment
  const { data: assignments } = await supabase
    .from('budget_assignments')
    .select('customer_id, lead_id')
    .eq('budget_id', budgetId);

  const seen = new Set<string>();
  for (const a of assignments ?? []) {
    const cid = a.customer_id ?? null;
    const lid = a.lead_id ?? null;
    if (!cid && !lid) continue;
    const key = `${cid ?? ''}|${lid ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await supabase.from('steps_plans').insert({
      user_id: user.id,
      customer_id: cid,
      lead_id: lid,
      budget_id: budgetId,
      start_date: new Date().toISOString().split('T')[0],
      description,
      steps_goal: stepsGoal,
      steps_instructions: stepsInstructions || null,
      is_active: true,
      created_by: user.id,
    });
  }
}

/**
 * Gets associated plans for a budget assignment
 */
export async function getAssociatedPlans(budgetId: string): Promise<{
  workoutPlans: any[];
  nutritionPlans: any[];
  supplementPlans: any[];
  stepsPlans: any[];
}> {
  const [workoutResult, nutritionResult, supplementResult, stepsResult] = await Promise.all([
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
    supabase
      .from('steps_plans')
      .select('id, start_date, is_active')
      .eq('budget_id', budgetId),
  ]);

  return {
    workoutPlans: workoutResult.data || [],
    nutritionPlans: nutritionResult.data || [],
    supplementPlans: supplementResult.data || [],
    stepsPlans: stepsResult.data || [],
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
      supabase
        .from('steps_plans')
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
      supabase
        .from('steps_plans')
        .delete()
        .eq('budget_id', budgetId),
    ]);
  }
}

