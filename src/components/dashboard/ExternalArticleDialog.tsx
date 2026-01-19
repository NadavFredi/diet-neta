/**
 * ExternalArticleDialog Component
 * 
 * Dialog for viewing, creating, and editing external knowledge base articles
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, Trash2, Upload, Image as ImageIcon, Video, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateExternalArticle,
  useUpdateExternalArticle,
  useDeleteExternalArticle,
  type ExternalKnowledgeBaseArticle,
  type ContentBlock,
  type ArticleContent,
  normalizeContent,
} from '@/hooks/useExternalKnowledgeBase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface ExternalArticleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  article: ExternalKnowledgeBaseArticle | null;
  mode?: 'view' | 'edit' | 'create';
}

export const ExternalArticleDialog: React.FC<ExternalArticleDialogProps> = ({
  isOpen,
  onOpenChange,
  article,
  mode = 'view',
}) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [formData, setFormData] = useState({
    title: '',
    cover_image: null as string | null,
    content: { blocks: [] } as ArticleContent,
    status: 'draft' as 'draft' | 'published',
    images: [] as string[], // Legacy support
    videos: [] as string[], // Legacy support
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const videoUrlInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateExternalArticle();
  const updateMutation = useUpdateExternalArticle();
  const deleteMutation = useDeleteExternalArticle();
  const { toast } = useToast();

  // Initialize form data when article changes
  useEffect(() => {
    if (article) {
      const normalizedContent = normalizeContent(article.content);
      setFormData({
        title: article.title || '',
        cover_image: article.cover_image || null,
        content: normalizedContent,
        status: article.status || 'draft',
        images: article.images || [], // Legacy support
        videos: article.videos || [], // Legacy support
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        cover_image: null,
        content: { blocks: [] },
        status: 'draft',
        images: [],
        videos: [],
      });
    }
    setIsEditing(mode === 'edit' || mode === 'create');
  }, [article, mode]);

  const handleCoverImageUpload = async (file: File) => {
    setIsUploadingCover(true);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('קובץ התמונה אינו תקין');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('קובץ גדול מדי (מקסימום 10MB)');
      }

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `knowledge-base/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000);

      if (urlError || !urlData?.signedUrl) {
        throw new Error('לא ניתן לקבל קישור לתמונה');
      }

      setFormData(prev => ({ ...prev, cover_image: urlData.signedUrl }));
      toast({ title: 'הצלחה', description: 'תמונת הכריכה הועלתה בהצלחה' });
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בהעלאת תמונת הכריכה', variant: 'destructive' });
    } finally {
      setIsUploadingCover(false);
      if (coverImageInputRef.current) coverImageInputRef.current.value = '';
    }
  };

  const handleAddImageBlock = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} אינו קובץ תמונה תקין`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} גדול מדי (מקסימום 10MB)`);
        }

        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `knowledge-base/images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } = await supabase.storage
          .from('client-assets')
          .createSignedUrl(filePath, 31536000);

        if (urlError || !urlData?.signedUrl) {
          throw new Error('לא ניתן לקבל קישור לתמונה');
        }

        return { type: 'image' as const, url: urlData.signedUrl, content: '' };
      });

      const newBlocks = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        content: { blocks: [...prev.content.blocks, ...newBlocks] },
      }));

      toast({ title: 'הצלחה', description: 'התמונות נוספו לתוכן' });
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בהעלאת התמונות', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleAddVideoBlock = () => {
    const url = videoUrlInputRef.current?.value?.trim();
    if (!url) return;

    try {
      new URL(url);
      setFormData(prev => ({
        ...prev,
        content: {
          blocks: [...prev.content.blocks, { type: 'video', url, content: '' }],
        },
      }));
      if (videoUrlInputRef.current) videoUrlInputRef.current.value = '';
      toast({ title: 'הצלחה', description: 'וידאו נוסף לתוכן' });
    } catch {
      toast({ title: 'שגיאה', description: 'נא להזין כתובת URL תקינה', variant: 'destructive' });
    }
  };

  const handleAddTextBlock = () => {
    setFormData(prev => ({
      ...prev,
      content: { blocks: [...prev.content.blocks, { type: 'text', content: '' }] },
    }));
  };

  const handleUpdateBlock = (index: number, updates: Partial<ContentBlock>) => {
    setFormData(prev => {
      const newBlocks = [...prev.content.blocks];
      newBlocks[index] = { ...newBlocks[index], ...updates };
      return { ...prev, content: { blocks: newBlocks } };
    });
  };

  const handleRemoveBlock = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content: { blocks: prev.content.blocks.filter((_, i) => i !== index) },
    }));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.content.blocks.length - 1) return;

    setFormData(prev => {
      const newBlocks = [...prev.content.blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      return { ...prev, content: { blocks: newBlocks } };
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'שגיאה', description: 'כותרת היא שדה חובה', variant: 'destructive' });
      return;
    }

    if (formData.content.blocks.length === 0) {
      toast({ title: 'שגיאה', description: 'יש להוסיף לפחות בלוק תוכן אחד', variant: 'destructive' });
      return;
    }

    // Validate all blocks have required fields
    for (const block of formData.content.blocks) {
      if (block.type === 'text' && !block.content?.trim()) {
        toast({ title: 'שגיאה', description: 'יש למלא את כל בלוקי הטקסט', variant: 'destructive' });
        return;
      }
      if ((block.type === 'image' || block.type === 'video') && !block.url?.trim()) {
        toast({ title: 'שגיאה', description: 'יש למלא את כל תמונות והווידאואים', variant: 'destructive' });
        return;
      }
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          title: formData.title.trim(),
          cover_image: formData.cover_image,
          content: formData.content,
          images: [], // Legacy field
          videos: [], // Legacy field
          status: formData.status,
        });
      } else if (article) {
        await updateMutation.mutateAsync({
          id: article.id,
          updates: {
            title: formData.title.trim(),
            cover_image: formData.cover_image,
            content: formData.content,
            images: [], // Legacy field
            videos: [], // Legacy field
            status: formData.status,
          },
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleDelete = async () => {
    if (!article) return;

    if (window.confirm('האם אתה בטוח שברצונך למחוק מאמר זה?')) {
      try {
        await deleteMutation.mutateAsync(article.id);
        onOpenChange(false);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  // Legacy handlers for backward compatibility (not used in new structure, but referenced in JSX)
  const handleImageUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      // Legacy images array - not used in new structure, but handle gracefully
      handleAddImageBlock(files);
    }
  };

  const handleVideoUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      toast({ title: 'מידע', description: 'אנא השתמש בקישור וידאו במקום העלאת קבצים', variant: 'default' });
    }
  };

  const handleAddVideoUrl = () => {
    const url = videoUrlInputRef.current?.value?.trim();
    if (url) {
      handleAddVideoBlock();
      if (videoUrlInputRef.current) videoUrlInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveVideo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || isUploading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'הוספת מאמר חדש' : isEditing ? 'עריכת מאמר' : 'צפייה במאמר'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'הוסף מאמר חדש למאגר הידע' : isEditing ? 'ערוך את פרטי המאמר' : 'צפה בפרטי המאמר'}
          </DialogDescription>
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
                {article?.title || '-'}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-slate-700">
              סטטוס
            </Label>
            {isEditing ? (
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" className="bg-slate-50" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      טיוטה
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      מפורסם
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Badge
                  variant={article?.status === 'published' ? 'default' : 'outline'}
                  className={cn(
                    article?.status === 'published'
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {article?.status === 'published' ? (
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
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              תמונת כריכה (אופציונלי)
            </Label>
            {isEditing ? (
              <div className="space-y-3">
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverImageUpload(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => coverImageInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="h-9"
                >
                  <Upload className="h-4 w-4 ml-2" />
                  {formData.cover_image ? 'החלף תמונת כריכה' : 'העלה תמונת כריכה'}
                </Button>
                {formData.cover_image && (
                  <div className="relative inline-block">
                    <img
                      src={formData.cover_image}
                      alt="תמונת כריכה"
                      className="w-full h-48 object-cover rounded-md border border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 left-2 h-8 w-8 p-0"
                      onClick={() => setFormData(prev => ({ ...prev, cover_image: null }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {article?.cover_image ? (
                  <img
                    src={article.cover_image}
                    alt="תמונת כריכה"
                    className="w-full h-48 object-cover rounded-md border border-gray-200"
                  />
                ) : (
                  <span className="text-sm text-gray-400">אין תמונת כריכה</span>
                )}
              </div>
            )}
          </div>

          {/* Content Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">
                תוכן המאמר *
              </Label>
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTextBlock}
                    className="h-8 text-xs"
                  >
                    + טקסט
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-8 text-xs"
                  >
                    <ImageIcon className="h-3 w-3 ml-1" />
                    + תמונה
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={videoUrlInputRef}
                      type="url"
                      placeholder="קישור וידאו..."
                      className="h-8 text-xs w-48 bg-slate-50"
                      dir="ltr"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVideoBlock();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddVideoBlock}
                      className="h-8 text-xs"
                    >
                      <Video className="h-3 w-3 ml-1" />
                      + וידאו
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleAddImageBlock(e.target.files)}
              className="hidden"
            />

            {isEditing ? (
              <div className="space-y-4">
                {formData.content.blocks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    אין תוכן. לחץ על הכפתורים למעלה כדי להוסיף בלוקים.
                  </div>
                ) : (
                  formData.content.blocks.map((block, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {block.type === 'text' && 'טקסט'}
                          {block.type === 'image' && 'תמונה'}
                          {block.type === 'video' && 'וידאו'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveBlock(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveBlock(index, 'down')}
                            disabled={index === formData.content.blocks.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleRemoveBlock(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {block.type === 'text' && (
                        <Textarea
                          value={block.content || ''}
                          onChange={(e) => handleUpdateBlock(index, { content: e.target.value })}
                          placeholder="הכנס טקסט..."
                          className="min-h-[100px] bg-slate-50 resize-none"
                          dir="rtl"
                        />
                      )}

                      {block.type === 'image' && (
                        <div className="space-y-2">
                          <img
                            src={block.url}
                            alt={block.content || 'תמונה'}
                            className="w-full max-h-64 object-contain rounded-md border border-gray-200"
                          />
                          <Input
                            value={block.content || ''}
                            onChange={(e) => handleUpdateBlock(index, { content: e.target.value })}
                            placeholder="כותרת תמונה (אופציונלי)"
                            className="bg-slate-50 text-sm"
                            dir="rtl"
                          />
                        </div>
                      )}

                      {block.type === 'video' && (
                        <div className="space-y-2">
                          <Input
                            value={block.url || ''}
                            onChange={(e) => handleUpdateBlock(index, { url: e.target.value })}
                            placeholder="קישור וידאו (YouTube, Vimeo וכו')"
                            className="bg-slate-50 text-sm"
                            dir="ltr"
                          />
                          <Input
                            value={block.content || ''}
                            onChange={(e) => handleUpdateBlock(index, { content: e.target.value })}
                            placeholder="כותרת וידאו (אופציונלי)"
                            className="bg-slate-50 text-sm"
                            dir="rtl"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {article?.content && normalizeContent(article.content).blocks.length > 0 ? (
                  normalizeContent(article.content).blocks.map((block, index) => (
                    <div key={index}>
                      {block.type === 'text' && (
                        <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-md whitespace-pre-wrap" dir="rtl">
                          {block.content}
                        </div>
                      )}
                      {block.type === 'image' && block.url && (
                        <div>
                          <img src={block.url} alt={block.content || 'תמונה'} className="w-full rounded-md" />
                          {block.content && <p className="text-xs text-gray-500 mt-2 text-center">{block.content}</p>}
                        </div>
                      )}
                      {block.type === 'video' && block.url && (
                        <div className="p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-blue-600">{block.url}</p>
                          {block.content && <p className="text-xs text-gray-500 mt-1">{block.content}</p>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 p-3 bg-slate-50 rounded-md">אין תוכן</div>
                )}
              </div>
            )}
          </div>

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
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    'שמור'
                  )}
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
                {article && (
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
