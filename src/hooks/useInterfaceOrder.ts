/**
 * Hook for managing interface display order
 * 
 * Allows users to drag and drop interfaces to reorder them.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface InterfaceOrderItem {
  interface_key: string;
  display_order: number | null;
}

// Get interface order for the current user
export const useInterfaceOrder = () => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['interfaceOrder', user?.id],
    queryFn: async (): Promise<InterfaceOrderItem[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from('user_interface_preferences')
          .select('interface_key, display_order')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('interface_key', { ascending: true }); // Fallback sort

        if (error) {
          return [];
        }

        return (data || []) as InterfaceOrderItem[];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update interface order
export const useUpdateInterfaceOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      interfaceKey,
      displayOrder,
    }: {
      interfaceKey: string;
      displayOrder: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_interface_preferences')
        .update({ display_order: displayOrder })
        .eq('user_id', user.id)
        .eq('interface_key', interfaceKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interfaceOrder'] });
    },
  });
};

// Update multiple interface orders at once
export const useUpdateInterfaceOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (orders: Array<{ interface_key: string; display_order: number }>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First, fetch existing preferences to preserve icon_name values
      const { data: existingPreferences, error: fetchError } = await supabase
        .from('user_interface_preferences')
        .select('interface_key, icon_name')
        .eq('user_id', user.id);

      if (fetchError) {
        throw new Error('Failed to fetch existing preferences');
      }

      // Create a map of existing icon names
      const iconMap = new Map<string, string>();
      existingPreferences?.forEach((pref) => {
        iconMap.set(pref.interface_key, pref.icon_name);
      });

      // Use UPSERT to create rows if they don't exist, or update if they do
      // Preserve existing icon_name, or use a default if creating new
      const upserts = orders.map(({ interface_key, display_order }) => {
        const existingIcon = iconMap.get(interface_key);
        return supabase
          .from('user_interface_preferences')
          .upsert(
            {
              user_id: user.id,
              interface_key: interface_key,
              display_order: display_order,
              icon_name: existingIcon || 'LayoutDashboard', // Use existing icon or default
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,interface_key',
            }
          );
      });

      const results = await Promise.all(upserts);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        console.error('Failed to update interface orders:', errors);
        throw new Error('Failed to update some interface orders');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interfaceOrder'] });
    },
  });
};
