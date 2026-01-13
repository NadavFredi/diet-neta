/**
 * InternalKnowledgeBase Component
 * 
 * Displays internal knowledge base entries in a beautiful card grid layout
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Video, Clock, Tag, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeBaseItemDialog } from './KnowledgeBaseItemDialog';
import type { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';

export const InternalKnowledgeBase: React.FC = () => {
  const { data: entries = [], isLoading } = useKnowledgeBase();
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');

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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mb-2" />
            <p className="text-sm text-gray-500">טוען רשומות...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Video className="h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">אין רשומות עדיין</h4>
            <p className="text-xs text-gray-500 mb-4">הוסף רשומה ראשונה כדי להתחיל</p>
            <Button
              onClick={handleAddNew}
              size="sm"
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
            >
              <Plus className="h-4 w-4 ml-2" />
              הוסף רשומה
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200",
                  "hover:border-[#5B6FB9]"
                )}
                onClick={() => handleCardClick(entry)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                        {entry.title}
                      </CardTitle>
                      {entry.description && (
                        <CardDescription className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {entry.description}
                        </CardDescription>
                      )}
                    </div>
                    <Video className="h-5 w-5 text-[#5B6FB9] flex-shrink-0 mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.tags && entry.tags.length > 0 ? (
                        <>
                          <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <div className="flex gap-1 flex-wrap">
                            {entry.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {entry.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>

                    {/* Duration and Link Icon */}
                    <div className="flex items-center gap-3">
                      {entry.duration && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{entry.duration} דק'</span>
                        </div>
                      )}
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
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
