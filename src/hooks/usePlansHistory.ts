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

        if (customerId) {
          workoutQuery = workoutQuery.eq('customer_id', customerId);
        }
        if (leadId) {
          workoutQuery = workoutQuery.eq('lead_id', leadId);
        }

        const { data: workoutPlans } = await workoutQuery;

        if (workoutPlans) {
          workoutHistory.push(...workoutPlans.map((plan: any) => ({
            id: plan.id,
            name: plan.workout_templates?.name || plan.description || 'תוכנית אימונים',
            startDate: plan.start_date,
            validUntil: plan.end_date || null,
            duration: plan.end_date && plan.start_date
              ? `${Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} ימים`
              : 'ללא תאריך סיום',
            description: plan.description || '',
            strengthCount: plan.split?.strength || 0,
            cardioCount: plan.split?.cardio || 0,
            intervalsCount: plan.split?.intervals || 0,
            split: plan.split || {},
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

        if (customerId) {
          nutritionQuery = nutritionQuery.eq('customer_id', customerId);
        }
        if (leadId) {
          nutritionQuery = nutritionQuery.eq('lead_id', leadId);
        }

        const { data: nutritionPlans } = await nutritionQuery;

        if (nutritionPlans) {
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

        if (customerId) {
          supplementQuery = supplementQuery.eq('customer_id', customerId);
        }
        if (leadId) {
          supplementQuery = supplementQuery.eq('lead_id', leadId);
        }

        const { data: supplementPlans } = await supplementQuery;

        if (supplementPlans) {
          supplementsHistory.push(...supplementPlans.map((plan: any) => ({
            id: plan.id,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            supplements: plan.supplements || [],
            description: plan.description || 'תוכנית תוספים',
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: plan.is_active,
          })));
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

      return {
        workoutHistory,
        nutritionHistory,
        supplementsHistory,
        stepsHistory,
      };
    },
    enabled: !!(customerId || leadId),
  });
};

