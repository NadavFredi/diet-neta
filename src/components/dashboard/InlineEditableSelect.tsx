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
      
      await onSave(finalValue);
      setIsEditing(false);
      setIsAddingNew(false);
      setNewOptionValue('');
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value);
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

  const handleDoubleClick = () => {
    if (disabled) return;
    handleEdit();
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewOptionValue('');
  };

  if (isEditing) {
    return (
      <div className={cn('flex flex-col gap-1.5 py-1.5', className)}>
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className="flex flex-col gap-2">
          {isAddingNew ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={newOptionInputRef}
                type="text"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="הזן ערך חדש..."
                className="h-7 text-xs flex-1"
                disabled={isSaving}
                dir="rtl"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving || !newOptionValue.trim()}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Enter לשמירה"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewOptionValue('');
                }}
                disabled={isSaving}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5" onKeyDown={handleKeyDown}>
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
                  <SelectTrigger className="h-7 text-xs flex-1">
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Enter לשמירה"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Escape לביטול"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-0.5 py-1.5 group', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5 justify-between">
        <span 
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity',
            badgeClassName || 'bg-gray-50 text-gray-700 border-gray-200',
            valueClassName
          )}
          onDoubleClick={handleDoubleClick}
          title={!disabled ? 'לחץ פעמיים לעריכה' : undefined}
        >
          {formatValue ? formatValue(value || '') : (value || '-')}
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


