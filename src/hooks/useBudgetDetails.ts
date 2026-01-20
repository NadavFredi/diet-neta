/**
 * useBudgetDetails Hook
 * 
 * Fetches a budget with its linked nutrition and workout templates
 */

import { useQuery } from '@tanstack/react-query';
import { useBudget } from './useBudgets';
import { useNutritionTemplate } from './useNutritionTemplates';
import { useWorkoutTemplate } from './useWorkoutTemplates';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';

export interface BudgetDetails {
  budget: any;
  nutritionTemplate: any;
  workoutTemplate: any;
  clientName: string | null;
  assignedDate: string | null;
}

export const useBudgetDetails = (budgetId: string | null) => {
  const { data: budget, isLoading: isLoadingBudget } = useBudget(budgetId || null);
  const { data: nutritionTemplate, isLoading: isLoadingNutrition } = useNutritionTemplate(
    budget?.nutrition_template_id || null
  );
  const { data: workoutTemplate, isLoading: isLoadingWorkout } = useWorkoutTemplate(
    budget?.workout_template_id || null
  );

  const [clientInfo, setClientInfo] = useState<{ name: string | null; assignedDate: string | null }>({
    name: null,
    assignedDate: null,
  });
  const [isLoadingClient, setIsLoadingClient] = useState(false);

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
          
          // Prefer customer name, fallback to lead info
          if (assignment.customer) {
            name = (assignment.customer as any).full_name;
          } else if (assignment.lead) {
            // Try to get customer name from lead
            const lead = assignment.lead as any;
            if (lead.customer_id) {
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

  const isLoading = isLoadingBudget || isLoadingNutrition || isLoadingWorkout || isLoadingClient;

  return {
    budget,
    nutritionTemplate,
    workoutTemplate,
    clientName: clientInfo.name,
    assignedDate: clientInfo.assignedDate,
    isLoading,
  };
};
