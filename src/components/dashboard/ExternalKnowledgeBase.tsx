/**
 * ExternalKnowledgeBase Component
 * 
 * Manages external knowledge base articles that clients can view
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, Image as ImageIcon, Video, Search, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExternalKnowledgeBase, normalizeContent } from '@/hooks/useExternalKnowledgeBase';
import { ExternalArticleDialog } from './ExternalArticleDialog';
import type { ExternalKnowledgeBaseArticle } from '@/hooks/useExternalKnowledgeBase';

export const ExternalKnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const { data: articles = [], isLoading } = useExternalKnowledgeBase();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  // Filter articles based on search and status
  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(article => article.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => {
        const titleMatch = article.title?.toLowerCase().includes(query);
        const normalizedContent = normalizeContent(article.content);
        const textContent = normalizedContent.blocks
          .filter(b => b.type === 'text')
          .map(b => b.content || '')
          .join(' ')
          .toLowerCase();
        const contentMatch = textContent.includes(query);
        return titleMatch || contentMatch;
      });
    }

    return filtered;
  }, [articles, searchQuery, statusFilter]);

  const handleCardClick = (article: ExternalKnowledgeBaseArticle) => {
    // Navigate to full page view instead of opening modal
    navigate(`/dashboard/knowledge-base/article/${article.id}`);
  };

  const handleAddNew = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const publishedCount = articles.filter(a => a.status === 'published').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-base font-semibold text-gray-900">מאגר ידע חיצוני</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Eye className="h-3 w-3 ml-1" />
              {publishedCount} מפורסם
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              <EyeOff className="h-3 w-3 ml-1" />
              {draftCount} טיוטה
            </Badge>
          </div>
        </div>
        <Button
          onClick={handleAddNew}
          size="sm"
          className="h-8 px-3 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף מאמר חדש
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש בכותרת או תוכן..."
              className="pr-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
              dir="rtl"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={cn(
                "h-9 px-3 text-sm",
                statusFilter === 'all' && "bg-[#5B6FB9] text-white hover:bg-[#5B6FB9]/90"
              )}
            >
              הכל
            </Button>
            <Button
              variant={statusFilter === 'published' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('published')}
              className={cn(
                "h-9 px-3 text-sm",
                statusFilter === 'published' && "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              <Eye className="h-3 w-3 ml-1" />
              מפורסם
            </Button>
            <Button
              variant={statusFilter === 'draft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('draft')}
              className={cn(
                "h-9 px-3 text-sm",
                statusFilter === 'draft' && "bg-gray-600 text-white hover:bg-gray-700"
              )}
            >
              <EyeOff className="h-3 w-3 ml-1" />
              טיוטה
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mb-2" />
            <p className="text-sm text-gray-500">טוען מאמרים...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {searchQuery || statusFilter !== 'all' ? 'לא נמצאו מאמרים התואמים לסינון' : 'אין מאמרים עדיין'}
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' ? 'נסה לשנות את תנאי החיפוש' : 'הוסף מאמר ראשון כדי להתחיל'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                onClick={handleAddNew}
                size="sm"
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף מאמר
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200",
                  "hover:border-[#5B6FB9] flex flex-col",
                  article.status === 'published' && "border-green-200 bg-green-50/30"
                )}
                onClick={() => handleCardClick(article)}
              >
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
                          {article.title}
                        </CardTitle>
                        <Badge
                          variant={article.status === 'published' ? 'default' : 'outline'}
                          className={cn(
                            "text-xs shrink-0",
                            article.status === 'published'
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {article.status === 'published' ? (
                            <>
                              <Eye className="h-3 w-3 ml-1" />
                              מפורסם
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 ml-1" />
                              טיוטה
                            </>
                          )}
                        </Badge>
                      </div>
                      {(() => {
                        const normalizedContent = normalizeContent(article.content);
                        const textBlocks = normalizedContent.blocks.filter(b => b.type === 'text');
                        const previewText = textBlocks.length > 0 && textBlocks[0].content
                          ? textBlocks[0].content.replace(/<[^>]*>/g, '').substring(0, 100)
                          : '';
                        return previewText ? (
                          <CardDescription className="text-xs text-gray-600 line-clamp-3 mt-1">
                            {previewText}
                          </CardDescription>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Media indicators */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {article.images && article.images.length > 0 && (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          <span>{article.images.length}</span>
                        </div>
                      )}
                      {article.videos && article.videos.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          <span>{article.videos.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    {new Date(article.created_at).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog - Only for creating new articles */}
      <ExternalArticleDialog
        isOpen={dialogOpen}
        onOpenChange={handleDialogClose}
        article={null}
        mode={dialogMode}
      />
    </div>
  );
};
