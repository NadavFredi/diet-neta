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
            // When both are provided, match plans that have either customer_id OR lead_id OR both
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
            .select('*, budget_id, budgets(name)')
            .order('created_at', { ascending: false });

          if (customerId && leadId) {
            // When both are provided, match plans that have either customer_id OR lead_id OR both
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
      }
      if (nutritionError) {
      }
      if (supplementError) {
      }
      if (stepsError) {
      }

      // Get active budget assignment to determine which plans are active
      let activeBudgetId: string | null = null;
      if (customerId || leadId) {
        let activeBudgetQuery = supabase
          .from('budget_assignments')
          .select('budget_id')
          .eq('is_active', true);

        if (customerId && leadId) {
          activeBudgetQuery = activeBudgetQuery.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
        } else if (customerId) {
          activeBudgetQuery = activeBudgetQuery.eq('customer_id', customerId);
        } else if (leadId) {
          activeBudgetQuery = activeBudgetQuery.eq('lead_id', leadId);
        }

        const { data: activeBudgetAssignment } = await activeBudgetQuery.maybeSingle();
        activeBudgetId = activeBudgetAssignment?.budget_id || null;
      }

      if (workoutPlans && workoutPlans.length > 0) {
        // First deduplicate by id to prevent exact duplicates
        const uniquePlansById = Array.from(
          new Map(workoutPlans.map((plan: any) => [plan.id, plan])).values()
        );

        // Then deduplicate by budget_id - only one plan per budget (keep the most recent one)
        // This ensures that even if a plan has both customer_id and lead_id, we only show it once per budget
        const plansByBudget = new Map<string, any>();
        uniquePlansById.forEach((plan: any) => {
          // Skip plans without budget_id
          if (!plan.budget_id) {
            return;
          }
          
          const budgetKey = plan.budget_id;
          const existing = plansByBudget.get(budgetKey);
          
          if (!existing) {
            plansByBudget.set(budgetKey, plan);
          } else {
            // Keep the most recent one (by start_date or created_at)
            const existingDate = existing.start_date || existing.created_at || '';
            const planDate = plan.start_date || plan.created_at || '';
            if (planDate > existingDate || (!planDate && !existingDate && plan.created_at > existing.created_at)) {
              plansByBudget.set(budgetKey, plan);
            }
          }
        });
        
        const deduplicatedPlans = Array.from(plansByBudget.values());

        // Find the most recent plan from the active budget to mark as active
        let activePlanId: string | null = null;
        if (activeBudgetId) {
          const activePlan = deduplicatedPlans
            .filter((plan: any) => plan.budget_id === activeBudgetId)
            .sort((a: any, b: any) => {
              const dateA = a.start_date || a.created_at || '';
              const dateB = b.start_date || b.created_at || '';
              return dateB.localeCompare(dateA);
            })[0];
          if (activePlan) {
            activePlanId = activePlan.id;
          }
        }

        // Sort: active plan first, then by start_date descending (newest first)
        const sortedPlans = deduplicatedPlans.sort((a: any, b: any) => {
          const aIsActive = activePlanId !== null && a.id === activePlanId;
          const bIsActive = activePlanId !== null && b.id === activePlanId;
          
          // Active plans come first
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Then sort by date
          const dateA = a.start_date || a.created_at || '';
          const dateB = b.start_date || b.created_at || '';
          return dateB.localeCompare(dateA);
        });

        workoutHistory.push(...sortedPlans.map((plan: any) => {
          // Only mark as active if it's the most recent plan from the active budget
          const isActive = activePlanId !== null && plan.id === activePlanId;
          
          return {
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
            weeklyWorkout: plan.custom_attributes?.data?.weeklyWorkout || plan.routine_data?.weeklyWorkout || null,
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: isActive,
          };
        }));
      }

      if (nutritionPlans && nutritionPlans.length > 0) {
        // First deduplicate by id to prevent exact duplicates
        const uniquePlansById = Array.from(
          new Map(nutritionPlans.map((plan: any) => [plan.id, plan])).values()
        );

        // Then deduplicate by budget_id - only one plan per budget (keep the most recent one)
        // This ensures that even if a plan has both customer_id and lead_id, we only show it once per budget
        const plansByBudget = new Map<string, any>();
        uniquePlansById.forEach((plan: any) => {
          // Skip plans without budget_id
          if (!plan.budget_id) {
            return;
          }
          
          const budgetKey = plan.budget_id;
          const existing = plansByBudget.get(budgetKey);
          
          if (!existing) {
            plansByBudget.set(budgetKey, plan);
          } else {
            // Keep the most recent one (by start_date or created_at)
            const existingDate = existing.start_date || existing.created_at || '';
            const planDate = plan.start_date || plan.created_at || '';
            if (planDate > existingDate || (!planDate && !existingDate && plan.created_at > existing.created_at)) {
              plansByBudget.set(budgetKey, plan);
            }
          }
        });
        
        const deduplicatedPlans = Array.from(plansByBudget.values());

        // Find the most recent plan from the active budget to mark as active
        let activePlanId: string | null = null;
        if (activeBudgetId) {
          const activePlan = deduplicatedPlans
            .filter((plan: any) => plan.budget_id === activeBudgetId)
            .sort((a: any, b: any) => {
              const dateA = a.start_date || a.created_at || '';
              const dateB = b.start_date || b.created_at || '';
              return dateB.localeCompare(dateA);
            })[0];
          if (activePlan) {
            activePlanId = activePlan.id;
          }
        }

        // Sort: active plan first, then by start_date descending (newest first)
        const sortedPlans = deduplicatedPlans.sort((a: any, b: any) => {
          const aIsActive = activePlanId !== null && a.id === activePlanId;
          const bIsActive = activePlanId !== null && b.id === activePlanId;
          
          // Active plans come first
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Then sort by date
          const dateA = a.start_date || a.created_at || '';
          const dateB = b.start_date || b.created_at || '';
          return dateB.localeCompare(dateA);
        });

        nutritionHistory.push(...sortedPlans.map((plan: any) => {
          // Only mark as active if it's the most recent plan from the active budget
          const isActive = activePlanId !== null && plan.id === activePlanId;
          
          return {
            id: plan.id,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            description: plan.description || plan.nutrition_templates?.name || 'תוכנית תזונה',
            template_id: plan.template_id,
            targets: plan.targets || {},
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: isActive,
          };
        }));
      }

      if (supplementPlans && supplementPlans.length > 0) {
        // First deduplicate by id to prevent exact duplicates
        const uniquePlansById = Array.from(
          new Map(supplementPlans.map((plan: any) => [plan.id, plan])).values()
        );

        // Then deduplicate by budget_id - only one plan per budget (keep the most recent one)
        // This ensures that even if a plan has both customer_id and lead_id, we only show it once per budget
        const plansByBudget = new Map<string, any>();
        const plansWithoutBudget: any[] = [];
        
        uniquePlansById.forEach((plan: any) => {
          // Handle plans without budget_id separately
          if (!plan.budget_id) {
            plansWithoutBudget.push(plan);
            return;
          }
          
          const budgetKey = plan.budget_id;
          const existing = plansByBudget.get(budgetKey);
          
          if (!existing) {
            plansByBudget.set(budgetKey, plan);
          } else {
            // Keep the most recent one (by start_date or created_at)
            const existingDate = existing.start_date || existing.created_at || '';
            const planDate = plan.start_date || plan.created_at || '';
            if (planDate > existingDate || (!planDate && !existingDate && plan.created_at > existing.created_at)) {
              plansByBudget.set(budgetKey, plan);
            }
          }
        });
        
        // Combine plans with budget_id and plans without budget_id
        const deduplicatedPlans = [...Array.from(plansByBudget.values()), ...plansWithoutBudget];

        // Find the most recent plan from the active budget to mark as active
        let activePlanId: string | null = null;
        if (activeBudgetId) {
          const activePlan = deduplicatedPlans
            .filter((plan: any) => plan.budget_id === activeBudgetId)
            .sort((a: any, b: any) => {
              const dateA = a.start_date || a.created_at || '';
              const dateB = b.start_date || b.created_at || '';
              return dateB.localeCompare(dateA);
            })[0];
          if (activePlan) {
            activePlanId = activePlan.id;
          }
        }

        // Sort: active plan first, then by start_date descending (newest first)
        const sortedPlans = deduplicatedPlans.sort((a: any, b: any) => {
          const aIsActive = activePlanId !== null && a.id === activePlanId;
          const bIsActive = activePlanId !== null && b.id === activePlanId;
          
          // Active plans come first
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Then sort by date
          const dateA = a.start_date || a.created_at || '';
          const dateB = b.start_date || b.created_at || '';
          return dateB.localeCompare(dateA);
        });

        // Handle supplements - preserve object structure if available
        supplementsHistory.push(...sortedPlans.map((plan: any) => {
          let supplementsArray: any[] = [];
          if (Array.isArray(plan.supplements)) {
            supplementsArray = plan.supplements;
          }

          // Only mark as active if it's the most recent plan from the active budget
          const isActive = activePlanId !== null && plan.id === activePlanId;

          return {
            id: plan.id,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            supplements: supplementsArray,
            description: plan.description || 'תוכנית תוספים',
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: isActive,
          };
        }));
      }

      // Fetch steps plans from steps_plans table
      if (stepsPlans && stepsPlans.length > 0) {
        // First deduplicate by id to prevent exact duplicates
        const uniquePlansById = Array.from(
          new Map(stepsPlans.map((plan: any) => [plan.id, plan])).values()
        );

        // Then deduplicate by budget_id - only one plan per budget (keep the most recent one)
        // This ensures that even if a plan has both customer_id and lead_id, we only show it once per budget
        const plansByBudget = new Map<string, any>();
        const plansWithoutBudget: any[] = [];
        
        uniquePlansById.forEach((plan: any) => {
          // Handle plans without budget_id separately
          if (!plan.budget_id) {
            plansWithoutBudget.push(plan);
            return;
          }
          
          const budgetKey = plan.budget_id;
          const existing = plansByBudget.get(budgetKey);
          
          if (!existing) {
            plansByBudget.set(budgetKey, plan);
          } else {
            // Keep the most recent one (by start_date or created_at)
            const existingDate = existing.start_date || existing.created_at || '';
            const planDate = plan.start_date || plan.created_at || '';
            if (planDate > existingDate || (!planDate && !existingDate && plan.created_at > existing.created_at)) {
              plansByBudget.set(budgetKey, plan);
            }
          }
        });
        
        // Combine plans with budget_id and plans without budget_id
        const deduplicatedPlans = [...Array.from(plansByBudget.values()), ...plansWithoutBudget];

        // Find the most recent plan from the active budget to mark as active
        let activePlanId: string | null = null;
        if (activeBudgetId) {
          const activePlan = deduplicatedPlans
            .filter((plan: any) => plan.budget_id === activeBudgetId)
            .sort((a: any, b: any) => {
              const dateA = a.start_date || a.created_at || '';
              const dateB = b.start_date || b.created_at || '';
              return dateB.localeCompare(dateA);
            })[0];
          if (activePlan) {
            activePlanId = activePlan.id;
          }
        }

        // Sort: active plan first, then by start_date descending (newest first)
        const sortedPlans = deduplicatedPlans.sort((a: any, b: any) => {
          const aIsActive = activePlanId !== null && a.id === activePlanId;
          const bIsActive = activePlanId !== null && b.id === activePlanId;
          
          // Active plans come first
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Then sort by date
          const dateA = a.start_date || a.created_at || '';
          const dateB = b.start_date || b.created_at || '';
          return dateB.localeCompare(dateA);
        });

        stepsHistory.push(...sortedPlans.map((plan: any) => {
          // Use budget name instead of plan ID for display
          const budgetName = plan.budgets?.name || plan.description || '';
          // Only mark as active if it's the most recent plan from the active budget
          const isActive = activePlanId !== null && plan.id === activePlanId;
          const weekNumber = isActive 
            ? 'נוכחי' 
            : (budgetName || `תוכנית ${plan.id.substring(0, 8)}`);
          
          return {
            id: plan.id,
            weekNumber: weekNumber,
            target: plan.steps_goal || 0,
            stepsInstructions: plan.steps_instructions || '',
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            dates: plan.start_date ? formatDate(plan.start_date) : '',
            description: plan.description || budgetName || 'תוכנית צעדים',
            budget_id: plan.budget_id,
            created_at: plan.created_at,
            is_active: isActive,
          };
        }));
      } else if (activeBudgetId) {
        // Fallback: If no steps plans exist but there's an active budget, show the budget's steps goal
        const { data: activeBudget } = await supabase
          .from('budgets')
          .select('steps_goal, name')
          .eq('id', activeBudgetId)
          .maybeSingle();

        if (activeBudget?.steps_goal) {
          stepsHistory.push({
            weekNumber: 'נוכחי',
            target: activeBudget.steps_goal,
            startDate: new Date().toISOString().split('T')[0],
            description: `תוכנית צעדים מתכנית פעולה: ${activeBudget.name || 'תקציב פעיל'}`,
            budget_id: activeBudgetId,
            is_active: true,
          });
        }
      }

      const result = {
        workoutHistory,
        nutritionHistory,
        supplementsHistory,
        stepsHistory,
      };
      return result;
    },
    enabled: !!(customerId || leadId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
};


