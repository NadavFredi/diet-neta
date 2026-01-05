/**
 * InlineEditableField Component
 * 
 * User-friendly inline editing component with hover-to-edit UX.
 * Shows edit icon on hover, click to edit, with save/cancel buttons.
 */

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface InlineEditableFieldRef {
  save: () => Promise<void>;
  cancel: () => void;
  isEditing: boolean;
}

interface InlineEditableFieldProps {
  label: string;
  value: string | number;
  onSave: (newValue: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel';
  formatValue?: (value: string | number) => string;
  className?: string;
  valueClassName?: string;
  disabled?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

export const InlineEditableField = forwardRef<InlineEditableFieldRef, InlineEditableFieldProps>(({
  label,
  value,
  onSave,
  type = 'text',
  formatValue,
  className,
  valueClassName,
  disabled = false,
  onEditingChange,
}, ref) => {
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
    // Only update editValue if we're not currently editing or saving
    // This prevents the value from reverting while saving
    if (!isEditing && !isSaving) {
      setEditValue(String(value));
    }
  }, [value, isEditing, isSaving]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(String(value));
  }, [value]);

  const handleSave = useCallback(async () => {
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
      
      // Update local state optimistically
      setEditValue(String(finalValue));
      setIsEditing(false);
      
      // Await the save to ensure it completes
      try {
        await onSave(finalValue);
        console.log('InlineEditableField: Save successful', finalValue);
      } catch (error) {
        console.error('InlineEditableField: Failed to save:', error);
        // On error, revert to original value
        setEditValue(String(value));
        setIsEditing(true);
        throw error;
      }
    } catch (error) {
      console.error('InlineEditableField: Validation error:', error);
      setEditValue(String(value));
      setIsSaving(false);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, type, onSave]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    cancel: handleCancel,
    isEditing,
  }), [handleSave, handleCancel, isEditing]);

  // Store callback in ref to avoid dependency issues
  const onEditingChangeRef = useRef(onEditingChange);
  
  // Update ref when callback changes
  useEffect(() => {
    onEditingChangeRef.current = onEditingChange;
  }, [onEditingChange]);
  
  // Track previous editing state to avoid unnecessary calls
  const prevIsEditingRef = useRef(isEditing);
  
  // Notify parent of editing state changes (only when state actually changes)
  useEffect(() => {
    if (prevIsEditingRef.current !== isEditing) {
      prevIsEditingRef.current = isEditing;
      onEditingChangeRef.current?.(isEditing);
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(String(value));
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
      <div className={cn('flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right', className)}>
        <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
        <div className="relative flex-1 min-w-0">
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-8 text-sm px-3 pr-3",
              "border-2 border-[#5B6FB9] focus:border-[#5B6FB9] focus-visible:ring-2 focus-visible:ring-[#5B6FB9]/20",
              "transition-all duration-200",
              "bg-white"
            )}
            disabled={isSaving}
            dir="rtl"
          />
        </div>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    handleEdit();
  };

  return (
    <div
      className={cn('flex flex-col gap-1.5 py-0.5 group min-w-0 w-full text-right transition-all duration-200', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>{label}:</span>
      <div className="flex items-center gap-2 min-w-0 w-full relative">
        <span 
          className={cn(
            'text-sm font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors',
            'flex-1 min-w-0 truncate',
            valueClassName
          )}
          style={{ 
            fontSize: '14px', 
            fontWeight: 600
          }}
          onClick={handleClick}
          title={displayValue || (!disabled ? 'לחץ לעריכה' : undefined)}
        >
          {displayValue || '-'}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClick}
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
});

InlineEditableField.displayName = 'InlineEditableField';
