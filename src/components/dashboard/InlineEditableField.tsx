/**
 * InlineEditableField Component
 * 
 * User-friendly inline editing component with hover-to-edit UX.
 * Shows edit icon on hover, click to edit, with save/cancel buttons.
 */

import { useState, useRef, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
      
      // Exit editing mode immediately for better UX (optimistic update)
      setIsEditing(false);
      
      // Save in background - optimistic updates handle the UI
      onSave(finalValue).catch((error) => {
        console.error('InlineEditableField: Failed to save:', error);
        // On error, revert to original value
        setEditValue(String(value));
        // Re-enter editing mode so user can retry
        setIsEditing(true);
      });
    } catch (error) {
      console.error('InlineEditableField: Validation error:', error);
      setEditValue(String(value));
      setIsSaving(false);
      throw error;
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
};
