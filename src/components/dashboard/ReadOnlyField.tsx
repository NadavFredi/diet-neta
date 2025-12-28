/**
 * ReadOnlyField Component
 * 
 * Displays a read-only field with consistent two-row layout:
 * - First row: Label
 * - Second row: Value
 * Matches the structure of InlineEditableField for visual consistency.
 */

import { cn } from '@/lib/utils';

interface ReadOnlyFieldProps {
  label: string;
  value: string | number | null;
  className?: string;
  valueClassName?: string;
}

export const ReadOnlyField = ({
  label,
  value,
  className,
  valueClassName,
}: ReadOnlyFieldProps) => {
  const displayValue = value !== null && value !== '' ? String(value) : '-';

  return (
    <div
      className={cn('flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right transition-all duration-200', className)}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>
        {label}:
      </span>
      <span 
        className={cn(
          'text-sm font-semibold text-slate-900 flex-1 min-w-0 truncate',
          valueClassName
        )}
        style={{ 
          fontSize: '14px', 
          fontWeight: 600
        }}
      >
        {displayValue}
      </span>
    </div>
  );
};
