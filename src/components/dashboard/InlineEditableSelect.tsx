/**
 * InlineEditableSelect Component
 * 
 * Inline editable select field that allows adding new custom options.
 * Supports double-click to edit and Enter to save.
 */

import { useState, useRef, useEffect } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
}

export const InlineEditableSelect = ({
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
}: InlineEditableSelectProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
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
    setEditValue(value);
  }, [value]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setIsAddingNew(false);
    setNewOptionValue('');
  };

  const handleSave = async () => {
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
      
      // Exit editing mode immediately for better UX (optimistic update)
      setIsEditing(false);
      setIsAddingNew(false);
      setNewOptionValue('');
      
      // Save in background - optimistic updates handle the UI
      onSave(finalValue).catch((error) => {
        console.error('InlineEditableSelect: Failed to save:', error);
        // On error, revert to original value
        setEditValue(value);
        // Re-enter editing mode so user can retry
        setIsEditing(true);
      });
    } catch (error) {
      console.error('InlineEditableSelect: Validation error:', error);
      setEditValue(value);
      setIsSaving(false);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isAddingNew) {
        handleSave();
      } else {
        handleSave();
      }
    } else if (e.key === 'Escape') {
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
                  onValueChange={(value) => {
                    if (value === '__add_new__') {
                      handleAddNew();
                      // Reset to current value to prevent "__add_new__" from being selected
                      setTimeout(() => setEditValue(editValue), 0);
                    } else {
                      setEditValue(value);
                      // Auto-save on selection change
                      setTimeout(() => handleSave(), 100);
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
};




