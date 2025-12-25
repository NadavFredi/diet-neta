/**
 * Hook for managing table filters
 * Converts between new filter format and legacy format for backward compatibility
 */

import { useState, useCallback, useMemo } from 'react';
import { ActiveFilter, FilterField, FilterOperator } from '@/components/dashboard/TableFilter';
import { 
  STATUS_OPTIONS, 
  FITNESS_GOAL_OPTIONS, 
  ACTIVITY_LEVEL_OPTIONS, 
  PREFERRED_TIME_OPTIONS, 
  SOURCE_OPTIONS 
} from '@/utils/dashboard';

export interface FilterConfig {
  filters: ActiveFilter[];
}

// Define filter fields for Leads table
export const LEAD_FILTER_FIELDS: FilterField[] = [
  {
    id: 'createdDate',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'status',
    label: 'סטטוס',
    type: 'multiselect',
    options: [...STATUS_OPTIONS],
    operators: ['is', 'isNot'],
  },
  {
    id: 'age',
    label: 'גיל',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'height',
    label: 'גובה (ס"מ)',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'weight',
    label: 'משקל (ק"ג)',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'fitnessGoal',
    label: 'מטרת כושר',
    type: 'multiselect',
    options: [...FITNESS_GOAL_OPTIONS],
    operators: ['is', 'isNot'],
  },
  {
    id: 'activityLevel',
    label: 'רמת פעילות',
    type: 'multiselect',
    options: [...ACTIVITY_LEVEL_OPTIONS],
    operators: ['is', 'isNot'],
  },
  {
    id: 'preferredTime',
    label: 'זמן מועדף',
    type: 'multiselect',
    options: [...PREFERRED_TIME_OPTIONS],
    operators: ['is', 'isNot'],
  },
  {
    id: 'source',
    label: 'מקור',
    type: 'multiselect',
    options: [...SOURCE_OPTIONS],
    operators: ['is', 'isNot'],
  },
];

// Define filter fields for Customers table
export const CUSTOMER_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'total_leads',
    label: 'מספר לידים',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
];

// Define filter fields for Templates table
export const TEMPLATE_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'has_leads',
    label: 'יש לידים',
    type: 'select',
    options: ['כן', 'לא'],
    operators: ['is', 'isNot'],
  },
];

// Define filter fields for Nutrition Templates table
export const NUTRITION_TEMPLATE_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
];

export const useTableFilters = (initialFilters: ActiveFilter[] = []) => {
  const [filters, setFilters] = useState<ActiveFilter[]>(initialFilters);

  const addFilter = useCallback((filter: ActiveFilter) => {
    setFilters(prev => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const updateFilters = useCallback((newFilters: ActiveFilter[]) => {
    setFilters(newFilters);
  }, []);

  // Convert new filter format to legacy format for backward compatibility
  const toLegacyFormat = useCallback(() => {
    const legacy: Record<string, any> = {};
    
    filters.forEach(filter => {
      if (filter.fieldId === 'createdDate') {
        if (filter.operator === 'equals' && filter.values[0]) {
          legacy.selectedDate = filter.values[0];
        }
      } else if (filter.fieldId === 'status') {
        if (filter.operator === 'is' && filter.values.length > 0) {
          legacy.selectedStatus = filter.values[0]; // For now, take first value
        }
      } else if (filter.fieldId === 'age') {
        if (filter.operator === 'equals' && filter.values[0]) {
          legacy.selectedAge = filter.values[0];
        }
      } else if (filter.fieldId === 'height') {
        if (filter.operator === 'equals' && filter.values[0]) {
          legacy.selectedHeight = filter.values[0];
        }
      } else if (filter.fieldId === 'weight') {
        if (filter.operator === 'equals' && filter.values[0]) {
          legacy.selectedWeight = filter.values[0];
        }
      } else if (filter.fieldId === 'fitnessGoal') {
        if (filter.operator === 'is' && filter.values.length > 0) {
          legacy.selectedFitnessGoal = filter.values[0];
        }
      } else if (filter.fieldId === 'activityLevel') {
        if (filter.operator === 'is' && filter.values.length > 0) {
          legacy.selectedActivityLevel = filter.values[0];
        }
      } else if (filter.fieldId === 'preferredTime') {
        if (filter.operator === 'is' && filter.values.length > 0) {
          legacy.selectedPreferredTime = filter.values[0];
        }
      } else if (filter.fieldId === 'source') {
        if (filter.operator === 'is' && filter.values.length > 0) {
          legacy.selectedSource = filter.values[0];
        }
      }
    });

    return legacy;
  }, [filters]);

  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    updateFilters,
    toLegacyFormat,
  };
};







