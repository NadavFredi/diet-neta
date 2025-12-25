/**
 * TemplateEditorModal Component
 * 
 * Refactored modal for editing WhatsApp message templates with:
 * - Two-column layout on wider screens
 * - Rich text editing with formatting toolbar (Bold, Italic, Underline, etc.)
 * - Enhanced textarea styling with blue focus border
 * - Emoji picker integration
 * - Compact placeholder chips
 * - Premium SaaS look
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Smile, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignRight, AlignLeft, AlignCenter, Plus, Trash2 } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AVAILABLE_PLACEHOLDERS, getPlaceholdersByCategory, getCategoryLabel, type Placeholder } from '@/utils/whatsappPlaceholders';
import { cn } from '@/lib/utils';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flowKey: string;
  flowLabel: string;
  initialTemplate: string;
  onSave: (template: string) => Promise<void>;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onOpenChange,
  flowKey,
  flowLabel,
  initialTemplate,
  initialButtons = [],
  onSave,
}) => {
  // Helper function to validate and normalize buttons
  const getValidButtons = useMemo(() => {
    return (buttonsInput?: WhatsAppButton[]): WhatsAppButton[] => {
      if (!buttonsInput || !Array.isArray(buttonsInput)) return [];
      return buttonsInput
        .filter((btn: any): btn is WhatsAppButton => 
          btn && 
          typeof btn === 'object' && 
          typeof btn.id === 'string' && 
          typeof btn.text === 'string' &&
          btn.id.length > 0
        )
        .map(btn => ({ id: btn.id, text: String(btn.text || '') }));
    };
  }, []);

  const [template, setTemplate] = useState(initialTemplate);
  const [buttons, setButtons] = useState<WhatsAppButton[]>(() => getValidButtons(initialButtons));
  const [isSaving, setIsSaving] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Reset template and buttons when modal opens/closes or initial values change
  useEffect(() => {
    if (isOpen) {
      setTemplate(initialTemplate || '');
      // Ensure buttons is always an array and validate structure
      setButtons(getValidButtons(initialButtons));
    }
  }, [isOpen, initialTemplate, initialButtons, getValidButtons]);

  // Custom toolbar configuration for RTL support
  const toolbarOptions = useMemo(() => [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ], []);

  // Custom toolbar component with icons
  const CustomToolbar = () => {
    const quill = quillRef.current?.getEditor();
    
    const handleFormat = (format: string, value?: any) => {
      if (quill) {
        quill.format(format, value);
      }
    };

    return (
      <div id="toolbar" className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg" dir="rtl">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('bold')}
          title="מודגש"
        >
          <Bold className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('italic')}
          title="נטוי"
        >
          <Italic className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('underline')}
          title="קו תחתון"
        >
          <Underline className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('strike')}
          title="קו חוצה"
        >
          <Strikethrough className="h-4 w-4 text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('list', 'bullet')}
          title="רשימה"
        >
          <List className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('list', 'ordered')}
          title="רשימה ממוספרת"
        >
          <ListOrdered className="h-4 w-4 text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('align', 'right')}
          title="יישור ימין"
        >
          <AlignRight className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('align', 'center')}
          title="יישור מרכז"
        >
          <AlignCenter className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => handleFormat('align', 'left')}
          title="יישור שמאל"
        >
          <AlignLeft className="h-4 w-4 text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          onClick={() => {
            if (quill) {
              const range = quill.getSelection(true);
              if (range) {
                quill.removeFormat(range.index, range.length);
              }
            }
          }}
          title="נקה עיצוב"
        >
          <span className="text-xs font-semibold text-gray-700">נקה</span>
        </button>
      </div>
    );
  };

  // Helper function to insert text at cursor position in Quill
  const insertAtCursor = (textToInsert: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      quill.insertText(range.index, textToInsert);
      quill.setSelection(range.index + textToInsert.length);
    } else {
      // If no selection, insert at the end
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
      // Ensure only valid buttons are saved
      const validButtons = buttons
        .filter((btn): btn is WhatsAppButton => 
          btn && typeof btn === 'object' && typeof btn.id === 'string' && typeof btn.text === 'string'
        );
      await onSave(template, validButtons.length > 0 ? validButtons : undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('[TemplateEditorModal] Error saving template:', error);
      // Error handling is done in parent component
    } finally {
      setIsSaving(false);
    }
  };

  // Button management handlers
  const handleAddButton = () => {
    if (buttons.length >= 3) {
      return; // Max 3 buttons
    }
    const newButton: WhatsAppButton = {
      id: `btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '',
    };
    // Ensure we only add valid buttons
    setButtons([...buttons.filter(btn => btn && typeof btn.id === 'string' && typeof btn.text === 'string'), newButton]);
  };

  const handleRemoveButton = (buttonId: string) => {
    setButtons(buttons
      .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
      .filter(btn => btn.id !== buttonId));
  };

  const handleButtonTextChange = (buttonId: string, text: string) => {
    // Limit button text to 25 characters (Green API limit)
    const limitedText = String(text || '').slice(0, 25);
    setButtons(buttons
      .filter(btn => btn && typeof btn === 'object' && typeof btn.id === 'string')
      .map(btn => 
        btn.id === buttonId ? { ...btn, text: limitedText } : btn
      ));
  };

  const categories: Placeholder['category'][] = ['customer', 'lead', 'fitness', 'plans'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1100px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>ערוך תבנית: {flowLabel}</DialogTitle>
          <DialogDescription>
            ערוך את תבנית ההודעה. השתמש בערכי מקום (Placeholders) כדי להוסיף מידע דינמי.
          </DialogDescription>
        </DialogHeader>

        {/* Two-Column Layout on wider screens, single column on mobile */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 py-4 min-h-0">
          {/* Left Column: Template Editor (Main Content) */}
          <div className="flex-1 flex flex-col min-w-0 lg:min-w-[400px] lg:h-full">
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <Label htmlFor="template-content" className="text-sm font-semibold text-gray-700 flex-shrink-0">
                תוכן התבנית
              </Label>
              
              {/* Rich Text Editor Container with Blue Focus Border */}
              <div className="relative flex-1 flex flex-col min-h-[400px]">
                <div className={cn(
                  "relative w-full h-full rounded-lg",
                  "border-2 border-gray-200",
                  "focus-within:border-[#5B6FB9] focus-within:ring-2 focus-within:ring-[#5B6FB9]/20 focus-within:ring-offset-0",
                  "transition-all duration-200",
                  "bg-white overflow-hidden"
                )}>
                  {/* Custom Toolbar */}
                  <CustomToolbar />
                  
                  {/* Quill Editor */}
                  <div className="relative" style={{ height: 'calc(100% - 48px)' }}>
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
                        "[&_.ql-editor]:min-h-[350px] [&_.ql-editor]:bg-gray-50/80",
                        "[&_.ql-editor]:placeholder:text-gray-400",
                        "[&_.ql-container]:border-0 [&_.ql-container]:rounded-b-lg",
                        "[&_.ql-toolbar]:hidden"
                      )}
                    />
                    
                    {/* Emoji Picker Button - Bottom Left Corner (RTL: left side) */}
                    <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "absolute bottom-2 left-2 h-7 w-7 p-0",
                            "bg-white border border-gray-300 rounded-md",
                            "hover:bg-gray-50 hover:border-[#5B6FB9] hover:shadow-sm",
                            "transition-all duration-200",
                            "shadow-sm",
                            "z-10",
                            "flex items-center justify-center",
                            "cursor-pointer"
                          )}
                          title="הוסף אימוג'י"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Smile className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 border border-gray-200 shadow-xl" 
                        align="start"
                        side="top"
                        dir="ltr"
                        sideOffset={8}
                      >
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
                  </div>
                </div>
                
                {/* Helper Text - Outside the border */}
                <p className="text-xs text-gray-500 mt-2 px-1">
                  💡 טיפ: לחץ על ערכי המקום בצד כדי להוסיף אותם במיקום הסמן
                </p>
              </div>
            </div>

            {/* Interactive Buttons Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-700">
                  כפתורים אינטראקטיביים
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddButton}
                  disabled={buttons.length >= 3}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 ml-1" />
                  הוסף כפתור {buttons.length >= 3 && '(מקסימום 3)'}
                </Button>
              </div>

              {buttons.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  אין כפתורים. לחץ על "הוסף כפתור" כדי להוסיף כפתור אינטראקטיבי.
                </p>
              ) : (
                <div className="space-y-2">
                  {buttons
                    .filter((btn): btn is WhatsAppButton => 
                      btn && typeof btn === 'object' && typeof btn.id === 'string' && typeof btn.text === 'string'
                    )
                    .map((button, index) => (
                      <div
                        key={button.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <span className="text-xs text-gray-500 font-medium w-6 flex-shrink-0">
                          {index + 1}.
                        </span>
                        <Input
                          value={button.text || ''}
                          onChange={(e) => handleButtonTextChange(button.id, e.target.value)}
                          placeholder="טקסט הכפתור (עד 25 תווים)"
                          className="flex-1 h-8 text-sm border-gray-300 focus:border-[#5B6FB9]"
                          dir="rtl"
                          maxLength={25}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveButton(button.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  <p className="text-xs text-gray-500 mt-2">
                    💡 ניתן להשתמש בערכי מקום גם בטקסט הכפתורים (למשל: {{name}})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Placeholders Side Panel - Matching height with left side */}
          <div className="lg:w-80 lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-r border-gray-200 pt-4 lg:pt-0 lg:pr-4 lg:pl-0 lg:h-full">
            <Label className="text-sm font-semibold text-gray-700 mb-3 flex-shrink-0">
              ערכי מקום דינמיים
            </Label>
            
            {/* Scrollable placeholder list - matches the height of textarea area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-4 min-h-0">
              {categories.map((category) => {
                const categoryPlaceholders = getPlaceholdersByCategory(category);
                if (categoryPlaceholders.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {getCategoryLabel(category)}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryPlaceholders.map((placeholder) => (
                        <Badge
                          key={placeholder.key}
                          variant="outline"
                          className={cn(
                            "cursor-pointer transition-all duration-200",
                            "px-2 py-0.5 text-xs font-medium",
                            "border-gray-300 bg-white text-gray-700",
                            "hover:bg-[#5B6FB9] hover:text-white hover:border-[#5B6FB9]",
                            "active:scale-95",
                            "shadow-sm hover:shadow"
                          )}
                          onClick={() => handleInsertPlaceholder(placeholder.key)}
                          title={`${placeholder.label}: ${placeholder.description}`}
                        >
                          <span className="font-mono text-[10px] opacity-80">{`{{${placeholder.key}}}`}</span>
                          <span className="mr-1 text-[10px] opacity-70">{placeholder.label}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
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

