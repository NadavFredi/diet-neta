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
        
        // Extract _calculator_inputs from targets JSONB (nutrition_plans stores it there)
        const targetsData = data.targets || {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber: 30,
        };
        const { _calculator_inputs, _manual_override, ...cleanTargets } = targetsData as any;
        
        console.log('[useNutritionPlan] _calculator_inputs from targets:', _calculator_inputs);
        console.log('[useNutritionPlan] calculator_inputs from DB (top-level, deprecated):', data.calculator_inputs);
        
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
          targets: cleanTargets as NutritionTargets,
          calculator_inputs: _calculator_inputs || data.calculator_inputs || undefined,
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

      // If calculator_inputs is provided, store it inside targets as _calculator_inputs
      const targetsData = planData.targets || {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
      };
      
      const targetsWithCalculatorInputs = planData.calculator_inputs
        ? { ...targetsData, _calculator_inputs: planData.calculator_inputs }
        : targetsData;

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
          targets: targetsWithCalculatorInputs,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        // Extract _calculator_inputs from targets for the returned object
        const targetsData = data.targets || {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
          fiber: 30,
        };
        const { _calculator_inputs: savedCalcInputs, _manual_override: savedManualOverride, ...savedCleanTargets } = targetsData as any;
        
        const newPlan: NutritionPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          budget_id: data.budget_id,
          name: data.name || '',
          start_date: data.start_date,
          description: data.description || '',
          targets: savedCleanTargets as NutritionTargets,
          calculator_inputs: savedCalcInputs || undefined,
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
      
      // If calculator_inputs is provided, store it inside targets as _calculator_inputs
      // If targets is provided, merge calculator_inputs into it; otherwise use existing targets
      let targetsToSave = planData.targets || nutritionPlan.targets || {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
      };
      
      // Extract existing _calculator_inputs and _manual_override from current targets
      const { _calculator_inputs: existingCalcInputs, _manual_override: existingManualOverride, ...cleanTargets } = targetsToSave as any;
      
      // Merge new calculator_inputs if provided
      if (planData.calculator_inputs !== undefined) {
        targetsToSave = { ...cleanTargets, _calculator_inputs: planData.calculator_inputs };
        // Preserve _manual_override if it exists
        if (existingManualOverride) {
          (targetsToSave as any)._manual_override = existingManualOverride;
        }
      } else if (existingCalcInputs) {
        // Preserve existing _calculator_inputs if not being updated
        targetsToSave = { ...cleanTargets, _calculator_inputs: existingCalcInputs };
        if (existingManualOverride) {
          (targetsToSave as any)._manual_override = existingManualOverride;
        }
      } else {
        // Use clean targets without calculator inputs
        targetsToSave = cleanTargets;
        if (existingManualOverride) {
          (targetsToSave as any)._manual_override = existingManualOverride;
        }
      }
      
      const { data, error: updateError } = await supabase
        .from('nutrition_plans')
        .update({
          name: planData.name,
          start_date: planData.start_date,
          description: planData.description,
          targets: targetsToSave,
        })
        .eq('id', nutritionPlan.id)
        .select()
        .single();
      
      console.log('[updateNutritionPlan] Updated data from DB:', data);
      console.log('[updateNutritionPlan] targets._calculator_inputs after update:', (data?.targets as any)?._calculator_inputs);

      if (updateError) throw updateError;

      if (data) {
        // Extract _calculator_inputs from targets for the returned object
        const { _calculator_inputs: savedCalcInputs, _manual_override: savedManualOverride, ...savedCleanTargets } = (data.targets || {}) as any;
        
        const updatedPlan: NutritionPlan = {
          id: data.id,
          user_id: data.user_id,
          lead_id: data.lead_id,
          template_id: data.template_id,
          budget_id: data.budget_id,
          start_date: data.start_date,
          description: data.description || '',
          targets: savedCleanTargets as NutritionTargets,
          calculator_inputs: savedCalcInputs || undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setNutritionPlan(updatedPlan);
        
        // Plan is the source of truth - no need to sync back to budget
        // Budget nutrition_targets is only used for initial plan creation
        
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['plans-history'] });
        if (updatedPlan.budget_id) {
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


