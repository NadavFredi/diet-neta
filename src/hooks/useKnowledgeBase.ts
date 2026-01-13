/**
 * useKnowledgeBase Hook
 * 
 * Hook for managing internal knowledge base entries (CRUD operations)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  tags: string[];
  duration: number | null;
  additional_info: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fetch all knowledge base entries
export const useKnowledgeBase = () => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['knowledgeBase'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('internal_knowledge_base')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching knowledge base:', error);
          throw error;
        }

        return (data || []) as KnowledgeBaseEntry[];
      } catch (error) {
        console.error('Error in useKnowledgeBase:', error);
        return [];
      }
    },
  });
};

// Create a new knowledge base entry
export const useCreateKnowledgeBaseEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (entry: {
      title: string;
      description?: string | null;
      video_url?: string | null;
      tags?: string[];
      duration?: number | null;
      additional_info?: Record<string, any>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('internal_knowledge_base')
        .insert({
          ...entry,
          tags: entry.tags || [],
          additional_info: entry.additional_info || {},
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast({
        title: 'הצלחה',
        description: 'הרשומה נוצרה בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת הרשומה',
        variant: 'destructive',
      });
    },
  });
};

// Update a knowledge base entry
export const useUpdateKnowledgeBaseEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'created_by'>>;
    }) => {
      const { data, error } = await supabase
        .from('internal_knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast({
        title: 'הצלחה',
        description: 'הרשומה עודכנה בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון הרשומה',
        variant: 'destructive',
      });
    },
  });
};

// Delete a knowledge base entry
export const useDeleteKnowledgeBaseEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      toast({
        title: 'הצלחה',
        description: 'הרשומה נמחקה בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הרשומה',
        variant: 'destructive',
      });
    },
  });
};
