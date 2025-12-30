/**
 * NotesEditor Component
 * 
 * User-friendly notes editor with auto-focus and easy editing.
 * Always visible at the top of the dashboard.
 */

import { useState, useRef, useEffect } from 'react';
import { FileText, Save, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NotesEditorProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  isLoading?: boolean;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  value,
  onSave,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">הערות</h3>
        </div>
        {!isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="text-xs h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            <FileText className="h-3.5 w-3.5 ml-1" />
            ערוך
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="הזן הערות כאן... (Ctrl+Enter לשמירה, Escape לביטול)"
            className="min-h-[100px] text-sm resize-y bg-white border-amber-300 focus:border-amber-400 focus:ring-amber-400"
            disabled={isSaving || isLoading}
            dir="rtl"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Ctrl+Enter לשמירה • Escape לביטול
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-7 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5 ml-1" />
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="h-7 px-3 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                <Save className="h-3.5 w-3.5 ml-1" />
                {isSaving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={handleEdit}
          className={cn(
            'min-h-[100px] p-3 rounded-lg border-2 border-dashed border-amber-200 bg-white/50 cursor-pointer hover:border-amber-300 hover:bg-white/70 transition-all',
            !value && 'flex items-center justify-center'
          )}
        >
          {value ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {value}
            </p>
          ) : (
            <p className="text-sm text-gray-400 text-center">
              לחץ כדי להוסיף הערות...
            </p>
          )}
        </div>
      )}
    </Card>
  );
};














