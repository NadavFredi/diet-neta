import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { NutritionTargets } from './useNutritionTemplates';

export interface NutritionPlan {
  id: string;
  user_id: string;
  lead_id?: string;
  template_id?: string;
  start_date: string;
  description?: string;
  targets: NutritionTargets;
  created_at: string;
  updated_at: string;
}

export const useNutritionPlan = (customerId?: string) => {
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    fetchNutritionPlan();
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
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setNutritionPlan({
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
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } else {
        setNutritionPlan(null);
      }
    } catch (err) {
      console.error('Error fetching nutrition plan:', err);
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
          template_id: planData.template_id,
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
        return newPlan;
      }
    } catch (err) {
      console.error('Error creating nutrition plan:', err);
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

      const { data, error: updateError } = await supabase
        .from('nutrition_plans')
        .update({
          start_date: planData.start_date,
          description: planData.description,
          targets: planData.targets,
        })
        .eq('id', nutritionPlan.id)
        .select()
        .single();

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
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setNutritionPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err) {
      console.error('Error updating nutrition plan:', err);
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
      console.error('Error deleting nutrition plan:', err);
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


