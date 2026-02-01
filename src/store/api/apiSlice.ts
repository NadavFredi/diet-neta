import { createApi } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabaseClient';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: async () => ({ data: null }), // Dummy baseQuery, we use queryFn directly
  tagTypes: ['Leads', 'NutritionPlan', 'PlansHistory'],
  endpoints: (builder) => ({
    // Nutrition Plans endpoints
    getNutritionPlans: builder.query<any[], { customerId?: string; leadId?: string }>({
      queryFn: async ({ customerId, leadId }) => {
        try {
          let query = supabase
            .from('nutrition_plans')
            .select('*, budget_id, nutrition_templates(name)')
            .order('created_at', { ascending: false });
          
          if (customerId && leadId) {
            query = query.or(`customer_id.eq.${customerId},lead_id.eq.${leadId}`);
          } else if (customerId) {
            query = query.eq('customer_id', customerId);
          } else if (leadId) {
            query = query.eq('lead_id', leadId);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          return { data: data || [] };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, { customerId, leadId }) => 
        result 
          ? [
              ...result.map(({ id }) => ({ type: 'NutritionPlan' as const, id })),
              { type: 'PlansHistory', id: `${customerId || 'null'}-${leadId || 'null'}` },
            ]
          : [{ type: 'PlansHistory', id: `${customerId || 'null'}-${leadId || 'null'}` }],
    }),
    
    getNutritionPlan: builder.query<any, string>({
      queryFn: async (id) => {
        try {
          const { data, error } = await supabase
            .from('nutrition_plans')
            .select('*, budget_id, nutrition_templates(name)')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return { data };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'NutritionPlan', id }],
    }),
    
    updateNutritionPlan: builder.mutation<any, { id: string; targets: any; customerId?: string; leadId?: string }>({
      queryFn: async ({ id, targets }) => {
        try {
          const { data, error } = await supabase
            .from('nutrition_plans')
            .update({
              targets,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          return { data };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // Optimistic update - update cache immediately before server responds
      async onQueryStarted({ id, targets, customerId, leadId }, { dispatch, queryFulfilled }) {
        // Optimistically update all relevant caches
        const patchResults: any[] = [];
        
        // Update getNutritionPlans cache for this customer/lead
        if (customerId || leadId) {
          const patchResult = dispatch(
            api.util.updateQueryData('getNutritionPlans', { customerId, leadId }, (draft) => {
              const plan = draft.find((p) => p.id === id);
              if (plan) {
                plan.targets = targets;
                plan.updated_at = new Date().toISOString();
              }
            })
          );
          patchResults.push(patchResult);
        }
        
        // Also update for any other customer/lead combinations that might have this plan
        const patchResult2 = dispatch(
          api.util.updateQueryData('getNutritionPlans', { customerId: undefined, leadId: undefined }, (draft) => {
            const plan = draft.find((p) => p.id === id);
            if (plan) {
              plan.targets = targets;
              plan.updated_at = new Date().toISOString();
            }
          })
        );
        patchResults.push(patchResult2);
        
        try {
          await queryFulfilled;
        } catch {
          // Revert all optimistic updates on error
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { id, customerId, leadId }) => [
        { type: 'NutritionPlan', id },
        { type: 'PlansHistory', id: `${customerId || 'null'}-${leadId || 'null'}` },
        'PlansHistory', // Also invalidate all plans history
      ],
    }),
  }),
});

export const {
  useGetNutritionPlansQuery,
  useGetNutritionPlanQuery,
  useUpdateNutritionPlanMutation,
} = api;






























