import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// Get all template IDs that have connected leads
export const useTemplatesWithLeads = () => {
  return useQuery({
    queryKey: ['templates-with-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('template_id')
        .not('template_id', 'is', null)
        .not('lead_id', 'is', null);

      if (error) {
        console.error('Error fetching templates with leads:', error);
        throw error;
      }

      const templateIds = new Set<string>();
      data?.forEach((plan: any) => {
        if (plan.template_id) {
          templateIds.add(plan.template_id);
        }
      });

      return templateIds;
    },
  });
};




















