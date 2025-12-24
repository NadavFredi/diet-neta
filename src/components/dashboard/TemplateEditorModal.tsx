/**
 * TemplateEditorModal Component
 * 
 * Modal for editing WhatsApp message templates with placeholder support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
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
  onSave,
}) => {
  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset template when modal opens/closes or initialTemplate changes
  useEffect(() => {
    if (isOpen) {
      setTemplate(initialTemplate);
    }
  }, [isOpen, initialTemplate]);

  const handleInsertPlaceholder = (placeholderKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholder = `{{${placeholderKey}}}`;
    
    const newTemplate =
      template.substring(0, start) +
      placeholder +
      template.substring(end);
    
    setTemplate(newTemplate);
    
    // Set cursor position after inserted placeholder
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + placeholder.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(template);
      onOpenChange(false);
    } catch (error) {
      console.error('[TemplateEditorModal] Error saving template:', error);
      // Error handling is done in parent component
    } finally {
      setIsSaving(false);
    }
  };

  const categories: Placeholder['category'][] = ['customer', 'lead', 'fitness', 'plans'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>ערוך תבנית: {flowLabel}</DialogTitle>
          <DialogDescription>
            ערוך את תבנית ההודעה. השתמש בערכי מקום (Placeholders) כדי להוסיף מידע דינמי.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Template Editor */}
          <div className="space-y-2">
            <Label htmlFor="template-content">תוכן התבנית</Label>
            <Textarea
              id="template-content"
              ref={textareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="הקלד את ההודעה כאן... ניתן להשתמש בערכי מקום כמו {{name}}, {{phone}} וכו'"
              className="min-h-[200px] text-right font-heebo resize-none"
              dir="rtl"
            />
            <p className="text-xs text-gray-500">
              💡 טיפ: לחץ על ערכי המקום למטה כדי להוסיף אותם אוטומטית
            </p>
          </div>

          {/* Placeholders by Category */}
          <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '300px' }}>
            {categories.map((category) => {
              const categoryPlaceholders = getPlaceholdersByCategory(category);
              if (categoryPlaceholders.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    {getCategoryLabel(category)}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {categoryPlaceholders.map((placeholder) => (
                      <Badge
                        key={placeholder.key}
                        variant="outline"
                        className={cn(
                          "cursor-pointer hover:bg-[#5B6FB9] hover:text-white hover:border-[#5B6FB9]",
                          "transition-colors duration-200 px-3 py-1.5 text-xs font-medium",
                          "border-gray-300 bg-white text-gray-700"
                        )}
                        onClick={() => handleInsertPlaceholder(placeholder.key)}
                        title={placeholder.description}
                      >
                        {placeholder.label} <span className="font-mono text-[10px] opacity-70">({`{{${placeholder.key}}}`})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
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
