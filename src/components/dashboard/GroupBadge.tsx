/**
 * GroupBadge Component
 * 
 * Displays active grouping configuration with quick actions to edit/remove
 */

import { X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GroupBadgeProps {
  groupByKeys: [string | null, string | null];
  columnHeaders: Record<string, string>; // Map of column id to header text
  onEdit: () => void;
  onRemove: () => void;
  className?: string;
}

export const GroupBadge: React.FC<GroupBadgeProps> = ({
  groupByKeys,
  columnHeaders,
  onEdit,
  onRemove,
  className,
}) => {
  const [level1, level2] = groupByKeys;

  // Don't render if no grouping is active
  if (!level1 && !level2) {
    return null;
  }

  const getColumnHeader = (columnId: string | null): string => {
    if (!columnId) return '';
    return columnHeaders[columnId] || columnId;
  };

  const level1Header = getColumnHeader(level1);
  const level2Header = getColumnHeader(level2);

  // Build badge text
  let badgeText = '';
  if (level1 && level2) {
    badgeText = `${level1Header} → ${level2Header}`;
  } else if (level1) {
    badgeText = level1Header;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
        'bg-slate-100 border border-slate-200 text-sm',
        'text-slate-700 font-medium',
        className
      )}
      dir="rtl"
    >
      <span className="text-xs text-slate-500 font-normal">קיבוץ לפי:</span>
      <span className="font-semibold text-slate-900">{badgeText}</span>
      
      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="flex-shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
        title="ערוך קיבוץ"
        aria-label="ערוך קיבוץ"
      >
        <Edit2 className="h-3 w-3 text-slate-600" />
      </button>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
        title="הסר קיבוץ"
        aria-label="הסר קיבוץ"
      >
        <X className="h-3 w-3 text-slate-600" />
      </button>
    </div>
  );
};
