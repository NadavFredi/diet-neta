import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface TemplateLead {
  lead_id: string;
  lead_name: string;
  lead_email?: string;
  plan_id: string;
  plan_created_at: string;
}

export const useTemplateLeads = (templateId: string) => {
  return useQuery({
    queryKey: ['template-leads', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('workout_plans')
        .select(`
          id,
          lead_id,
          created_at,
          leads!inner (
            id,
            customer_id,
            customer:customers!inner (
            full_name,
              phone,
            email
            )
          )
        `)
        .eq('template_id', templateId)
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching template leads:', error);
        throw error;
      }

      if (!data) return [];

      return data
        .filter((plan: any) => plan.leads) // Filter out null leads
        .map((plan: any) => ({
          lead_id: plan.lead_id,
          lead_name: plan.leads?.customer?.full_name || 'ללא שם',
          lead_email: plan.leads?.customer?.email,
          plan_id: plan.id,
          plan_created_at: plan.created_at,
        })) as TemplateLead[];
    },
    enabled: !!templateId,
  });
};

