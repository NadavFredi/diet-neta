/**
 * TemplateEditorModal Component
 * 
 * Premium WhatsApp Template Builder with Green API Interactive Buttons
 * Three-column layout: Placeholders | Editor | Live Preview
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Smile, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignRight, AlignLeft, AlignCenter, Plus, Trash2, HelpCircle, Smartphone, Image, Video, X } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AVAILABLE_PLACEHOLDERS, getPlaceholdersByCategory, getCategoryLabel, type Placeholder } from '@/utils/whatsappPlaceholders';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { DevModeId } from '@/components/ui/DevModeId';

export interface WhatsAppButton {
  id: string;
  text: string;
  action?: string; // Response action after click: 'reply', 'flow', 'url', 'none'
  actionConfig?: {
    replyMessage?: string; // For 'reply' action
    flowKey?: string; // For 'flow' action
    url?: string; // For 'url' action
  };
}

export interface MediaData {
  type: 'image' | 'video' | 'gif';
  file?: File;
  url?: string;
  previewUrl?: string;
}

interface TemplateEditorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flowKey: string;
  flowLabel: string;
  initialTemplate: string;
  initialButtons?: WhatsAppButton[];
  initialMedia?: MediaData | null;
  onSave: (template: string, buttons?: WhatsAppButton[], media?: MediaData | null, label?: string) => Promise<void>;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onOpenChange,
  flowKey,
  flowLabel,
  initialTemplate,
  initialButtons = [],
  initialMedia = null,
  onSave,
}) => {
  const getValidButtons = (buttonsInput?: WhatsAppButton[] | any): WhatsAppButton[] => {
    try {
      if (!buttonsInput) return [];
      if (!Array.isArray(buttonsInput)) {
        if (typeof buttonsInput === 'object' && buttonsInput !== null) {
          if (typeof (buttonsInput as any).name === 'string') {
            return [{
              id: (buttonsInput as any).id || `btn-${Date.now()}`,
              text: String((buttonsInput as any).name),
              action: (buttonsInput as any).action || '',
            }];
          }
          if (typeof (buttonsInput as any).id === 'string' && typeof (buttonsInput as any).text === 'string') {
            return [{
              id: (buttonsInput as any).id,
              text: String((buttonsInput as any).text),
              action: (buttonsInput as any).action || '',
            }];
          }
        }
        return [];
      }
      return buttonsInput
        .filter((btn: any): btn is WhatsAppButton => {
          if (!btn || typeof btn !== 'object') return false;
          const hasId = typeof btn.id === 'string' && btn.id.length > 0;
          const hasText = typeof btn.text === 'string';
          const hasName = typeof btn.name === 'string';
          return hasId && (hasText || hasName);
        })
        .map((btn: any) => ({
          id: btn.id,
          text: String(btn.text || btn.name || ''),
          action: btn.action || 'none',
          actionConfig: btn.actionConfig || undefined,
        }));
    } catch (error) {
      return [];
    }
  };

  const [template, setTemplate] = useState(initialTemplate || '');
  const [templateLabel, setTemplateLabel] = useState(flowLabel || '');
  const [buttons, setButtons] = useState<WhatsAppButton[]>(() => {
    try {
      return getValidButtons(initialButtons);
    } catch (error) {
      return [];
    }
  });
  const [media, setMedia] = useState<MediaData | null>(initialMedia || null);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const [blobRetryCount, setBlobRetryCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const prevIsOpen = React.useRef(isOpen);
  
  // Helper function to convert public URL to signed URL (for legacy URLs)
  // NOTE: Bucket is now private, so all URLs must be signed URLs
  const convertToSignedUrl = async (url: string): Promise<string> => {
    // If it's already a signed URL (has token) or external URL, return as-is
    if (url.includes('?token=') || (!url.includes('127.0.0.1:54321') && !url.includes('supabase.co'))) {
      return url;
    }
    
    // Extract path from public URL format (for legacy URLs): http://127.0.0.1:54321/storage/v1/object/public/client-assets/templates/...
    // Or from signed URL format: http://127.0.0.1:54321/storage/v1/object/sign/client-assets/templates/...
    let filePath = '';
    if (url.includes('/storage/v1/object/public/')) {
      // Legacy public URL format - convert to signed URL
      const publicIndex = url.indexOf('/storage/v1/object/public/');
      if (publicIndex !== -1) {
        const pathStart = publicIndex + '/storage/v1/object/public/'.length;
        const pathEnd = url.indexOf('?', pathStart);
        filePath = pathEnd !== -1 ? url.substring(pathStart, pathEnd) : url.substring(pathStart);
      }
    } else if (url.includes('/storage/v1/object/sign/')) {
      // Already a signed URL format, extract path
      const signIndex = url.indexOf('/storage/v1/object/sign/');
      if (signIndex !== -1) {
        const pathStart = signIndex + '/storage/v1/object/sign/'.length;
        const bucketEnd = pathStart + 'client-assets/'.length;
        if (url.substring(pathStart, bucketEnd) === 'client-assets/') {
          const filePathStart = bucketEnd;
          const pathEnd = url.indexOf('?', filePathStart);
          filePath = pathEnd !== -1 ? url.substring(filePathStart, pathEnd) : url.substring(filePathStart);
        }
      }
    } else {
      return url; // Not a recognized URL format, return as-is
    }
    
    if (!filePath) {
      return url;
    }
    
    try {
      // Generate signed URL (valid for 1 year)
      const { data, error } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000);
      
      if (error || !data?.signedUrl) {
        return url;
      }
      
      return data.signedUrl;
    } catch (error) {
      return url;
    }
  };

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      try {
        setTemplate(String(initialTemplate || ''));
        setTemplateLabel(flowLabel || '');
        // Always reset buttons from initialButtons, even if empty array
        const validButtons = getValidButtons(initialButtons);
        setButtons(validButtons);
        // Ensure media has both url and previewUrl when loading from database
        if (initialMedia) {
          // Safely extract URL - handle cases where url/previewUrl might be an object
          let mediaUrl: string | undefined;
          if (initialMedia.url) {
            mediaUrl = typeof initialMedia.url === 'string' ? initialMedia.url : (initialMedia.url as any)?.url || String(initialMedia.url);
          } else if (initialMedia.previewUrl) {
            mediaUrl = typeof initialMedia.previewUrl === 'string' ? initialMedia.previewUrl : (initialMedia.previewUrl as any)?.url || String(initialMedia.previewUrl);
          }
          
          // Convert URL if needed
          if (mediaUrl) {
            convertToSignedUrl(mediaUrl).then((signedUrl) => {
              const mediaWithPreview = {
                ...initialMedia,
                previewUrl: signedUrl,
                url: signedUrl,
              };
              setMedia(mediaWithPreview);
              setMediaLoadError(null);
            }).catch((error) => {
              // Fallback to original URL
              const mediaWithPreview = {
                ...initialMedia,
                previewUrl: mediaUrl,
                url: mediaUrl,
              };
              setMedia(mediaWithPreview);
            });
          } else {
            setMedia(null);
            setMediaLoadError(null);
          }
        } else {
          setMedia(null);
          setMediaLoadError(null);
        }
      } catch (error) {
        setTemplate('');
        setButtons([]);
        setMedia(null);
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialTemplate, initialButtons, initialMedia, flowLabel]);
  
  // Update label when flowLabel prop changes while modal is open
  useEffect(() => {
    if (isOpen && flowLabel) {
      setTemplateLabel(flowLabel);
    }
  }, [flowLabel, isOpen]);
  
  // Also update media when initialMedia changes while modal is open
  useEffect(() => {
    const updateMedia = async () => {
      if (isOpen && initialMedia) {
        // Safely extract URL - handle cases where url/previewUrl might be an object
        let mediaUrl: string | undefined;
        if (initialMedia.url) {
          mediaUrl = typeof initialMedia.url === 'string' ? initialMedia.url : (initialMedia.url as any)?.url || String(initialMedia.url);
        } else if (initialMedia.previewUrl) {
          mediaUrl = typeof initialMedia.previewUrl === 'string' ? initialMedia.previewUrl : (initialMedia.previewUrl as any)?.url || String(initialMedia.previewUrl);
        }
        
        if (mediaUrl) {
          // Convert public URL to signed URL if needed
          const signedUrl = await convertToSignedUrl(mediaUrl);
          const mediaWithPreview = {
            ...initialMedia,
            previewUrl: signedUrl,
            url: signedUrl,
          };
          setMedia(mediaWithPreview);
          setMediaLoadError(null);
        } else {
          setMedia(null);
          setMediaLoadError(null);
        }
      } else if (isOpen && !initialMedia) {
        setMedia(null);
        setMediaLoadError(null);
      }
    };

    updateMedia();
  }, [initialMedia, isOpen]);

  // Clean up preview URLs when component unmounts or media is removed
  useEffect(() => {
    return () => {
      // Only revoke blob URLs on unmount, not on every media change
      // This prevents premature revocation when uploading new files
    };
  }, []);

  // Clean up blob URLs when media is explicitly removed or component unmounts
  useEffect(() => {
    const currentMedia = media;
    return () => {
      // Only revoke if media still exists and is a blob URL
      if (currentMedia?.previewUrl && currentMedia.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentMedia.previewUrl);
      }
    };
  }, [media?.previewUrl]);

  const toolbarOptions = useMemo(() => [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ], []);

  const CustomToolbar = () => {
    const quill = quillRef.current?.getEditor();
    
    const handleFormat = (format: string, value?: any) => {
      if (quill) {
        quill.format(format, value);
      }
    };

    return (
      <div id="toolbar" className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-lg" dir="rtl">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('bold')}
          title="מודגש"
        >
          <Bold className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('italic')}
          title="נטוי"
        >
          <Italic className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('underline')}
          title="קו תחתון"
        >
          <Underline className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('strike')}
          title="קו חוצה"
        >
          <Strikethrough className="h-4 w-4 text-slate-700" />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('list', 'bullet')}
          title="רשימה"
        >
          <List className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('list', 'ordered')}
          title="רשימה ממוספרת"
        >
          <ListOrdered className="h-4 w-4 text-slate-700" />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('align', 'right')}
          title="יישור ימין"
        >
          <AlignRight className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('align', 'center')}
          title="יישור מרכז"
        >
          <AlignCenter className="h-4 w-4 text-slate-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          onClick={() => handleFormat('align', 'left')}
          title="יישור שמאל"
        >
          <AlignLeft className="h-4 w-4 text-slate-700" />
        </button>
      </div>
    );
  };

  const insertAtCursor = (textToInsert: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      quill.insertText(range.index, textToInsert);
      quill.setSelection(range.index + textToInsert.length);
    } else {
      const length = quill.getLength();
      quill.insertText(length - 1, textToInsert);
      quill.setSelection(length - 1 + textToInsert.length);
    }
  };

  const handleInsertPlaceholder = (placeholderKey: string) => {
    const placeholder = `{{${placeholderKey}}}`;
    insertAtCursor(placeholder);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertAtCursor(emojiData.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Always pass buttons array (empty array if no buttons) to ensure deletion is saved
      // Pass the edited label if it changed
      await onSave(template, safeButtons, media, templateLabel.trim() || flowLabel);
      onOpenChange(false);
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setMediaLoadError('הקובץ גדול מדי. גודל מקסימלי: 10MB');
        return;
      }
      
      // Revoke previous blob URL if it exists
      if (media?.previewUrl && media.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.previewUrl);
      }
      
      // Clear any previous errors and reset retry count
      setMediaLoadError(null);
      setBlobRetryCount(0);
      
      try {
        // Create new blob URL for the uploaded file
        const previewUrl = URL.createObjectURL(file);
        setMedia({
          type: 'image',
          file,
          previewUrl,
          url: previewUrl, // Also set url for consistency
        });
      } catch (error) {
        setMediaLoadError('שגיאה ביצירת תצוגה מקדימה של הקובץ');
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Revoke previous blob URL if it exists
      if (media?.previewUrl && media.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.previewUrl);
      }
      
      // Clear any previous errors
      setMediaLoadError(null);
      
      // Create new blob URL for the uploaded file
      const previewUrl = URL.createObjectURL(file);
      setMedia({
        type: 'video',
        file,
        previewUrl,
        url: previewUrl, // Also set url for consistency
      });
    }
    // Reset input so same file can be selected again
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };


  const handleRemoveMedia = () => {
    if (media?.previewUrl && media.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(media.previewUrl);
    }
    setMedia(null);
  };

  const handleAddButton = () => {
    setButtons(prevButtons => {
      const validButtons = prevButtons.filter(btn => 
        btn && typeof btn === 'object' && typeof btn.id === 'string'
      );
      
      if (validButtons.length >= 3) {
        return prevButtons;
      }
      
      const newButton: WhatsAppButton = {
        id: `btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: '',
        action: '',
      };
      
      return [...validButtons, newButton];
    });
  };

  const handleRemoveButton = (buttonId: string) => {
    setButtons(prevButtons => 
      prevButtons
        .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
        .filter(btn => btn.id !== buttonId)
    );
  };

  const handleButtonTextChange = (buttonId: string, text: string) => {
    const limitedText = String(text || '').slice(0, 25);
    setButtons(prevButtons => 
      prevButtons
        .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
        .map(btn => 
          btn.id === buttonId ? { ...btn, text: limitedText } : btn
        )
    );
  };

  const handleButtonActionChange = (buttonId: string, action: string) => {
    setButtons(prevButtons => 
      prevButtons
        .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
        .map(btn => {
          if (btn.id === buttonId) {
            return {
              ...btn,
              action,
              actionConfig: action === 'reply' ? { replyMessage: '' } :
                           action === 'flow' ? { flowKey: '' } :
                           action === 'url' ? { url: '' } :
                           undefined
            };
          }
          return btn;
        })
    );
  };

  const handleButtonActionConfigChange = (buttonId: string, configKey: string, value: string) => {
    setButtons(prevButtons => 
      prevButtons
        .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
        .map(btn => {
          if (btn.id === buttonId) {
            return {
              ...btn,
              actionConfig: {
                ...btn.actionConfig,
                [configKey]: value
              }
            };
          }
          return btn;
        })
    );
  };

  const categories: Placeholder['category'][] = ['customer', 'lead', 'fitness', 'plans'];

  const safeButtons = React.useMemo(() => {
    try {
      if (!Array.isArray(buttons)) return [];
      return buttons
        .filter((btn: any): btn is WhatsAppButton => {
          if (!btn || typeof btn !== 'object') return false;
          const hasId = typeof btn.id === 'string' && btn.id.length > 0;
          if (!hasId) return false;
          const hasText = typeof btn.text === 'string';
          const hasName = typeof (btn as any).name === 'string';
          return hasText || hasName;
        })
        .map((btn: any) => ({
          id: String(btn.id),
          text: String(btn.text !== undefined ? btn.text : ((btn as any).name !== undefined ? (btn as any).name : '')),
          action: btn.action || 'none',
          actionConfig: btn.actionConfig || undefined,
        }));
    } catch (error) {
      return [];
    }
  }, [buttons]);

  // Live preview of message - preserve line breaks
  const previewMessage = useMemo(() => {
    if (!template) return '';
    
    // Convert HTML line break elements to newlines before extracting text
    let htmlWithBreaks = template;
    
    // Replace <br>, <br/>, <br /> with newlines
    htmlWithBreaks = htmlWithBreaks.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace closing </p> tags with newlines
    htmlWithBreaks = htmlWithBreaks.replace(/<\/p>/gi, '\n');
    
    // Replace closing </div> tags with newlines (but not opening tags to avoid double breaks)
    htmlWithBreaks = htmlWithBreaks.replace(/<\/div>/gi, '\n');
    
    // Create a temporary div to parse HTML and extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlWithBreaks;
    
    // Get text content which now includes line breaks
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up multiple consecutive newlines (more than 2) to max 2
    return text.replace(/\n{3,}/g, '\n\n');
  }, [template]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1400px] max-h-[95vh] flex flex-col p-0 bg-slate-50" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-white rounded-t-lg">
          {/* Hidden DialogTitle for accessibility - screen readers will use this */}
          <DialogTitle className="sr-only">
            {templateLabel || flowLabel || 'ערוך תבנית'}
          </DialogTitle>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">ערוך תבנית:</Label>
            <Input
              value={templateLabel}
              onChange={(e) => setTemplateLabel(e.target.value)}
              placeholder="שם התבנית"
              className="text-xl font-semibold text-slate-900 h-auto py-2 border-slate-300 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]"
            />
          </div>
          <DialogDescription className="text-sm text-slate-500 pt-2">
            ערוך את תבנית ההודעה. השתמש בערכי מקום (Placeholders) כדי להוסיף מידע דינמי.
          </DialogDescription>
        </DialogHeader>

        {/* Three-Column Layout */}
        <div className="flex-1 overflow-hidden flex gap-6 p-6 min-h-0 max-h-full">
          {/* Right Column: Placeholders (20%) */}
          <div className="w-[20%] flex-shrink-0 flex flex-col">
            <Label className="text-sm font-semibold text-slate-900 mb-4">ערכי מקום דינמיים</Label>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {categories.map((category) => {
                const categoryPlaceholders = getPlaceholdersByCategory(category);
                if (categoryPlaceholders.length === 0) return null;

                return (
                  <Card key={category} className="bg-white border-0 shadow-sm rounded-2xl">
                    <CardHeader className="pb-2 px-3 pt-3">
                      <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        {getCategoryLabel(category)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1.5">
                      {categoryPlaceholders.map((placeholder) => (
                        <Badge
                          key={placeholder.key}
                          variant="outline"
                          className={cn(
                            "cursor-pointer transition-all duration-200 w-full justify-start text-right",
                            "px-2 py-1.5 text-xs font-medium",
                            "border-slate-200 bg-white text-slate-700",
                            "hover:bg-[#5B6FB9] hover:text-white hover:border-[#5B6FB9]",
                            "active:scale-95"
                          )}
                          onClick={() => handleInsertPlaceholder(placeholder.key)}
                          title={`${placeholder.label}: ${placeholder.description}`}
                        >
                          <span className="font-mono text-[10px] opacity-80 mr-1">{`{{${placeholder.key}}}`}</span>
                          <span className="text-[10px]">{placeholder.label}</span>
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Center Column: Editor (50%) */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Label className="text-sm font-semibold text-slate-900 mb-3 flex-shrink-0">תוכן התבנית</Label>
            
            <Card className="flex flex-col bg-white border-0 shadow-sm rounded-2xl overflow-hidden" style={{ maxHeight: 'calc(95vh - 200px)' }}>
              <div className="relative flex flex-col min-h-[250px] max-h-[300px] flex-shrink-0">
                <div className={cn(
                  "relative w-full h-full rounded-2xl",
                  "border-0",
                  "bg-white overflow-hidden"
                )}>
                  <CustomToolbar />
                  
                  <div className="relative flex-1 overflow-hidden" style={{ height: 'calc(100% - 48px)' }}>
                    <style>{`
                      .quill-editor-rtl .ql-editor {
                        color: #000000 !important;
                        color: rgb(15 23 42) !important;
                        overflow-y: auto !important;
                        max-height: 100% !important;
                      }
                      .quill-editor-rtl .ql-editor * {
                        color: #000000 !important;
                        color: rgb(15 23 42) !important;
                      }
                      .quill-editor-rtl .ql-editor p,
                      .quill-editor-rtl .ql-editor div,
                      .quill-editor-rtl .ql-editor span,
                      .quill-editor-rtl .ql-editor strong,
                      .quill-editor-rtl .ql-editor em,
                      .quill-editor-rtl .ql-editor u {
                        color: #000000 !important;
                        color: rgb(15 23 42) !important;
                      }
                      .quill-editor-rtl .ql-container {
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                      }
                      .quill-editor-rtl .ql-editor {
                        flex: 1 !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                      }
                    `}</style>
                    <ReactQuill
                      ref={quillRef}
                      value={template}
                      onChange={setTemplate}
                      modules={{
                        toolbar: {
                          container: '#toolbar',
                        },
                      }}
                      placeholder="הקלד את ההודעה כאן... ניתן להשתמש בערכי מקום כמו {{name}}, {{phone}} וכו'"
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      className={cn(
                        "quill-editor-rtl",
                        "[&_.ql-editor]:text-right [&_.ql-editor]:font-heebo [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed",
                        "[&_.ql-editor]:min-h-[200px] [&_.ql-editor]:max-h-full [&_.ql-editor]:bg-white",
                        "[&_.ql-editor]:text-slate-900 [&_.ql-editor]:text-black",
                        "[&_.ql-editor_*]:text-slate-900 [&_.ql-editor_*]:text-black",
                        "[&_.ql-editor]:placeholder:text-slate-400",
                        "[&_.ql-container]:border-0 [&_.ql-container]:rounded-b-2xl [&_.ql-container]:flex [&_.ql-container]:flex-col [&_.ql-container]:h-full",
                        "[&_.ql-toolbar]:hidden"
                      )}
                      theme="snow"
                    />
                    
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                      {/* Emoji Picker */}
                      <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "h-8 w-8 p-0",
                              "bg-white border border-slate-300 rounded-lg",
                              "hover:bg-slate-50 hover:border-[#5B6FB9] hover:shadow-sm",
                              "transition-all duration-200 shadow-sm",
                              "flex items-center justify-center cursor-pointer"
                            )}
                            title="הוסף אימוג'י"
                          >
                            <Smile className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border border-slate-200 shadow-xl" align="start" side="top" dir="ltr" sideOffset={8}>
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width={350}
                            height={400}
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled
                            searchDisabled={false}
                            lazyLoadEmojis={true}
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Image Upload Button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload-input"
                      />
                      <label
                        htmlFor="image-upload-input"
                        className={cn(
                          "h-8 w-8 p-0 cursor-pointer",
                          "bg-white border border-slate-300 rounded-lg",
                          "hover:bg-slate-50 hover:border-[#5B6FB9] hover:shadow-sm",
                          "transition-all duration-200 shadow-sm",
                          "flex items-center justify-center"
                        )}
                        title="הוסף תמונה"
                      >
                        <Image className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      </label>

                      {/* Video Upload Button */}
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload-input"
                      />
                      <label
                        htmlFor="video-upload-input"
                        className={cn(
                          "h-8 w-8 p-0 cursor-pointer",
                          "bg-white border border-slate-300 rounded-lg",
                          "hover:bg-slate-50 hover:border-[#5B6FB9] hover:shadow-sm",
                          "transition-all duration-200 shadow-sm",
                          "flex items-center justify-center"
                        )}
                        title="הוסף וידאו"
                      >
                        <Video className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      </label>

                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Buttons Section */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex-shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 550px)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold text-slate-900">כפתורים אינטראקטיביים</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm" dir="rtl">
                        <p className="font-semibold mb-2">כפתורי תגובה אינטראקטיביים</p>
                        <p className="text-slate-600 mb-2">כפתורים אלה מאפשרים ללקוח להגיב מיד עם אפשרויות מוגדרות מראש.</p>
                        <p className="text-slate-500 text-xs">• טקסט הכפתור: מה שהלקוח רואה</p>
                        <p className="text-slate-500 text-xs">• מזהה כפתור: מה שהמערכת מזהה</p>
                        <p className="text-slate-500 text-xs">• פעולה: מה קורה לאחר הלחיצה</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddButton}
                    disabled={safeButtons.length >= 3}
                    className="h-8 px-3 text-xs border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" />
                    הוסף כפתור {safeButtons.length >= 3 && '(מקסימום 3)'}
                  </Button>
                </div>

                {safeButtons.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <p className="text-sm text-slate-400 mb-2">אין כפתורים</p>
                    <p className="text-xs text-slate-300">לחץ על "הוסף כפתור" כדי להוסיף כפתור אינטראקטיבי</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {safeButtons.map((button, index) => (
                      <Card key={button.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex-shrink-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5B6FB9] text-white text-xs font-semibold flex items-center justify-center mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <div>
                              <Label className="text-xs text-slate-600 mb-1 block">טקסט הכפתור</Label>
                              <Input
                                value={String(button.text || '')}
                                onChange={(e) => handleButtonTextChange(button.id, e.target.value)}
                                placeholder="טקסט הכפתור (עד 25 תווים)"
                                className="h-9 text-sm bg-white border-0 border-b-2 border-slate-200 focus:border-[#5B6FB9] rounded-none px-0"
                                dir="rtl"
                                maxLength={25}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600 mb-1 block">פעולה לאחר לחיצה</Label>
                              <Select
                                value={button.action || 'none'}
                                onValueChange={(value) => handleButtonActionChange(button.id, value)}
                              >
                                <SelectTrigger className="h-9 bg-white border-0 border-b-2 border-slate-200 focus:border-[#5B6FB9] rounded-none px-0" dir="rtl">
                                  <SelectValue placeholder="בחר פעולה" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="reply">תגובה אוטומטית</SelectItem>
                                  <SelectItem value="flow">הפעלת זרימה</SelectItem>
                                  <SelectItem value="url">פתיחת קישור</SelectItem>
                                  <SelectItem value="none">ללא פעולה</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {/* Action Configuration Fields */}
                              {button.action === 'reply' && (
                                <div className="mt-2">
                                  <Label className="text-xs text-slate-500 mb-1 block">הודעת תגובה</Label>
                                  <Input
                                    value={button.actionConfig?.replyMessage || ''}
                                    onChange={(e) => handleButtonActionConfigChange(button.id, 'replyMessage', e.target.value)}
                                    placeholder="הקלד את הודעת התגובה האוטומטית..."
                                    className="h-8 text-xs bg-white border border-slate-200 focus:border-[#5B6FB9] rounded-lg px-2"
                                    dir="rtl"
                                  />
                                </div>
                              )}
                              
                              {button.action === 'flow' && (
                                <div className="mt-2">
                                  <Label className="text-xs text-slate-500 mb-1 block">מזהה זרימה</Label>
                                  <Select
                                    value={button.actionConfig?.flowKey || ''}
                                    onValueChange={(value) => handleButtonActionConfigChange(button.id, 'flowKey', value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs bg-white border border-slate-200 focus:border-[#5B6FB9] rounded-lg px-2" dir="rtl">
                                      <SelectValue placeholder="בחר זרימה" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      <SelectItem value="start_customer_journey">תחילת מסע לקוח</SelectItem>
                                      <SelectItem value="send_questionnaire">שליחת שאלון</SelectItem>
                                      <SelectItem value="send_payment">שליחת תשלום</SelectItem>
                                      <SelectItem value="send_budget">שליחת תקציב</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              {button.action === 'url' && (
                                <div className="mt-2">
                                  <Label className="text-xs text-slate-500 mb-1 block">כתובת URL</Label>
                                  <Input
                                    value={button.actionConfig?.url || ''}
                                    onChange={(e) => handleButtonActionConfigChange(button.id, 'url', e.target.value)}
                                    placeholder="https://example.com"
                                    className="h-8 text-xs bg-white border border-slate-200 focus:border-[#5B6FB9] rounded-lg px-2"
                                    dir="ltr"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>מזהה:</span>
                              <DevModeId id={button.id} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono" />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveButton(button.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Left Column: Live Preview (30%) */}
          <div className="w-[30%] flex-shrink-0 flex flex-col">
            <Label className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              תצוגה מקדימה
            </Label>
            <Card className="flex-1 bg-white border-0 shadow-sm rounded-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 rounded-t-2xl px-4 py-2 flex items-center gap-2 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-300 font-medium">WhatsApp</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white" style={{ minHeight: '500px' }}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Media Preview - Only show if media exists and has a valid URL */}
                  {(() => {
                    // Check if we have valid media with a valid URL
                    if (!media) return null;
                    
                    // Safely extract URL string - handle cases where it might be an object
                    let mediaSrc: string = '';
                    const rawUrl = media.previewUrl || media.url;
                    if (rawUrl) {
                      if (typeof rawUrl === 'string') {
                        mediaSrc = rawUrl;
                      } else if (typeof rawUrl === 'object' && rawUrl !== null) {
                        // Handle object case - try to extract URL from common structures
                        mediaSrc = (rawUrl as any)?.url || (rawUrl as any)?.src || (rawUrl as any)?.publicUrl || String(rawUrl);
                      } else {
                        mediaSrc = String(rawUrl);
                      }
                    }
                    
                    // If no valid URL string, don't render media section at all
                    if (!mediaSrc || (typeof mediaSrc !== 'string') || mediaSrc.trim() === '') {
                      return null;
                    }
                    
                    // Validate URL format - blob URLs are always valid, so allow them
                    // For other URLs, validate the format
                    if (!mediaSrc.startsWith('blob:')) {
                      try {
                        new URL(mediaSrc);
                      } catch (e) {
                        // Invalid URL format (non-blob) - don't render media section
                        return null;
                      }
                    }
                    
                    // Only render if we have valid media with valid URL
                    return (
                      <div className="relative w-full">
                        {mediaLoadError ? (
                          <div className="p-4 text-center text-red-500 text-sm bg-red-50 rounded border border-red-200">
                            <p className="mb-2">{mediaLoadError}</p>
                            <p className="text-xs text-red-400 break-all">{mediaSrc}</p>
                          </div>
                        ) : (
                          <>
                            {media.type === 'image' || media.type === 'gif' ? (
                              <img
                                key={mediaSrc} // Force re-render when src changes
                                src={mediaSrc}
                                alt="Preview"
                                className="w-full h-auto max-h-[300px] object-cover rounded-t-lg"
                                onLoad={() => {
                                  console.log('[TemplateEditorModal] Media loaded successfully:', mediaSrc);
                                  setMediaLoadError(null);
                                }}
                                onError={(e) => {
                                  // Check if this is a blob URL that failed
                                  if (mediaSrc.startsWith('blob:')) {
                                    // For blob URLs, try to recreate once if we have the file and haven't retried yet
                                    if (media?.file && blobRetryCount < 1) {
                                      try {
                                        // Revoke the old blob URL
                                        URL.revokeObjectURL(mediaSrc);
                                        // Create a new blob URL
                                        const newBlobUrl = URL.createObjectURL(media.file);
                                        setBlobRetryCount(prev => prev + 1);
                                        setMedia({
                                          ...media,
                                          previewUrl: newBlobUrl,
                                          url: newBlobUrl,
                                        });
                                        setMediaLoadError(null);
                                        return; // Don't set error, try again with new URL
                                      } catch (recreateError) {
                                        console.error('[TemplateEditorModal] Failed to recreate blob URL:', recreateError);
                                      }
                                    }
                                    // If we can't recreate or already retried, show error
                                    const errorMsg = 'שגיאה בטעינת המדיה - הקובץ עלול להיות פגום או בפורמט לא נתמך';
                                    console.error('[TemplateEditorModal] Error loading blob URL:', {
                                      src: mediaSrc,
                                      type: media.type,
                                      retryCount: blobRetryCount,
                                      error: e
                                    });
                                    setMediaLoadError(errorMsg);
                                  } else {
                                    // For non-blob URLs, show standard error
                                    const errorMsg = 'שגיאה בטעינת המדיה - ייתכן שהקובץ לא קיים או שאין גישה אליו';
                                    console.error('[TemplateEditorModal] Error loading media preview:', {
                                      src: mediaSrc,
                                      type: media.type,
                                      error: e
                                    });
                                    setMediaLoadError(errorMsg);
                                  }
                                }}
                              />
                            ) : media.type === 'video' ? (
                              <video
                                key={mediaSrc} // Force re-render when src changes
                                src={mediaSrc}
                                controls
                                className="w-full h-auto max-h-[300px] rounded-t-lg"
                                onLoadedData={() => {
                                  console.log('[TemplateEditorModal] Video loaded successfully:', mediaSrc);
                                  setMediaLoadError(null);
                                }}
                                onError={(e) => {
                                  // Only show error if it's not a blob URL
                                  if (!mediaSrc.startsWith('blob:')) {
                                    const errorMsg = 'שגיאה בטעינת הווידאו - ייתכן שהקובץ לא קיים או שאין גישה אליו';
                                    console.error('[TemplateEditorModal] Error loading video preview:', {
                                      src: mediaSrc,
                                      type: media.type,
                                      error: e
                                    });
                                    setMediaLoadError(errorMsg);
                                  } else {
                                    console.warn('[TemplateEditorModal] Blob URL failed to load for video:', mediaSrc);
                                  }
                                }}
                              >
                                הדפדפן שלך אינו תומך בתג וידאו.
                              </video>
                            ) : null}
                          </>
                        )}
                        {!mediaLoadError && (
                          <button
                            type="button"
                            onClick={handleRemoveMedia}
                            className={cn(
                              "absolute top-2 right-2 h-7 w-7 rounded-full",
                              "bg-red-500 hover:bg-red-600 text-white",
                              "flex items-center justify-center",
                              "transition-colors duration-200 shadow-lg z-10"
                            )}
                            title="הסר מדיה"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {/* Message Text */}
                  <div className="p-4">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed" dir="rtl">
                      {previewMessage || (!media && 'ההודעה תופיע כאן...')}
                    </p>
                  </div>
                </div>
                {safeButtons.length > 0 && (
                  <div className="space-y-2">
                    {safeButtons.map((button, index) => (
                      <button
                        key={button.id}
                        className="w-full bg-[#5B6FB9] text-white rounded-lg py-3 px-4 text-sm font-medium hover:bg-[#5B6FB9]/90 transition-colors text-center"
                        disabled
                      >
                        {button.text || `כפתור ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-white/80 backdrop-blur-sm rounded-b-lg">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-slate-200 hover:bg-slate-50"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              'שמור תבנית'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
