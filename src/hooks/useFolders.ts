/**
 * Hook for managing interface folders
 * 
 * Allows users to create, update, delete, and reorder folders under interfaces.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface InterfaceFolder {
  id: string;
  name: string;
  interface_key: string;
  user_id: string;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

// Get folders for a specific interface
export const useFolders = (interfaceKey: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['folders', interfaceKey, user?.id],
    queryFn: async (): Promise<InterfaceFolder[]> => {
      if (!user?.id || !interfaceKey) return [];

      try {
        const { data, error } = await supabase
          .from('interface_folders')
          .select('*')
          .eq('interface_key', interfaceKey)
          .eq('user_id', user.id)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true }); // Fallback sort by name

        if (error) {
          return [];
        }

        return (data || []) as InterfaceFolder[];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.id && !!interfaceKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create a new folder
export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      name,
      interfaceKey,
    }: {
      name: string;
      interfaceKey: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get the max display_order for this interface/user to place new folder at the end
      const { data: existingFolders } = await supabase
        .from('interface_folders')
        .select('display_order')
        .eq('interface_key', interfaceKey)
        .eq('user_id', user.id)
        .order('display_order', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      const maxOrder = existingFolders?.display_order ?? 0;
      const newOrder = maxOrder + 1;

      const { data, error } = await supabase
        .from('interface_folders')
        .insert({
          name,
          interface_key: interfaceKey,
          user_id: user.id,
          display_order: newOrder,
        })
        .select()
        .single();

      if (error) throw error;

      return data as InterfaceFolder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.interface_key] });
    },
  });
};

// Update folder name
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('interface_folders')
        .update({ name })
        .eq('id', folderId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data as InterfaceFolder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.interface_key] });
    },
  });
};

// Delete a folder
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get folder info before deletion for cache invalidation
      const { data: folder } = await supabase
        .from('interface_folders')
        .select('interface_key')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();

      // Delete the folder (this will set folder_id to NULL in saved_views due to ON DELETE SET NULL)
      const { error } = await supabase
        .from('interface_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      return folder?.interface_key;
    },
    onSuccess: (interfaceKey) => {
      if (interfaceKey) {
        queryClient.invalidateQueries({ queryKey: ['folders', interfaceKey] });
        // Also invalidate saved views as they may have been in this folder
        queryClient.invalidateQueries({ queryKey: ['savedViews', interfaceKey] });
      }
    },
  });
};

// Update multiple folder orders at once
export const useUpdateFolderOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (orders: Array<{ folder_id: string; display_order: number }>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get interface_key from first folder to invalidate correct query
      const firstFolderId = orders[0]?.folder_id;
      let interfaceKey: string | null = null;

      if (firstFolderId) {
        const { data } = await supabase
          .from('interface_folders')
          .select('interface_key')
          .eq('id', firstFolderId)
          .eq('user_id', user.id)
          .single();
        interfaceKey = data?.interface_key || null;
      }

      // Update each folder order
      const updates = orders.map(({ folder_id, display_order }) =>
        supabase
          .from('interface_folders')
          .update({ display_order })
          .eq('id', folder_id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error('Failed to update some folder orders');
      }

      return interfaceKey;
    },
    onSuccess: (interfaceKey) => {
      if (interfaceKey) {
        queryClient.invalidateQueries({ queryKey: ['folders', interfaceKey] });
      }
    },
  });
};
