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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Smile, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignRight, AlignLeft, AlignCenter, Plus, Trash2, HelpCircle, Smartphone, Image, Video, X } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AVAILABLE_PLACEHOLDERS, getPlaceholdersByCategory, getCategoryLabel, type Placeholder } from '@/utils/whatsappPlaceholders';
import { cn } from '@/lib/utils';

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
  onSave: (template: string, buttons?: WhatsAppButton[], media?: MediaData | null) => Promise<void>;
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
      console.error('[TemplateEditorModal] Error validating buttons:', error);
      return [];
    }
  };

  const [template, setTemplate] = useState(initialTemplate || '');
  const [buttons, setButtons] = useState<WhatsAppButton[]>(() => {
    try {
      return getValidButtons(initialButtons);
    } catch (error) {
      console.error('[TemplateEditorModal] Error initializing buttons:', error);
      return [];
    }
  });
  const [media, setMedia] = useState<MediaData | null>(initialMedia || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const prevIsOpen = React.useRef(isOpen);
  
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      try {
        setTemplate(String(initialTemplate || ''));
        // Always reset buttons from initialButtons, even if empty array
        const validButtons = getValidButtons(initialButtons);
        setButtons(validButtons);
        setMedia(initialMedia || null);
      } catch (error) {
        console.error('[TemplateEditorModal] Error resetting state:', error);
        setTemplate('');
        setButtons([]);
        setMedia(null);
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialTemplate, initialButtons, initialMedia]);

  // Clean up preview URLs when component unmounts or media changes
  useEffect(() => {
    return () => {
      if (media?.previewUrl && media.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.previewUrl);
      }
    };
  }, [media]);

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
      await onSave(template, safeButtons, media);
      onOpenChange(false);
    } catch (error) {
      console.error('[TemplateEditorModal] Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setMedia({
        type: 'image',
        file,
        previewUrl,
      });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setMedia({
        type: 'video',
        file,
        previewUrl,
      });
    }
    // Reset input so same file can be selected again
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleGifUrlSubmit = () => {
    if (gifUrl.trim()) {
      setMedia({
        type: 'gif',
        url: gifUrl.trim(),
        previewUrl: gifUrl.trim(),
      });
      setGifUrl('');
      setIsGifPopoverOpen(false);
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
      console.error('[TemplateEditorModal] Error processing buttons:', error);
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
          <DialogTitle className="text-xl font-semibold text-slate-900">ערוך תבנית: {flowLabel}</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
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
                  
                  <div className="relative" style={{ height: 'calc(100% - 48px)' }}>
                    <style>{`
                      .quill-editor-rtl .ql-editor {
                        color: #000000 !important;
                        color: rgb(15 23 42) !important;
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
                      }}
                      className={cn(
                        "quill-editor-rtl",
                        "[&_.ql-editor]:text-right [&_.ql-editor]:font-heebo [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed",
                        "[&_.ql-editor]:min-h-[350px] [&_.ql-editor]:bg-white",
                        "[&_.ql-editor]:text-slate-900 [&_.ql-editor]:text-black",
                        "[&_.ql-editor_*]:text-slate-900 [&_.ql-editor_*]:text-black",
                        "[&_.ql-editor]:placeholder:text-slate-400",
                        "[&_.ql-container]:border-0 [&_.ql-container]:rounded-b-2xl",
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

                      {/* GIF URL Input Popover */}
                      <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
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
                            title="הוסף GIF"
                          >
                            <Image className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" dir="rtl" sideOffset={8}>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                                הוסף קישור GIF
                              </Label>
                              <Input
                                type="url"
                                value={gifUrl}
                                onChange={(e) => setGifUrl(e.target.value)}
                                placeholder="https://example.com/image.gif"
                                className="text-sm"
                                dir="ltr"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleGifUrlSubmit();
                                  }
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleGifUrlSubmit}
                              disabled={!gifUrl.trim()}
                              className="w-full bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                              size="sm"
                            >
                              הוסף
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
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
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{button.id}</code>
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
            <Card className="flex-1 bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-slate-900 rounded-t-2xl px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-300 font-medium">WhatsApp</span>
                </div>
              </div>
              <div className="p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white min-h-[500px]">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Media Preview */}
                  {media && media.previewUrl && (
                    <div className="relative w-full">
                      {media.type === 'image' || media.type === 'gif' ? (
                        <img
                          src={media.previewUrl}
                          alt="Preview"
                          className="w-full h-auto max-h-[300px] object-cover"
                        />
                      ) : media.type === 'video' ? (
                        <video
                          src={media.previewUrl}
                          controls
                          className="w-full h-auto max-h-[300px]"
                        >
                          הדפדפן שלך אינו תומך בתג וידאו.
                        </video>
                      ) : null}
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
                    </div>
                  )}
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
