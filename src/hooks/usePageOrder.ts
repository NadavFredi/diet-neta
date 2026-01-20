/**
 * Hook for managing page/view display order
 * 
 * Allows users to drag and drop pages/views to reorder them.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

// Update page/view order
export const useUpdatePageOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      viewId,
      displayOrder,
    }: {
      viewId: string;
      displayOrder: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('saved_views')
        .update({ display_order: displayOrder })
        .eq('id', viewId)
        .eq('created_by', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Get the resource_key from the view to invalidate the correct query
      supabase
        .from('saved_views')
        .select('resource_key')
        .eq('id', variables.viewId)
        .single()
        .then(({ data }) => {
          if (data) {
            queryClient.invalidateQueries({ queryKey: ['savedViews', data.resource_key] });
          }
        });
    },
  });
};

// Update multiple page/view orders at once
export const useUpdatePageOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (orders: Array<{ view_id: string; display_order: number }>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get resource_key from first view to invalidate correct query
      const firstViewId = orders[0]?.view_id;
      let resourceKey: string | null = null;

      if (firstViewId) {
        const { data } = await supabase
          .from('saved_views')
          .select('resource_key')
          .eq('id', firstViewId)
          .single();
        resourceKey = data?.resource_key || null;
      }

      // Update each page order
      const updates = orders.map(({ view_id, display_order }) =>
        supabase
          .from('saved_views')
          .update({ display_order })
          .eq('id', view_id)
          .eq('created_by', user.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error('Failed to update some page orders');
      }

      return resourceKey;
    },
    onSuccess: (resourceKey) => {
      if (resourceKey) {
        queryClient.invalidateQueries({ queryKey: ['savedViews', resourceKey] });
      }
    },
  });
};
