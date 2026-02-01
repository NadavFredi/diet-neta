/**
 * PrintBudgetPage Logic
 * 
 * Handles data fetching for the print-optimized budget page
 */

import { useParams } from 'react-router-dom';
import { useBudget } from '@/hooks/useBudgets';
import { useNutritionTemplate } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';

export interface PrintBudgetData {
  budget: any;
  nutritionTemplate: any;
  workoutTemplate: any;
  clientName: string | null;
  assignedDate: string | null;
}

export const usePrintBudgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: budget, isLoading: isLoadingBudget } = useBudget(id || null);
  const { data: nutritionTemplate, isLoading: isLoadingNutrition } = useNutritionTemplate(
    budget?.nutrition_template_id || null
  );
  const { data: workoutTemplate, isLoading: isLoadingWorkout } = useWorkoutTemplate(
    budget?.workout_template_id || null
  );

  const [clientInfo, setClientInfo] = useState<{ name: string | null; assignedDate: string | null; leadId: string | null; customerId: string | null }>({
    name: null,
    assignedDate: null,
    leadId: null,
    customerId: null,
  });
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [isLoadingWorkoutPlan, setIsLoadingWorkoutPlan] = useState(false);

  // Fetch client/lead information from active budget assignment
  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!budget?.id) return;

      setIsLoadingClient(true);
      try {
        // Try to find an active assignment for this budget
        const { data: assignment } = await supabase
          .from('budget_assignments')
          .select(`
            *,
            lead:leads(id, customer_id),
            customer:customers(id, full_name)
          `)
          .eq('budget_id', budget.id)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assignment) {
          let name: string | null = null;
          let leadId: string | null = null;
          let customerId: string | null = null;
          
          // Prefer customer name, fallback to lead info
          if (assignment.customer) {
            name = (assignment.customer as any).full_name;
            customerId = (assignment.customer as any).id;
          } else if (assignment.lead) {
            // Try to get customer name from lead
            const lead = assignment.lead as any;
            leadId = lead.id;
            if (lead.customer_id) {
              customerId = lead.customer_id;
              const { data: customer } = await supabase
                .from('customers')
                .select('full_name')
                .eq('id', lead.customer_id)
                .single();
              if (customer) {
                name = customer.full_name;
              }
            }
          }

          setClientInfo({
            name,
            assignedDate: assignment.assigned_at || null,
            leadId,
            customerId,
          });
        }
      } catch (error) {
        // Silent failure
      } finally {
        setIsLoadingClient(false);
      }
    };

    fetchClientInfo();
  }, [budget?.id]);

  // Fetch workout plan associated with budget if no template exists
  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      // Only fetch if there's no workout template and we have budget + client info
      if (workoutTemplate || !budget?.id || isLoadingClient) {
        setWorkoutPlan(null);
        return;
      }

      setIsLoadingWorkoutPlan(true);
      try {
        // Build query for workout plans
        let query = supabase
          .from('workout_plans')
          .select('*')
          .eq('budget_id', budget.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        // Add customer_id or lead_id filter if available
        if (clientInfo.customerId) {
          query = query.eq('customer_id', clientInfo.customerId);
        } else if (clientInfo.leadId) {
          query = query.eq('lead_id', clientInfo.leadId);
        }

        const { data: plans, error } = await query.maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // Silent failure
        } else if (plans) {
          setWorkoutPlan(plans);
        }
      } catch (error) {
        // Silent failure
      } finally {
        setIsLoadingWorkoutPlan(false);
      }
    };

    fetchWorkoutPlan();
  }, [budget?.id, workoutTemplate, clientInfo.customerId, clientInfo.leadId, isLoadingClient]);

  const isLoading = isLoadingBudget || isLoadingNutrition || isLoadingWorkout || isLoadingClient || isLoadingWorkoutPlan;

  // Determine which workout data to use: template or plan
  const workoutData = workoutTemplate 
    ? {
        name: workoutTemplate.name,
        description: workoutTemplate.description,
        goal_tags: workoutTemplate.goal_tags,
        weeklyWorkout: workoutTemplate.routine_data?.weeklyWorkout,
      }
    : workoutPlan
    ? {
        name: workoutPlan.name || 'תוכנית אימונים',
        description: workoutPlan.description,
        goal_tags: [],
        weeklyWorkout: workoutPlan.custom_attributes?.data?.weeklyWorkout,
      }
    : null;

  return {
    budget,
    nutritionTemplate,
    workoutTemplate,
    workoutPlan,
    workoutData,
    clientName: clientInfo.name,
    assignedDate: clientInfo.assignedDate,
    isLoading,
  };
};




