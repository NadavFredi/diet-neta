import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { NutritionTargets } from './useNutritionTemplates';
import { useQueryClient } from '@tanstack/react-query';

export interface NutritionPlan {
  id: string;
  user_id: string;
  lead_id?: string;
  template_id?: string;
  template_name?: string;
  budget_id?: string | null;
  name?: string;
  start_date: string;
  description?: string;
  targets: NutritionTargets;
  calculator_inputs?: any; // Calculator inputs (weight, height, age, etc.)
  created_at: string;
  updated_at: string;
}

export const useNutritionPlan = (customerId?: string) => {
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    fetchNutritionPlan();
    
    // Set up polling to sync with budget changes (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchNutritionPlan();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [customerId]);

  const fetchNutritionPlan = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('nutrition_plans')
        .select('*, budget_id, nutrition_templates(name)')
        .eq('customer_id', customerId)
        .eq('is_active', true) // Only fetch active plans
        .order('updated_at', { ascending: false }) // Use updated_at to get latest changes
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        console.log('[useNutritionPlan] Fetched data from DB:', data);
        console.log('[useNutritionPlan] calculator_inputs from DB:', data.calculator_inputs);
        setNutritionPlan({
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          template_name: data.nutrition_templates?.name,
          budget_id: data.budget_id,
          name: data.name || '',
          start_date: data.start_date,
          description: data.description || '',
          targets: data.targets || {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          },
          calculator_inputs: data.calculator_inputs || undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } else {
        setNutritionPlan(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nutrition plan');
    } finally {
      setIsLoading(false);
    }
  };

  const createNutritionPlan = async (planData: Partial<NutritionPlan>) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: createError } = await supabase
        .from('nutrition_plans')
        .insert({
          user_id: user.id,
          customer_id: customerId,
          lead_id: planData.lead_id,
          template_id: planData.template_id,
          budget_id: planData.budget_id,
          name: planData.name,
          start_date: planData.start_date,
          description: planData.description,
          targets: planData.targets || {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        const newPlan: NutritionPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          budget_id: data.budget_id,
          name: data.name || '',
          start_date: data.start_date,
          description: data.description || '',
          targets: data.targets || {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          },
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setNutritionPlan(newPlan);
        
        // Invalidate budget history query if the plan is linked to a budget
        if (newPlan.budget_id) {
          queryClient.invalidateQueries({ queryKey: ['budget-history'] });
        }
        
        return newPlan;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nutrition plan');
      throw err;
    }
  };

  const updateNutritionPlan = async (planData: Partial<NutritionPlan>) => {
    if (!nutritionPlan) {
      throw new Error('No nutrition plan to update');
    }

    try {
      setError(null);

      console.log('[updateNutritionPlan] planData received:', planData);
      console.log('[updateNutritionPlan] calculator_inputs:', (planData as any).calculator_inputs);
      
      const { data, error: updateError } = await supabase
        .from('nutrition_plans')
        .update({
          name: planData.name,
          start_date: planData.start_date,
          description: planData.description,
          targets: planData.targets,
          calculator_inputs: (planData as any).calculator_inputs || null,
        })
        .eq('id', nutritionPlan.id)
        .select()
        .single();
      
      console.log('[updateNutritionPlan] Updated data from DB:', data);
      console.log('[updateNutritionPlan] calculator_inputs after update:', data?.calculator_inputs);

      if (updateError) throw updateError;

      if (data) {
        const updatedPlan: NutritionPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          start_date: data.start_date,
          description: data.description || '',
          targets: data.targets || {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 30,
          },
          calculator_inputs: data.calculator_inputs || undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setNutritionPlan(updatedPlan);
        
        // Invalidate budget history query if the plan is linked to a budget
        if (updatedPlan.budget_id || nutritionPlan.budget_id) {
          queryClient.invalidateQueries({ queryKey: ['budget-history'] });
        }
        
        return updatedPlan;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update nutrition plan');
      throw err;
    }
  };

  const deleteNutritionPlan = async () => {
    if (!nutritionPlan) {
      throw new Error('No nutrition plan to delete');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('nutrition_plans')
        .delete()
        .eq('id', nutritionPlan.id);

      if (deleteError) throw deleteError;

      setNutritionPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nutrition plan');
      throw err;
    }
  };

  return {
    nutritionPlan,
    isLoading,
    error,
    fetchNutritionPlan,
    createNutritionPlan,
    updateNutritionPlan,
    deleteNutritionPlan,
  };
};


