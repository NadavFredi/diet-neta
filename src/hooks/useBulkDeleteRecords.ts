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
      if (!ids.length) return { deletedCount: 0 };
      let query = supabase.from(table).delete().in('id', ids).select();
      if (createdByField && user?.id) {
        query = query.eq(createdByField, user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      const deletedCount = data?.length || 0;
      if (deletedCount === 0 && ids.length > 0) {
        throw new Error('לא נמצאו רשומות למחיקה. ייתכן שאין הרשאה למחוק רשומות אלה.');
      }
      return { deletedCount };
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};
