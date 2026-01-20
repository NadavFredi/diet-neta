/**
 * KnowledgeBaseArticles Component
 * 
 * Displays published knowledge base articles for clients as cards at the bottom
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Calendar, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublishedArticles } from '@/hooks/useExternalKnowledgeBase';
import { useNavigate } from 'react-router-dom';
import { normalizeContent, type ArticleContent } from '@/hooks/useExternalKnowledgeBase';

// Helper to get preview text from content
const getPreviewText = (content: ArticleContent | string, maxLength: number = 150): string => {
  const normalized = normalizeContent(typeof content === 'string' ? content : content);
  const textBlocks = normalized.blocks.filter(b => b.type === 'text');
  if (textBlocks.length > 0 && textBlocks[0].content) {
    const text = textBlocks[0].content.replace(/<[^>]*>/g, ''); // Strip HTML tags
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  return '';
};

export const KnowledgeBaseArticles: React.FC = () => {
  const { data: articles = [], isLoading } = usePublishedArticles();
  const navigate = useNavigate();

  const handleCardClick = (articleId: string) => {
    navigate(`/client/knowledge-base/article/${articleId}`);
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mx-auto mb-4" />
          <p className="text-base font-medium text-gray-500">טוען מאמרים...</p>
        </CardContent>
      </Card>
    );
  }

  if (articles.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-base font-medium text-gray-500 mb-2">
            אין מאמרים זמינים כרגע
          </p>
          <p className="text-sm text-gray-400">
            מאמרים חדשים יופיעו כאן בקרוב
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Articles Cards - Displayed at bottom */}
      <div className="space-y-4">
        {articles.map((article) => {
          const previewText = getPreviewText(article.content);
          return (
            <Card
              key={article.id}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200",
                "hover:border-[#5B6FB9] overflow-hidden group"
              )}
              onClick={() => handleCardClick(article.id)}
            >
              <div className="flex flex-col md:flex-row">
                {/* Cover Image or Placeholder */}
                {article.cover_image ? (
                  <div className="w-full md:w-64 h-48 md:h-auto flex-shrink-0">
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-64 h-48 md:h-auto flex-shrink-0 bg-gradient-to-br from-[#5B6FB9]/20 to-[#5B6FB9]/5 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-[#5B6FB9]/30" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#5B6FB9] transition-colors">
                      {article.title}
                    </CardTitle>
                    {previewText && (
                      <CardDescription className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {previewText}
                      </CardDescription>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(article.created_at).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#5B6FB9] text-sm font-medium">
                      <span>קרא עוד</span>
                      <ArrowLeft className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
