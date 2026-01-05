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
    // Fetch the workout template
    const { data: workoutTemplate, error: templateError } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', budget.workout_template_id)
      .single();

    if (templateError) {
      console.error('Error fetching workout template:', templateError);
    } else if (workoutTemplate) {
      // Check if a workout plan already exists for this budget
      let existingWorkoutPlan = null;
      if (finalCustomerId) {
        const { data } = await supabase
          .from('workout_plans')
          .select('id')
          .eq('budget_id', budget.id)
          .eq('customer_id', finalCustomerId)
          .maybeSingle();
        existingWorkoutPlan = data;
      } else if (leadId) {
        const { data } = await supabase
          .from('workout_plans')
          .select('id')
          .eq('budget_id', budget.id)
          .eq('lead_id', leadId)
          .maybeSingle();
        existingWorkoutPlan = data;
      }

      // Deactivate existing active workout plans for this customer/lead (except the one we're updating)
      if (finalCustomerId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('customer_id', finalCustomerId)
          .eq('is_active', true)
          .neq('id', existingWorkoutPlan?.id || '00000000-0000-0000-0000-000000000000');
      } else if (leadId) {
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true)
          .neq('id', existingWorkoutPlan?.id || '00000000-0000-0000-0000-000000000000');
      }

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

      let workoutPlan;
      if (existingWorkoutPlan) {
        // Update existing plan
        const { data, error: workoutError } = await supabase
          .from('workout_plans')
          .update(planData)
          .eq('id', existingWorkoutPlan.id)
          .select()
          .single();
        
        if (workoutError) {
          console.error('[syncPlansFromBudget] Error updating workout plan:', workoutError);
          throw new Error(`Failed to update workout plan: ${workoutError.message}`);
        }
        workoutPlan = data;
        console.log('[syncPlansFromBudget] Workout plan updated successfully:', workoutPlan.id);
      } else {
        // Create new workout plan from template
        const { data, error: workoutError } = await supabase
          .from('workout_plans')
          .insert(planData)
          .select()
          .single();

        if (workoutError) {
          console.error('[syncPlansFromBudget] Error creating workout plan:', workoutError);
          throw new Error(`Failed to create workout plan: ${workoutError.message}`);
        }
        workoutPlan = data;
        console.log('[syncPlansFromBudget] Workout plan created successfully:', workoutPlan.id);
      }

      result.workoutPlanId = workoutPlan.id;
    }
  }

  // 2. Sync Nutrition Plan
  if (budget.nutrition_template_id || budget.nutrition_targets) {
    // Check if a nutrition plan already exists for this budget
    let existingNutritionPlan = null;
    if (finalCustomerId) {
      const { data } = await supabase
        .from('nutrition_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId)
        .maybeSingle();
      existingNutritionPlan = data;
    } else if (leadId) {
      const { data } = await supabase
        .from('nutrition_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId)
        .maybeSingle();
      existingNutritionPlan = data;
    }

    // Deactivate existing active nutrition plans for this customer/lead (except the one we're updating)
    if (finalCustomerId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true)
        .neq('id', existingNutritionPlan?.id || '00000000-0000-0000-0000-000000000000');
    } else if (leadId) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .neq('id', existingNutritionPlan?.id || '00000000-0000-0000-0000-000000000000');
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

    let nutritionPlan;
    if (existingNutritionPlan) {
      // Update existing plan
      const { data, error: nutritionError } = await supabase
        .from('nutrition_plans')
        .update(planData)
        .eq('id', existingNutritionPlan.id)
        .select()
        .single();

      if (nutritionError) {
        console.error('[syncPlansFromBudget] Error updating nutrition plan:', nutritionError);
        throw new Error(`Failed to update nutrition plan: ${nutritionError.message}`);
      }
      nutritionPlan = data;
      console.log('[syncPlansFromBudget] Nutrition plan updated successfully:', nutritionPlan.id);
    } else {
      // Create new nutrition plan
      const { data, error: nutritionError } = await supabase
        .from('nutrition_plans')
        .insert(planData)
        .select()
        .single();

      if (nutritionError) {
        console.error('[syncPlansFromBudget] Error creating nutrition plan:', nutritionError);
        throw new Error(`Failed to create nutrition plan: ${nutritionError.message}`);
      }
      nutritionPlan = data;
      console.log('[syncPlansFromBudget] Nutrition plan created successfully:', nutritionPlan.id);
    }

    result.nutritionPlanId = nutritionPlan.id;
  }

  // 3. Sync Steps Plan
  if (budget.steps_goal && budget.steps_goal > 0) {
    console.log('[syncPlansFromBudget] Creating steps plan:', {
      stepsGoal: budget.steps_goal,
      stepsInstructions: budget.steps_instructions,
      customerId: finalCustomerId,
      leadId,
    });

    // Check if a steps plan already exists for this budget
    let existingStepsPlan = null;
    if (finalCustomerId) {
      const { data, error: checkError } = await supabase
        .from('steps_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId)
        .maybeSingle();
      
      if (checkError) {
        console.error('[syncPlansFromBudget] Error checking existing steps plan:', checkError);
        // If table doesn't exist, log but continue (migration might not be applied)
        if (checkError.message?.includes('does not exist') || checkError.message?.includes('relation')) {
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
          return result; // Return early if table doesn't exist
        }
      }
      existingStepsPlan = data;
    } else if (leadId) {
      const { data, error: checkError } = await supabase
        .from('steps_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId)
        .maybeSingle();
      
      if (checkError) {
        console.error('[syncPlansFromBudget] Error checking existing steps plan:', checkError);
        if (checkError.message?.includes('does not exist') || checkError.message?.includes('relation')) {
          console.error('[syncPlansFromBudget] steps_plans table does not exist! Please run migration: 20260104000007_create_steps_plans.sql');
          return result; // Return early if table doesn't exist
        }
      }
      existingStepsPlan = data;
    }

    // Deactivate existing active steps plans for this customer/lead (except the one we're updating)
    if (finalCustomerId) {
      await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true)
        .neq('id', existingStepsPlan?.id || '00000000-0000-0000-0000-000000000000');
    } else if (leadId) {
      await supabase
        .from('steps_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .neq('id', existingStepsPlan?.id || '00000000-0000-0000-0000-000000000000');
    }

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

    let stepsPlan;
    if (existingStepsPlan) {
      // Update existing plan
      const { data, error: stepsError } = await supabase
        .from('steps_plans')
        .update(planData)
        .eq('id', existingStepsPlan.id)
        .select()
        .single();

      if (stepsError) {
        console.error('[syncPlansFromBudget] Error updating steps plan:', stepsError);
        throw new Error(`Failed to update steps plan: ${stepsError.message}`);
      }
      stepsPlan = data;
      console.log('[syncPlansFromBudget] Steps plan updated successfully:', stepsPlan.id);
    } else {
      // Create new steps plan
      const { data, error: stepsError } = await supabase
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
      stepsPlan = data;
      console.log('[syncPlansFromBudget] ✅ Steps plan created successfully:', stepsPlan.id);
    }

    result.stepsPlanId = stepsPlan.id;
    console.log('[syncPlansFromBudget] Steps plan sync completed:', result.stepsPlanId);
  } else {
    console.log('[syncPlansFromBudget] Skipping steps plan - no steps_goal in budget or goal is 0');
  }

  // 4. Sync Supplement Plan
  if (budget.supplements && budget.supplements.length > 0) {
    // Check if a supplement plan already exists for this budget
    let existingSupplementPlan = null;
    if (finalCustomerId) {
      const { data } = await supabase
        .from('supplement_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('customer_id', finalCustomerId)
        .maybeSingle();
      existingSupplementPlan = data;
    } else if (leadId) {
      const { data } = await supabase
        .from('supplement_plans')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('lead_id', leadId)
        .maybeSingle();
      existingSupplementPlan = data;
    }

    // Deactivate existing active supplement plans for this customer/lead (except the one we're updating)
    if (finalCustomerId) {
      await supabase
        .from('supplement_plans')
        .update({ is_active: false })
        .eq('customer_id', finalCustomerId)
        .eq('is_active', true)
        .neq('id', existingSupplementPlan?.id || '00000000-0000-0000-0000-000000000000');
    } else if (leadId) {
      await supabase
        .from('supplement_plans')
        .update({ is_active: false })
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .neq('id', existingSupplementPlan?.id || '00000000-0000-0000-0000-000000000000');
    }

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

    let supplementPlan;
    if (existingSupplementPlan) {
      // Update existing plan
      const { data, error: supplementError } = await supabase
        .from('supplement_plans')
        .update(planData)
        .eq('id', existingSupplementPlan.id)
        .select()
        .single();

      if (supplementError) {
        console.error('[syncPlansFromBudget] Error updating supplement plan:', supplementError);
        throw new Error(`Failed to update supplement plan: ${supplementError.message}`);
      }
      supplementPlan = data;
      console.log('[syncPlansFromBudget] Supplement plan updated successfully:', supplementPlan.id);
    } else {
      // Create new supplement plan
      const { data, error: supplementError } = await supabase
        .from('supplement_plans')
        .insert(planData)
        .select()
        .single();

      if (supplementError) {
        console.error('[syncPlansFromBudget] Error creating supplement plan:', supplementError);
        throw new Error(`Failed to create supplement plan: ${supplementError.message}`);
      }
      supplementPlan = data;
      console.log('[syncPlansFromBudget] Supplement plan created successfully:', supplementPlan.id);
    }

    result.supplementPlanId = supplementPlan.id;
  }

  console.log('[syncPlansFromBudget] Sync completed:', result);
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

