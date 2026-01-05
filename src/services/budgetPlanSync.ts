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
  console.log('[syncPlansFromBudget] Starting sync:', { budgetId: budget.id, customerId, leadId, userId });
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
      console.error('[syncPlansFromBudget] Error fetching lead:', leadError);
    }
    
    if (lead?.customer_id) {
      finalCustomerId = lead.customer_id;
      console.log('[syncPlansFromBudget] Found customer_id from lead:', finalCustomerId);
    }
  }

  if (!finalCustomerId && !leadId) {
    throw new Error('Either customerId or leadId must be provided');
  }

  console.log('[syncPlansFromBudget] Final customerId:', finalCustomerId, 'leadId:', leadId);

  // 1. Sync Workout Plan
  if (budget.workout_template_id) {
    try {
      console.log('[syncPlansFromBudget] Creating workout plan for budget:', budget.id);
      // Fetch the workout template
      const { data: workoutTemplate, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', budget.workout_template_id)
        .single();

      if (templateError) {
        console.error('[syncPlansFromBudget] Error fetching workout template:', templateError);
        throw templateError;
      }
      
      if (!workoutTemplate) {
        console.warn('[syncPlansFromBudget] Workout template not found:', budget.workout_template_id);
      } else {
      // First, deactivate ALL existing active workout plans for this customer/lead
      if (finalCustomerId) {
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
      if (finalCustomerId) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('budget_id', budget.id)
          .eq('customer_id', finalCustomerId);
      } else if (leadId) {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('budget_id', budget.id)
          .eq('lead_id', leadId);
      }

      // Create new workout plan from template
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
        custom_attributes: workoutTemplate.routine_data || { schema: [], data: {} },
        is_active: true,
        created_by: userId,
      };

      const { data: workoutPlan, error: workoutError } = await supabase
        .from('workout_plans')
        .insert(planData)
        .select()
        .single();

      if (workoutError) {
        console.error('[syncPlansFromBudget] Error creating workout plan:', workoutError);
        throw new Error(`Failed to create workout plan: ${workoutError.message}`);
      }
      console.log('[syncPlansFromBudget] Workout plan created successfully:', workoutPlan.id);

        result.workoutPlanId = workoutPlan.id;
      }
    } catch (error: any) {
      console.error('[syncPlansFromBudget] Failed to create workout plan:', error);
      // Don't throw - continue with other plans
    }
  } else {
    console.log('[syncPlansFromBudget] Skipping workout plan - no workout_template_id in budget');
  }

  // 2. Sync Nutrition Plan
  if (budget.nutrition_template_id || budget.nutrition_targets) {
    try {
    // First, deactivate ALL existing active nutrition plans for this customer/lead
    if (finalCustomerId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true);
    } else if (leadId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);
    }

    // DELETE all existing nutrition plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    if (finalCustomerId) {
      await supabase
        .from('nutrition_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId);
    } else if (leadId) {
      await supabase
        .from('nutrition_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId);
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
    const planData = {
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

    const { data: nutritionPlan, error: nutritionError } = await supabase
      .from('nutrition_plans')
      .insert(planData)
      .select()
      .single();

    if (nutritionError) {
      console.error('[syncPlansFromBudget] Error creating nutrition plan:', nutritionError);
      throw new Error(`Failed to create nutrition plan: ${nutritionError.message}`);
    }
    console.log('[syncPlansFromBudget] Nutrition plan created successfully:', nutritionPlan.id);

      result.nutritionPlanId = nutritionPlan?.id;
    } catch (error: any) {
      console.error('[syncPlansFromBudget] Failed to create nutrition plan:', error);
      // Don't throw - continue with other plans
    }
  } else {
    console.log('[syncPlansFromBudget] Skipping nutrition plan - no nutrition_template_id or nutrition_targets in budget');
  }

  // 3. Sync Steps Plan
  if (budget.steps_goal && budget.steps_goal > 0) {
    try {
      console.log('[syncPlansFromBudget] Creating steps plan for budget:', budget.id);
      console.log('[syncPlansFromBudget] Steps plan details:', {
      stepsGoal: budget.steps_goal,
      stepsInstructions: budget.steps_instructions,
      customerId: finalCustomerId,
      leadId,
    });

    // First, deactivate ALL existing active steps plans for this customer/lead
    if (finalCustomerId) {
      const { error: deactivateError } = await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true);
      
      if (deactivateError && !deactivateError.message?.includes('does not exist') && !deactivateError.message?.includes('relation')) {
        console.error('[syncPlansFromBudget] Error deactivating steps plans:', deactivateError);
      }
    } else if (leadId) {
      const { error: deactivateError } = await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true);
      
      if (deactivateError && !deactivateError.message?.includes('does not exist') && !deactivateError.message?.includes('relation')) {
        console.error('[syncPlansFromBudget] Error deactivating steps plans:', deactivateError);
      }
    }

    // DELETE all existing steps plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    if (finalCustomerId) {
      const { error: deleteError } = await supabase
        .from('steps_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId);
      
      if (deleteError && !deleteError.message?.includes('does not exist') && !deleteError.message?.includes('relation')) {
        console.error('[syncPlansFromBudget] Error deleting steps plans:', deleteError);
      } else if (deleteError && (deleteError.message?.includes('does not exist') || deleteError.message?.includes('relation'))) {
        // Table doesn't exist, use fallback
        console.error('[syncPlansFromBudget] steps_plans table does not exist! Please run migration: 20260104000007_create_steps_plans.sql');
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
            
            console.log('[syncPlansFromBudget] Fallback: Updated daily_protocol with steps goal');
          }
        }
        return result; // Return early if table doesn't exist
      }
    } else if (leadId) {
      const { error: deleteError } = await supabase
        .from('steps_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId);
      
      if (deleteError && !deleteError.message?.includes('does not exist') && !deleteError.message?.includes('relation')) {
        console.error('[syncPlansFromBudget] Error deleting steps plans:', deleteError);
      } else if (deleteError && (deleteError.message?.includes('does not exist') || deleteError.message?.includes('relation'))) {
        console.error('[syncPlansFromBudget] steps_plans table does not exist! Please run migration: 20260104000007_create_steps_plans.sql');
        return result; // Return early if table doesn't exist
      }
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
      console.error('[syncPlansFromBudget] Error creating steps plan:', stepsError);
      console.error('[syncPlansFromBudget] Error details:', {
        message: stepsError.message,
        code: stepsError.code,
        details: stepsError.details,
        hint: stepsError.hint,
      });
      
      // If table doesn't exist, fallback to daily_protocol
      if (stepsError.message?.includes('does not exist') || stepsError.message?.includes('relation')) {
        console.error('[syncPlansFromBudget] steps_plans table does not exist! Please run migration: 20260104000007_create_steps_plans.sql');
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
            
            console.log('[syncPlansFromBudget] Fallback: Updated daily_protocol with steps goal');
          }
        }
        return result; // Don't throw, just return
      }
      
      throw new Error(`Failed to create steps plan: ${stepsError.message}`);
    }
    console.log('[syncPlansFromBudget] ✅ Steps plan created successfully:', stepsPlan.id);

      result.stepsPlanId = stepsPlan?.id;
      console.log('[syncPlansFromBudget] Steps plan sync completed:', result.stepsPlanId);
    } catch (error: any) {
      console.error('[syncPlansFromBudget] Failed to create steps plan:', error);
      // Don't throw - continue with other plans
    }
  } else {
    console.log('[syncPlansFromBudget] Skipping steps plan - no steps_goal in budget or goal is 0');
  }

  // 4. Sync Supplement Plan
  if (budget.supplements && budget.supplements.length > 0) {
    try {
      console.log('[syncPlansFromBudget] Creating supplement plan for budget:', budget.id);
    // First, deactivate ALL existing active supplement plans for this customer/lead
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

    // DELETE all existing supplement plans for this specific budget + customer/lead combination
    // This ensures we only have one plan per budget assignment
    if (finalCustomerId) {
      await supabase
        .from('supplement_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId);
    } else if (leadId) {
      await supabase
        .from('supplement_plans')
        .delete()
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId);
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
      console.error('[syncPlansFromBudget] Error creating supplement plan:', supplementError);
      throw new Error(`Failed to create supplement plan: ${supplementError.message}`);
    }
    console.log('[syncPlansFromBudget] Supplement plan created successfully:', supplementPlan.id);

      result.supplementPlanId = supplementPlan?.id;
    } catch (error: any) {
      console.error('[syncPlansFromBudget] Failed to create supplement plan:', error);
      // Don't throw - continue with other plans
    }
  } else {
    console.log('[syncPlansFromBudget] Skipping supplement plan - no supplements in budget');
  }

  console.log('[syncPlansFromBudget] ✅ Sync completed:', {
    workoutPlanId: result.workoutPlanId || 'none',
    nutritionPlanId: result.nutritionPlanId || 'none',
    supplementPlanId: result.supplementPlanId || 'none',
    stepsPlanId: result.stepsPlanId || 'none',
    totalPlansCreated: [
      result.workoutPlanId,
      result.nutritionPlanId,
      result.supplementPlanId,
      result.stepsPlanId,
    ].filter(Boolean).length,
  });
  return result;
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

