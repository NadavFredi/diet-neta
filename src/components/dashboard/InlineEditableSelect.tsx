/**
 * InlineEditableSelect Component
 * 
 * Inline editable select field that allows adding new custom options.
 * Supports double-click to edit and Enter to save.
 */

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface InlineEditableSelectRef {
  save: () => Promise<void>;
  cancel: () => void;
  isEditing: boolean;
}

interface InlineEditableSelectProps {
  label: string;
  value: string;
  options: string[];
  onSave: (newValue: string) => Promise<void>;
  onAddOption?: (newOption: string) => Promise<void>;
  formatValue?: (value: string) => string;
  className?: string;
  valueClassName?: string;
  disabled?: boolean;
  badgeClassName?: string;
  onEditingChange?: (isEditing: boolean) => void;
}

export const InlineEditableSelect = forwardRef<InlineEditableSelectRef, InlineEditableSelectProps>(({
  label,
  value,
  options,
  onSave,
  onAddOption,
  formatValue,
  className,
  valueClassName,
  disabled = false,
  badgeClassName,
  onEditingChange,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const newOptionInputRef = useRef<HTMLInputElement>(null);

  // Combine existing options with current value if it's not in the list
  const allOptions = [...new Set([...options, value].filter(Boolean))];

  useEffect(() => {
    if (isEditing && !isAddingNew && inputRef.current) {
      // Focus will be handled by Select component
    }
    if (isAddingNew && newOptionInputRef.current) {
      newOptionInputRef.current.focus();
    }
  }, [isEditing, isAddingNew]);

  useEffect(() => {
    // Only update editValue if we're not currently editing or saving
    // This prevents the value from reverting while saving
    if (!isEditing && !isSaving) {
      setEditValue(value);
    }
  }, [value, isEditing, isSaving]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setIsAddingNew(false);
    setNewOptionValue('');
    setIsSelectOpen(false);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === value && !isAddingNew) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      let finalValue = editValue;
      
      // If adding new option, save it first
      if (isAddingNew && newOptionValue.trim()) {
        finalValue = newOptionValue.trim();
        if (onAddOption) {
          await onAddOption(finalValue);
        }
      }
      
      // Update local state optimistically
      setEditValue(finalValue);
      setIsEditing(false);
      setIsAddingNew(false);
      setNewOptionValue('');
      setIsSelectOpen(false);
      
      // Await the save to ensure it completes
      try {
        await onSave(finalValue);
        console.log('InlineEditableSelect: Save successful', finalValue);
      } catch (error) {
        console.error('InlineEditableSelect: Failed to save:', error);
        // On error, revert to original value
        setEditValue(value);
        setIsEditing(true);
        throw error;
      }
    } catch (error) {
      console.error('InlineEditableSelect: Validation error:', error);
      setEditValue(value);
      setIsSaving(false);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, isAddingNew, newOptionValue, onAddOption, onSave]);

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
    setEditValue(value);
    setIsAddingNew(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isAddingNew) {
        handleSave();
      } else {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    handleEdit();
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewOptionValue('');
  };

  if (isEditing) {
    return (
      <div className={cn('flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right', className)}>
        <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>{label}:</span>
        <div className="flex-1 min-w-0">
          {isAddingNew ? (
            <div className="relative flex-1 min-w-0">
              <Input
                ref={newOptionInputRef}
                type="text"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="הזן ערך חדש..."
                className={cn(
                  "w-full h-8 text-sm px-3",
                  "border-2 border-[#5B6FB9] focus:border-[#5B6FB9] focus-visible:ring-2 focus-visible:ring-[#5B6FB9]/20",
                  "transition-all duration-200",
                  "bg-white"
                )}
                disabled={isSaving}
                dir="rtl"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0" onKeyDown={handleKeyDown}>
                <Select 
                  value={editValue} 
                  open={isSelectOpen}
                  onOpenChange={(open) => {
                    setIsSelectOpen(open);
                  }}
                  onValueChange={(value) => {
                    if (value === '__add_new__') {
                      handleAddNew();
                      // Reset to current value to prevent "__add_new__" from being selected
                      setTimeout(() => setEditValue(editValue), 0);
                    } else {
                      // Just update the local value, don't save yet
                      // User will save with Enter key or save button
                      setEditValue(value);
                    }
                  }}
                  disabled={isSaving || isAddingNew}
                  dir="rtl"
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full h-8 text-sm px-3",
                      "border-2 border-[#5B6FB9] focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
                      "transition-all duration-200",
                      "bg-white"
                    )}
                    onKeyDown={(e) => {
                      // Handle Enter key when SelectTrigger is focused (dropdown closed)
                      if (e.key === 'Enter' && !isSelectOpen) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave();
                      } else if (e.key === 'Escape' && !isSelectOpen) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancel();
                      }
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {allOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatValue ? formatValue(option) : option}
                      </SelectItem>
                    ))}
                    <SelectItem 
                      value="__add_new__"
                      className="text-blue-600 font-semibold"
                    >
                      <div className="flex items-center gap-1.5">
                        <Plus className="h-3 w-3" />
                        הוסף ערך חדש
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-1.5 py-0.5 group min-w-0 w-full text-right transition-all duration-200', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>{label}:</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 relative">
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
          title={formatValue ? formatValue(value || '') : (value || (!disabled ? 'לחץ לעריכה' : undefined))}
        >
          {formatValue ? formatValue(value || '') : (value || '-')}
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

InlineEditableSelect.displayName = 'InlineEditableSelect';




