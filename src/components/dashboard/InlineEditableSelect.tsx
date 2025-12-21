/**
 * InlineEditableSelect Component
 * 
 * Inline editable select field that allows adding new custom options.
 * Supports double-click to edit and Enter to save.
 */

import { useState, useRef, useEffect } from 'react';
import { Edit, Check, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
      <div className={cn('flex items-center gap-2 py-0.5', className)}>
        <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
        <div className="flex-1 min-w-0">
          {isAddingNew ? (
            <div className="relative flex-1">
              <Input
                ref={newOptionInputRef}
                type="text"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="הזן ערך חדש..."
                className="h-7 text-xs pr-9 pl-7"
                disabled={isSaving}
                dir="rtl"
              />
              {/* Single save/cancel button group - positioned inside input field */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 pointer-events-none">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={isSaving || !newOptionValue.trim()}
                  className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-all flex-shrink-0 pointer-events-auto bg-white/95 backdrop-blur-sm border border-green-200/50 shadow-sm"
                  title="שמור (Enter)"
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAddingNew(false);
                    setNewOptionValue('');
                  }}
                  disabled={isSaving}
                  className="h-5 w-5 p-0 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0 pointer-events-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-sm"
                  title="בטל (Escape)"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="relative flex-1" onKeyDown={handleKeyDown}>
                <Select 
                  value={editValue} 
                  onValueChange={(value) => {
                    if (value === '__add_new__') {
                      handleAddNew();
                      // Reset to current value to prevent "__add_new__" from being selected
                      setTimeout(() => setEditValue(editValue), 0);
                    } else {
                      setEditValue(value);
                    }
                  }}
                  disabled={isSaving || isAddingNew}
                  dir="rtl"
                >
                  <SelectTrigger className="h-7 text-xs pr-12 pl-2">
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
                {/* Single save/cancel button group - positioned inside select field */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 pointer-events-none">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSave();
                    }}
                    disabled={isSaving}
                    className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-all flex-shrink-0 pointer-events-auto bg-white/95 backdrop-blur-sm border border-green-200/50 shadow-sm"
                    title="שמור (Enter)"
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCancel();
                    }}
                    disabled={isSaving}
                    className="h-5 w-5 p-0 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0 pointer-events-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-sm"
                    title="בטל (Escape)"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 py-0.5 group', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span 
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity',
            badgeClassName || 'bg-gray-50 text-gray-700 border-gray-200',
            valueClassName
          )}
          onClick={handleClick}
          title={!disabled ? 'לחץ לעריכה' : undefined}
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




