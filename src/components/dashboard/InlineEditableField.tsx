/**
 * InlineEditableField Component
 * 
 * User-friendly inline editing component with hover-to-edit UX.
 * Shows edit icon on hover, click to edit, with save/cancel buttons.
 */

import { useState, useRef, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineEditableFieldProps {
  label: string;
  value: string | number;
  onSave: (newValue: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel';
  formatValue?: (value: string | number) => string;
  className?: string;
  valueClassName?: string;
  disabled?: boolean;
}

export const InlineEditableField = ({
  label,
  value,
  onSave,
  type = 'text',
  formatValue,
  className,
  valueClassName,
  disabled = false,
}: InlineEditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(String(value));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(String(value));
  };

  const handleSave = async () => {
    if (editValue === String(value)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      let finalValue: string | number = editValue;
      if (type === 'number') {
        finalValue = Number(editValue);
        if (isNaN(finalValue)) {
          throw new Error('Invalid number');
        }
      }
      await onSave(finalValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Revert on error
      setEditValue(String(value));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatValue ? formatValue(value) : String(value);

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-2 py-0.5', className)}>
        <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
        <div className="relative flex-1 min-w-0">
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs pr-9 pl-7"
            disabled={isSaving}
            dir="rtl"
          />
          {/* Checkmark and X icons inside the input field */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={isSaving}
              className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-50/80 rounded"
              title="Enter לשמירה"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50/80 rounded"
              title="Escape לביטול"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDoubleClick = () => {
    if (disabled) return;
    handleEdit();
  };

  return (
    <div
      className={cn('flex items-center gap-2 py-0.5 group', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span 
          className={cn('text-sm font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors', valueClassName)}
          onDoubleClick={handleDoubleClick}
          title={!disabled ? 'לחץ פעמיים לעריכה' : undefined}
        >
          {displayValue}
        </span>
        {!disabled && (
          <button
            onClick={handleEdit}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0',
              isHovered && 'opacity-100'
            )}
            title="ערוך"
          >
            <Edit className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};
