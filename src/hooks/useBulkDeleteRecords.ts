import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

interface UseBulkDeleteRecordsOptions {
  table: string;
  invalidateKeys?: Array<unknown[]>;
  createdByField?: string;
}

export const useBulkDeleteRecords = ({
  table,
  invalidateKeys = [],
  createdByField,
}: UseBulkDeleteRecordsOptions) => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      let query = supabase.from(table).delete().in('id', ids);
      if (createdByField && user?.id) {
        query = query.eq(createdByField, user.id);
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};
