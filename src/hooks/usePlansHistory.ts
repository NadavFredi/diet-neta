/**
 * Hook to fetch all plans (workout, nutrition, supplements) for a customer/lead
 * and transform them into the format expected by LeadHistoryTabs
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

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

      // Fetch workout plans
      if (customerId || leadId) {
        let workoutQuery = supabase
          .from('workout_plans')
          .select('*, budget_id, workout_templates(name)')
          .order('created_at', { ascending: false });

        // Use OR logic: plans that belong to either customer OR lead
        if (customerId && leadId) {
          workoutQuery = workoutQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
        } else if (customerId) {
          workoutQuery = workoutQuery.eq('customer_id', customerId);
        } else if (leadId) {
          workoutQuery = workoutQuery.eq('lead_id', leadId);
        }

        const { data: workoutPlans, error: workoutError } = await workoutQuery;
        
        if (workoutError) {
          console.error('Error fetching workout plans:', workoutError);
        }

        console.log('[usePlansHistory] Workout plans fetched:', workoutPlans?.length || 0);
        if (workoutPlans && workoutPlans.length > 0) {
          workoutHistory.push(...workoutPlans.map((plan: any) => ({
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
      }

      // Fetch nutrition plans
      if (customerId || leadId) {
        let nutritionQuery = supabase
          .from('nutrition_plans')
          .select('*, budget_id, nutrition_templates(name)')
          .order('created_at', { ascending: false });

        // Use OR logic: plans that belong to either customer OR lead
        if (customerId && leadId) {
          nutritionQuery = nutritionQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
        } else if (customerId) {
          nutritionQuery = nutritionQuery.eq('customer_id', customerId);
        } else if (leadId) {
          nutritionQuery = nutritionQuery.eq('lead_id', leadId);
        }

        const { data: nutritionPlans, error: nutritionError } = await nutritionQuery;
        
        if (nutritionError) {
          console.error('Error fetching nutrition plans:', nutritionError);
        }

        console.log('[usePlansHistory] Nutrition plans fetched:', nutritionPlans?.length || 0);
        if (nutritionPlans && nutritionPlans.length > 0) {
          nutritionHistory.push(...nutritionPlans.map((plan: any) => ({
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
      }

      // Fetch supplement plans
      if (customerId || leadId) {
        let supplementQuery = supabase
          .from('supplement_plans')
          .select('*, budget_id')
          .order('created_at', { ascending: false });

        // Use OR logic: plans that belong to either customer OR lead
        if (customerId && leadId) {
          supplementQuery = supplementQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
        } else if (customerId) {
          supplementQuery = supplementQuery.eq('customer_id', customerId);
        } else if (leadId) {
          supplementQuery = supplementQuery.eq('lead_id', leadId);
        }

        const { data: supplementPlans, error: supplementError } = await supplementQuery;
        
        if (supplementError) {
          console.error('Error fetching supplement plans:', supplementError);
        }

        console.log('[usePlansHistory] Supplement plans fetched:', supplementPlans?.length || 0);
        if (supplementPlans && supplementPlans.length > 0) {
          // Handle supplements - can be array of strings or array of objects
          supplementsHistory.push(...supplementPlans.map((plan: any) => {
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
      }

      // Fetch steps history from daily_protocol
      if (customerId) {
        const { data: customer } = await supabase
          .from('customers')
          .select('daily_protocol')
          .eq('id', customerId)
          .single();

        if (customer?.daily_protocol?.stepsGoal) {
          stepsHistory.push({
            weekNumber: 'נוכחי',
            target: customer.daily_protocol.stepsGoal,
            startDate: new Date().toISOString().split('T')[0],
          });
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
  });
};


