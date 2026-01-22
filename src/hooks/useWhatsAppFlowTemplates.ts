import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { applySort } from '@/utils/supabaseSort';

export interface WhatsAppFlowTemplateRow {
  id: string;
  user_id: string;
  flow_key: string;
  template_content: string;
  buttons?: unknown;
  media?: unknown;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppFlowTemplates = (filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}) => {
  return useQuery<{ data: WhatsAppFlowTemplateRow[]; totalCount: number }>({
    queryKey: ['whatsapp-flow-templates', filters],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        return { data: [], totalCount: 0 };
      }

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 50;
      const search = filters?.search?.trim();

      const sortMap: Record<string, string> = {
        label: 'flow_key',
        key: 'flow_key',
        status: 'template_content',
        created_at: 'created_at',
        updated_at: 'updated_at',
      };

      let countQuery = supabase
        .from('whatsapp_flow_templates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (search) {
        countQuery = countQuery.or(`flow_key.ilike.%${search}%,template_content.ilike.%${search}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const totalCount = count || 0;

      let query = supabase
        .from('whatsapp_flow_templates')
        .select('*')
        .eq('user_id', userId);

      if (search) {
        query = query.or(`flow_key.ilike.%${search}%,template_content.ilike.%${search}%`);
      }

      if (filters?.sortBy && filters?.sortOrder) {
        query = applySort(query, filters.sortBy, filters.sortOrder, sortMap);
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      const maxPageSize = Math.min(pageSize, 100);
      const from = (page - 1) * maxPageSize;
      const to = from + maxPageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data || []) as WhatsAppFlowTemplateRow[], totalCount };
    },
    staleTime: 60 * 1000,
  });
};
