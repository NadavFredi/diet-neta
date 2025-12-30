/**
 * Filter Chips Component
 * 
 * Displays active filters as removable chips/badges
 */

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ActiveFilter, OPERATOR_LABELS } from './TableFilter';
import { formatDate } from '@/utils/dashboard';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemove,
  onClearAll,
  className,
}) => {
  if (filters.length === 0) return null;

  const formatFilterValue = (filter: ActiveFilter): string => {
    if (filter.type === 'date') {
      if (filter.operator === 'between' && filter.values.length === 2) {
        try {
          const from = format(new Date(filter.values[0]), 'dd/MM/yyyy', { locale: he });
          const to = format(new Date(filter.values[1]), 'dd/MM/yyyy', { locale: he });
          return `${from} - ${to}`;
        } catch {
          return filter.values.join(' - ');
        }
      } else if (filter.values.length > 0) {
        try {
          return format(new Date(filter.values[0]), 'dd/MM/yyyy', { locale: he });
        } catch {
          return filter.values[0];
        }
      }
    }
    
    if (filter.values.length > 2) {
      return `${filter.values.slice(0, 2).join(', ')} +${filter.values.length - 2}`;
    }
    
    return filter.values.join(', ');
  };

  return (
    <div className={className} dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors cursor-default"
          >
            <span className="font-medium">{filter.fieldLabel}</span>
            <span className="mx-1 text-indigo-600">{OPERATOR_LABELS[filter.operator]}</span>
            <span className="font-semibold">{formatFilterValue(filter)}</span>
            <button
              onClick={() => onRemove(filter.id)}
              className="mr-2 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              aria-label="הסר סינון"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {filters.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-600 hover:text-gray-900 underline px-2"
          >
            נקה הכל
          </button>
        )}
      </div>
    </div>
  );
};














