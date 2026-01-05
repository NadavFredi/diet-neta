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

      // Fetch workout plans with lead_id
      const { data: plans, error: plansError } = await supabase
        .from('workout_plans')
        .select('id, lead_id, created_at')
        .eq('template_id', templateId)
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false });

      if (plansError) {
        console.error('Error fetching workout plans:', plansError);
        throw plansError;
      }

      if (!plans || plans.length === 0) return [];

      // Get unique lead IDs
      const leadIds = [...new Set(plans.map((p: any) => p.lead_id).filter(Boolean))];

      if (leadIds.length === 0) return [];

      // Fetch leads with customer information
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          customer_id,
          customer:customers!inner (
            full_name,
            phone,
            email
          )
        `)
        .in('id', leadIds);

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      // Create a map of lead_id to lead data
      const leadsMap = new Map(
        (leads || []).map((lead: any) => [lead.id, lead])
      );

      // Map plans to template leads
      return plans
        .filter((plan: any) => plan.lead_id && leadsMap.has(plan.lead_id))
        .map((plan: any) => {
          const lead = leadsMap.get(plan.lead_id);
          return {
            lead_id: plan.lead_id,
            lead_name: lead?.customer?.full_name || 'ללא שם',
            lead_email: lead?.customer?.email,
            plan_id: plan.id,
            plan_created_at: plan.created_at,
          };
        }) as TemplateLead[];
    },
    enabled: !!templateId,
  });
};

