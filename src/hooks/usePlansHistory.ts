/**
 * Hook to fetch all plans (workout, nutrition, supplements) for a customer/lead
 * and transform them into the format expected by LeadHistoryTabs
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { formatDate } from '@/utils/dashboard';

interface PlansHistory {
  workoutHistory: any[];
  nutritionHistory: any[];
  supplementsHistory: any[];
  stepsHistory: any[];
}

export const usePlansHistory = (customerId?: string, leadId?: string) => {
  return useQuery<PlansHistory>({
    queryKey: ['plans-history', customerId, leadId],
    queryFn: async () => {
      console.log('[usePlansHistory] Fetching plans for:', { customerId, leadId });
      const workoutHistory: any[] = [];
      const nutritionHistory: any[] = [];
      const supplementsHistory: any[] = [];
      const stepsHistory: any[] = [];

      // Fetch all plans in parallel using Promise.all for better performance
      const [workoutResult, nutritionResult, supplementResult, stepsResult] = await Promise.all([
        // Fetch workout plans
        (customerId || leadId) ? (() => {
          let workoutQuery = supabase
            .from('workout_plans')
            .select('*, budget_id, workout_templates(name)')
            .order('created_at', { ascending: false });

          if (customerId && leadId) {
            workoutQuery = workoutQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
          } else if (customerId) {
            workoutQuery = workoutQuery.eq('customer_id', customerId);
          } else if (leadId) {
            workoutQuery = workoutQuery.eq('lead_id', leadId);
          }

          return workoutQuery;
        })() : Promise.resolve({ data: null, error: null }),
        
        // Nutrition plans
        (customerId || leadId) ? (() => {
          let nutritionQuery = supabase
            .from('nutrition_plans')
            .select('*, budget_id, nutrition_templates(name)')
            .order('created_at', { ascending: false });

          if (customerId && leadId) {
            nutritionQuery = nutritionQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
          } else if (customerId) {
            nutritionQuery = nutritionQuery.eq('customer_id', customerId);
          } else if (leadId) {
            nutritionQuery = nutritionQuery.eq('lead_id', leadId);
          }

          return nutritionQuery;
        })() : Promise.resolve({ data: null, error: null }),

        // Supplement plans
        (customerId || leadId) ? (() => {
          let supplementQuery = supabase
            .from('supplement_plans')
            .select('*, budget_id')
            .order('created_at', { ascending: false });

          if (customerId && leadId) {
            supplementQuery = supplementQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
          } else if (customerId) {
            supplementQuery = supplementQuery.eq('customer_id', customerId);
          } else if (leadId) {
            supplementQuery = supplementQuery.eq('lead_id', leadId);
          }

          return supplementQuery;
        })() : Promise.resolve({ data: null, error: null }),

        // Steps plans
        (customerId || leadId) ? (() => {
          let stepsQuery = supabase
            .from('steps_plans')
            .select('*, budget_id')
            .order('created_at', { ascending: false });

          if (customerId && leadId) {
            stepsQuery = stepsQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
          } else if (customerId) {
            stepsQuery = stepsQuery.eq('customer_id', customerId);
          } else if (leadId) {
            stepsQuery = stepsQuery.eq('lead_id', leadId);
          }

          return stepsQuery;
        })() : Promise.resolve({ data: null, error: null }),
      ]);

      const { data: workoutPlans, error: workoutError } = workoutResult;
      const { data: nutritionPlans, error: nutritionError } = nutritionResult;
      const { data: supplementPlans, error: supplementError } = supplementResult;
      const { data: stepsPlans, error: stepsError } = stepsResult;

      if (workoutError) {
        console.error('Error fetching workout plans:', workoutError);
      }
      if (nutritionError) {
        console.error('Error fetching nutrition plans:', nutritionError);
      }
      if (supplementError) {
        console.error('Error fetching supplement plans:', supplementError);
      }
      if (stepsError) {
        console.error('[usePlansHistory] Error fetching steps plans:', stepsError);
        // If table doesn't exist, log but don't fail
        if (stepsError.message?.includes('does not exist') || stepsError.message?.includes('relation')) {
          console.warn('[usePlansHistory] steps_plans table does not exist. Please run migration: 20260104000007_create_steps_plans.sql');
        }
      }

      console.log('[usePlansHistory] Plans fetched:', {
        workout: workoutPlans?.length || 0,
        nutrition: nutritionPlans?.length || 0,
        supplements: supplementPlans?.length || 0,
        steps: stepsPlans?.length || 0,
      });

      if (workoutPlans && workoutPlans.length > 0) {
          // Deduplicate by id to prevent duplicates when both customer_id and lead_id match
          const uniquePlans = Array.from(
            new Map(workoutPlans.map((plan: any) => [plan.id, plan])).values()
          );
          
          workoutHistory.push(...uniquePlans.map((plan: any) => ({
            id: plan.id,
            name: plan.workout_templates?.name || plan.description || 'תוכנית אימונים',
            startDate: plan.start_date,
            validUntil: plan.end_date || null,
            duration: plan.end_date && plan.start_date
              ? `${Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} ימים`
              : 'ללא תאריך סיום',
            description: plan.description || '',
            strengthCount: plan.split?.strength || plan.strength || 0,
            cardioCount: plan.split?.cardio || plan.cardio || 0,
            intervalsCount: plan.split?.intervals || plan.intervals || 0,
            strength: plan.split?.strength || plan.strength || 0,
            cardio: plan.split?.cardio || plan.cardio || 0,
            intervals: plan.split?.intervals || plan.intervals || 0,
            split: plan.split || { 
              strength: plan.strength || 0, 
              cardio: plan.cardio || 0, 
              intervals: plan.intervals || 0 
            },
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: plan.is_active,
          })));
      }

      if (nutritionPlans && nutritionPlans.length > 0) {
          // Deduplicate by id to prevent duplicates when both customer_id and lead_id match
          const uniquePlans = Array.from(
            new Map(nutritionPlans.map((plan: any) => [plan.id, plan])).values()
          );
          
          nutritionHistory.push(...uniquePlans.map((plan: any) => ({
            id: plan.id,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            description: plan.description || plan.nutrition_templates?.name || 'תוכנית תזונה',
            template_id: plan.template_id,
            targets: plan.targets || {},
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: plan.is_active,
          })));
      }

      if (supplementPlans && supplementPlans.length > 0) {
          // Deduplicate by id to prevent duplicates when both customer_id and lead_id match
          const uniquePlans = Array.from(
            new Map(supplementPlans.map((plan: any) => [plan.id, plan])).values()
          );
          
          // Handle supplements - can be array of strings or array of objects
          supplementsHistory.push(...uniquePlans.map((plan: any) => {
            let supplementsArray: string[] = [];
            if (Array.isArray(plan.supplements)) {
              supplementsArray = plan.supplements.map((sup: any) => 
                typeof sup === 'string' ? sup : sup.name || JSON.stringify(sup)
              );
            }
            
            return {
              id: plan.id,
              startDate: plan.start_date,
              endDate: plan.end_date || null,
              supplements: supplementsArray,
              description: plan.description || 'תוכנית תוספים',
              budget_id: plan.budget_id,
              created_at: plan.created_at,
              is_active: plan.is_active,
            };
          }));
      }

      // Fetch steps plans from steps_plans table
      if (stepsPlans && stepsPlans.length > 0) {
        // Deduplicate by id to prevent duplicates when both customer_id and lead_id match
        const uniquePlans = Array.from(
          new Map(stepsPlans.map((plan: any) => [plan.id, plan])).values()
        );
        
        stepsHistory.push(...uniquePlans.map((plan: any) => ({
          id: plan.id,
          weekNumber: plan.is_active ? 'נוכחי' : `תוכנית ${plan.id.substring(0, 8)}`,
          target: plan.steps_goal || 0,
          startDate: plan.start_date,
          endDate: plan.end_date || null,
          dates: plan.start_date ? formatDate(plan.start_date) : '',
          description: plan.description || 'תוכנית צעדים',
          budget_id: plan.budget_id,
          created_at: plan.created_at,
          is_active: plan.is_active,
        })));
      } else {
        // Fallback: Check if there's a steps goal in daily_protocol or from active budget
        // This is a temporary workaround until steps_plans table is created
        if (customerId) {
          const { data: customer } = await supabase
            .from('customers')
            .select('daily_protocol')
            .eq('id', customerId)
            .single();
          
          if (customer?.daily_protocol?.stepsGoal) {
            // Also check for active budget assignment to get steps_instructions
            const { data: activeBudget } = await supabase
              .from('budget_assignments')
              .select(`
                budget:budgets(steps_goal, steps_instructions, name)
              `)
              .eq('customer_id', customerId)
              .eq('is_active', true)
              .maybeSingle();
            
            if (activeBudget?.budget) {
              const budget = activeBudget.budget as any;
              stepsHistory.push({
                weekNumber: 'נוכחי',
                target: budget.steps_goal || customer.daily_protocol.stepsGoal || 0,
                startDate: new Date().toISOString().split('T')[0],
                description: `תוכנית צעדים מתקציב: ${budget.name || 'תקציב פעיל'}`,
                budget_id: activeBudget.budget_id,
                is_active: true,
              });
            } else if (customer.daily_protocol.stepsGoal) {
              stepsHistory.push({
                weekNumber: 'נוכחי',
                target: customer.daily_protocol.stepsGoal,
                startDate: new Date().toISOString().split('T')[0],
                description: 'תוכנית צעדים',
                is_active: true,
              });
            }
          }
        }
      }

      const result = {
        workoutHistory,
        nutritionHistory,
        supplementsHistory,
        stepsHistory,
      };
      console.log('[usePlansHistory] Final result:', {
        workout: result.workoutHistory.length,
        nutrition: result.nutritionHistory.length,
        supplements: result.supplementsHistory.length,
        steps: result.stepsHistory.length,
      });
      return result;
    },
    enabled: !!(customerId || leadId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
};


