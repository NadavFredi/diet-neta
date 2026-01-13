/**
 * KnowledgeBaseItemDialog Component
 * 
 * Dialog for viewing and editing knowledge base entries
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateKnowledgeBaseEntry,
  useUpdateKnowledgeBaseEntry,
  useDeleteKnowledgeBaseEntry,
  type KnowledgeBaseEntry,
} from '@/hooks/useKnowledgeBase';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBaseItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entry: KnowledgeBaseEntry | null;
  mode?: 'view' | 'edit' | 'create';
}

export const KnowledgeBaseItemDialog: React.FC<KnowledgeBaseItemDialogProps> = ({
  isOpen,
  onOpenChange,
  entry,
  mode = 'view',
}) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    tags: [] as string[],
    duration: '',
    tagsInput: '',
  });

  const createMutation = useCreateKnowledgeBaseEntry();
  const updateMutation = useUpdateKnowledgeBaseEntry();
  const deleteMutation = useDeleteKnowledgeBaseEntry();
  const { toast } = useToast();

  // Helper to convert seconds to MM:SS format
  const secondsToMMSS = (seconds: number | null): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to convert MM:SS format to seconds
  const mmssToSeconds = (mmss: string): number | null => {
    if (!mmss.trim()) return null;
    // Support MM:SS format
    const mmssMatch = mmss.match(/^(\d{1,2}):(\d{1,2})$/);
    if (mmssMatch) {
      const mins = parseInt(mmssMatch[1], 10);
      const secs = parseInt(mmssMatch[2], 10);
      if (isNaN(mins) || isNaN(secs) || secs >= 60) return null;
      return mins * 60 + secs;
    }
    // Support just a number (treat as seconds)
    const num = parseInt(mmss, 10);
    if (!isNaN(num) && num >= 0) return num;
    return null;
  };

  // Initialize form data when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        description: entry.description || '',
        video_url: entry.video_url || '',
        tags: entry.tags || [],
        duration: entry.duration ? secondsToMMSS(entry.duration) : '',
        tagsInput: entry.tags?.join(', ') || '',
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        description: '',
        video_url: '',
        tags: [],
        duration: '',
        tagsInput: '',
      });
    }
    setIsEditing(mode === 'edit' || mode === 'create');
  }, [entry, mode]);

  const handleTagsChange = (value: string) => {
    setFormData({ ...formData, tagsInput: value });
    // Parse tags on blur or enter
    const tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast({
        title: 'שגיאה',
        description: 'כותרת וקישור וידאו הם שדות חובה',
        variant: 'destructive',
      });
      return;
    }

    try {
      const tags = formData.tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const durationSeconds = mmssToSeconds(formData.duration);

      if (mode === 'create') {
        await createMutation.mutateAsync({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          video_url: formData.video_url.trim(),
          tags,
          duration: durationSeconds,
          additional_info: {},
        });
      } else if (entry) {
        await updateMutation.mutateAsync({
          id: entry.id,
          updates: {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            video_url: formData.video_url.trim(),
            tags,
            duration: durationSeconds,
          },
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) {
      try {
        await deleteMutation.mutateAsync(entry.id);
        onOpenChange(false);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'הוספת רשומה חדשה' : isEditing ? 'עריכת רשומה' : 'צפייה ברשומה'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">
              כותרת *
            </Label>
            {isEditing ? (
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="הכנס כותרת"
                className="bg-slate-50"
                dir="rtl"
              />
            ) : (
              <div className="text-sm font-medium text-slate-900 p-2 bg-slate-50 rounded-md">
                {entry?.title || '-'}
              </div>
            )}
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="video_url" className="text-sm font-medium text-slate-700">
              קישור וידאו *
            </Label>
            {isEditing ? (
              <Input
                id="video_url"
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://..."
                className="bg-slate-50"
                dir="ltr"
              />
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={entry?.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  {entry?.video_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              תיאור
            </Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="הכנס תיאור"
                className="min-h-[100px] bg-slate-50 resize-none"
                dir="rtl"
              />
            ) : (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-md min-h-[100px] whitespace-pre-wrap">
                {entry?.description || '-'}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              משך זמן (דקות:שניות)
            </Label>
            {isEditing ? (
              <Input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => {
                  let value = e.target.value;
                  // Allow only digits and colon
                  value = value.replace(/[^\d:]/g, '');
                  // Only allow one colon
                  const colonCount = (value.match(/:/g) || []).length;
                  if (colonCount > 1) {
                    value = value.substring(0, value.lastIndexOf(':'));
                  }
                  setFormData({ ...formData, duration: value });
                }}
                placeholder="לדוגמה: 03:45"
                className="bg-slate-50 font-mono"
                dir="ltr"
                maxLength={5}
              />
            ) : (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-md">
                {entry?.duration ? secondsToMMSS(entry.duration) : '-'}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium text-slate-700">
              תגיות (מופרדות בפסיק)
            </Label>
            {isEditing ? (
              <>
                <Input
                  id="tags"
                  value={formData.tagsInput}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  onBlur={() => {
                    const tags = formData.tagsInput
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    setFormData(prev => ({ ...prev, tags }));
                  }}
                  placeholder="לדוגמה: תזונה, אימון, חיטוב"
                  className="bg-slate-50"
                  dir="rtl"
                />
                {formData.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {formData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-1 flex-wrap">
                {entry?.tags && entry.tags.length > 0 ? (
                  entry.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">אין תגיות</span>
                )}
              </div>
            )}
          </div>

          {/* View Mode: Video Link */}
          {!isEditing && entry && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">צפייה בוידאו</Label>
              <a
                href={entry.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                פתח קישור
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-row-reverse justify-between gap-2 pt-4 border-t">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className={cn(
                    "h-10 px-6 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold text-sm",
                    "hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9] transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? 'שומר...' : 'שמור'}
                </Button>
                {mode !== 'create' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="h-10 px-5 text-sm"
                  >
                    ביטול
                  </Button>
                )}
              </>
            ) : (
              <>
                {entry && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="h-10 px-5 text-sm"
                    >
                      ערוך
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="h-10 px-5 text-sm"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-10 px-5 text-sm"
          >
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
