/**
 * Filter Chips Component
 * 
 * Displays active filters as removable chips/badges
 */

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ActiveFilter, FilterGroup, FilterNode, OPERATOR_LABELS } from './TableFilter';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { flattenFilterGroup, isFilterGroup, isAdvancedFilterGroup } from '@/utils/filterGroupUtils';

interface FilterChipsProps {
  filters: ActiveFilter[];
  filterGroup?: FilterGroup | null;
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
  onEdit?: (filter: ActiveFilter) => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  filterGroup,
  onRemove,
  onClearAll,
  onEdit,
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

  const renderFilterBadge = (filter: ActiveFilter) => (
    <Badge
      key={filter.id}
      variant="secondary"
      className={cn(
        "px-3 py-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors",
        onEdit ? "cursor-pointer" : "cursor-default"
      )}
      onClick={onEdit ? () => onEdit(filter) : undefined}
    >
      <span className="font-medium">{filter.fieldLabel}</span>
      <span className="mx-1 text-indigo-600">{OPERATOR_LABELS[filter.operator]}</span>
      <span className="font-semibold">{formatFilterValue(filter)}</span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onRemove(filter.id);
        }}
        className="mr-2 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
        aria-label="הסר סינון"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );

  const renderGroup = (group: FilterGroup, depth: number) => {
    const groupChildren = group.children || [];
    const groupFilters = groupChildren.filter((child) => !isFilterGroup(child)) as ActiveFilter[];
    const childGroups = groupChildren.filter((child) => isFilterGroup(child)) as FilterGroup[];
    const nestedStyle = depth > 0 ? { marginRight: depth * 12 } : undefined;

    return (
      <div
        key={group.id}
        className={cn(
          'rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2',
          depth === 0 && 'bg-white'
        )}
        style={nestedStyle}
      >
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            {group.operator === 'and' ? 'וגם' : 'או'}
          </span>
          {group.not && (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              לא
            </span>
          )}
        </div>
        <div className="space-y-3">
          {groupFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groupFilters.map((child) => renderFilterBadge(child))}
            </div>
          )}
          {childGroups.length > 0 && (
            <div className="space-y-3">
              {childGroups.map((child) => renderGroup(child, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const showAdvanced = filterGroup && isAdvancedFilterGroup(filterGroup);
  const leafCount = filterGroup ? flattenFilterGroup(filterGroup).length : filters.length;

  return (
    <div className={className} dir="rtl">
      {showAdvanced && filterGroup ? (
        <div className="space-y-3">
          {renderGroup(filterGroup, 0)}
          {leafCount > 1 && (
            <button
              onClick={onClearAll}
              className="text-sm text-gray-600 hover:text-gray-900 underline px-2"
            >
              נקה הכל
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => renderFilterBadge(filter))}
          {filters.length > 1 && (
            <button
              onClick={onClearAll}
              className="text-sm text-gray-600 hover:text-gray-900 underline px-2"
            >
              נקה הכל
            </button>
          )}
        </div>
      )}
    </div>
  );
};









