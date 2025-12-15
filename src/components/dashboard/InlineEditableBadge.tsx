/**
 * InlineEditableBadge Component
 * 
 * Inline editable badge/select field with hover-to-edit UX.
 */

import { useState } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface InlineEditableBadgeProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; className?: string }>;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export const InlineEditableBadge = ({
  label,
  value,
  options,
  onSave,
  className,
  disabled = false,
}: InlineEditableBadgeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const currentOption = options.find(opt => opt.value === value) || options[0];

  const handleEdit = () => {
    if (disabled) return;
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
      console.error('Failed to save:', error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn('flex items-center justify-between py-2', className)}>
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex items-center gap-2 flex-1 max-w-[200px] justify-end">
          <Select value={editValue} onValueChange={setEditValue} disabled={isSaving}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center justify-between py-2 group', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn(
          'inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border',
          currentOption.className || 'bg-gray-50 text-gray-700 border-gray-200'
        )}>
          {currentOption.label}
        </span>
        {!disabled && (
          <button
            onClick={handleEdit}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600',
              isHovered && 'opacity-100'
            )}
            title="ערוך"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
