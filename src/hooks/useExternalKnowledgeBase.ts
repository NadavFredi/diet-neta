/**
 * useExternalKnowledgeBase Hook
 * 
 * Hook for managing external knowledge base articles (CRUD operations)
 * These articles are visible to clients when published
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';

export interface ContentBlock {
  type: 'text' | 'image' | 'video';
  content?: string; // For text blocks and image/video alt text
  url?: string; // For image and video blocks
}

export interface ArticleContent {
  blocks: ContentBlock[];
}

export interface ExternalKnowledgeBaseArticle {
  id: string;
  title: string;
  content: ArticleContent | string; // Support both new JSONB format and legacy string
  cover_image: string | null;
  images: string[]; // Legacy field, deprecated
  videos: string[]; // Legacy field, deprecated
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fetch all knowledge base articles (for managers - includes drafts)
export const useExternalKnowledgeBase = () => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['externalKnowledgeBase'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('external_knowledge_base')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return (data || []) as ExternalKnowledgeBaseArticle[];
      } catch (error) {
        return [];
      }
    },
  });
};

// Helper to normalize content structure
export const normalizeContent = (content: ArticleContent | string): ArticleContent => {
  if (typeof content === 'string') {
    // Legacy format - convert to blocks
    return {
      blocks: [{ type: 'text', content }],
    };
  }
  if (content && typeof content === 'object' && 'blocks' in content) {
    return content as ArticleContent;
  }
  return { blocks: [] };
};

// Fetch only published articles (for clients)
export const usePublishedArticles = () => {
  return useQuery({
    queryKey: ['publishedArticles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('external_knowledge_base')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return (data || []) as ExternalKnowledgeBaseArticle[];
      } catch (error) {
        return [];
      }
    },
  });
};

// Create a new knowledge base article
export const useCreateExternalArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (article: {
      title: string;
      content: ArticleContent | string;
      cover_image?: string | null;
      images?: string[];
      videos?: string[];
      status?: 'draft' | 'published';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('external_knowledge_base')
        .insert({
          title: article.title,
          content: typeof article.content === 'string' ? article.content : article.content,
          cover_image: article.cover_image || null,
          images: article.images || [],
          videos: article.videos || [],
          status: article.status || 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ExternalKnowledgeBaseArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalKnowledgeBase'] });
      queryClient.invalidateQueries({ queryKey: ['publishedArticles'] });
      toast({
        title: 'הצלחה',
        description: 'המאמר נוצר בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת המאמר',
        variant: 'destructive',
      });
    },
  });
};

// Update a knowledge base article
export const useUpdateExternalArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ExternalKnowledgeBaseArticle, 'id' | 'created_at' | 'created_by'>>;
    }) => {
      const { data, error } = await supabase
        .from('external_knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ExternalKnowledgeBaseArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalKnowledgeBase'] });
      queryClient.invalidateQueries({ queryKey: ['publishedArticles'] });
      toast({
        title: 'הצלחה',
        description: 'המאמר עודכן בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון המאמר',
        variant: 'destructive',
      });
    },
  });
};

// Delete a knowledge base article
export const useDeleteExternalArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalKnowledgeBase'] });
      queryClient.invalidateQueries({ queryKey: ['publishedArticles'] });
      toast({
        title: 'הצלחה',
        description: 'המאמר נמחק בהצלחה',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת המאמר',
        variant: 'destructive',
      });
    },
  });
};
