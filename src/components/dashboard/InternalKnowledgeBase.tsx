/**
 * InternalKnowledgeBase Component
 * 
 * Displays internal knowledge base entries in a beautiful card grid layout
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Video, Clock, Tag, ExternalLink, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeBaseItemDialog } from './KnowledgeBaseItemDialog';
import type { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';

export const InternalKnowledgeBase: React.FC = () => {
  const { data: entries = [], isLoading } = useKnowledgeBase();
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Helper to convert seconds to MM:SS format
  const secondsToMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get all unique tags from entries
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  // Filter entries based on search and tags
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title?.toLowerCase().includes(query) ||
        entry.description?.toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(entry =>
        entry.tags?.some(tag => selectedTags.has(tag))
      );
    }

    return filtered;
  }, [entries, searchQuery, selectedTags]);

  const handleCardClick = (entry: KnowledgeBaseEntry) => {
    setSelectedEntry(entry);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedEntry(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEntry(null);
  };

  const toggleTag = (tag: string) => {
    const newSelectedTags = new Set(selectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setSelectedTags(newSelectedTags);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags(new Set());
  };

  const hasActiveFilters = searchQuery.trim() || selectedTags.size > 0;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-900">מאגר ידע פנימי</h3>
        <Button
          onClick={handleAddNew}
          size="sm"
          className="h-8 px-3 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף חדש
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש בכותרת, תיאור או תגיות..."
            className="pr-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
            dir="rtl"
          />
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">סינון לפי תגיות:</span>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.has(tag) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-xs transition-colors",
                  selectedTags.has(tag) 
                    ? "bg-[#5B6FB9] text-white hover:bg-[#5B6FB9]/90" 
                    : "hover:bg-gray-100"
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3 ml-1" />
            נקה סינונים
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mb-2" />
            <p className="text-sm text-gray-500">טוען רשומות...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Video className="h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {hasActiveFilters ? 'לא נמצאו רשומות התואמות לסינון' : 'אין רשומות עדיין'}
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              {hasActiveFilters ? 'נסה לשנות את תנאי החיפוש' : 'הוסף רשומה ראשונה כדי להתחיל'}
            </p>
            {!hasActiveFilters && (
              <Button
                onClick={handleAddNew}
                size="sm"
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף רשומה
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredEntries.map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200",
                  "hover:border-[#5B6FB9] flex flex-col"
                )}
                onClick={() => handleCardClick(entry)}
              >
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                        {entry.title}
                      </CardTitle>
                      {entry.description && (
                        <CardDescription className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {entry.description}
                        </CardDescription>
                      )}
                    </div>
                    {entry.video_url && (
                      <Video className="h-4 w-4 text-[#5B6FB9] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="flex gap-1 flex-wrap">
                          {entry.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              +{entry.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Duration */}
                    {entry.duration && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{secondsToMMSS(entry.duration)}</span>
                      </div>
                    )}
                  </div>

                  {/* Link Icon */}
                  {entry.video_url && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <KnowledgeBaseItemDialog
        isOpen={dialogOpen}
        onOpenChange={handleDialogClose}
        entry={selectedEntry}
        mode={dialogMode}
      />
    </div>
  );
};
