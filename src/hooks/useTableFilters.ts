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
import { 
  getLeadFilterOptions,
  extractWorkoutTemplateFilterOptions,
  extractNutritionTemplateFilterOptions
} from '@/utils/filterUtils';
import type { Lead } from '@/store/slices/dashboardSlice';

export interface FilterConfig {
  filters: ActiveFilter[];
}

// Base filter fields for Leads table (without dynamic options)
export const LEAD_FILTER_FIELDS_BASE: FilterField[] = [
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
    options: [...STATUS_OPTIONS], // Fallback static options
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
    options: [...FITNESS_GOAL_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
  },
  {
    id: 'activityLevel',
    label: 'רמת פעילות',
    type: 'multiselect',
    options: [...ACTIVITY_LEVEL_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
  },
  {
    id: 'preferredTime',
    label: 'זמן מועדף',
    type: 'multiselect',
    options: [...PREFERRED_TIME_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
  },
  {
    id: 'source',
    label: 'מקור',
    type: 'multiselect',
    options: [...SOURCE_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
  },
];

/**
 * Get filter fields for Leads table with dynamic options from data
 */
export function getLeadFilterFields(leads: Lead[] = []): FilterField[] {
  const dynamicOptions = getLeadFilterOptions(leads);
  
  return LEAD_FILTER_FIELDS_BASE.map(field => {
    if (field.id === 'status' && dynamicOptions.status.length > 0) {
      return { ...field, dynamicOptions: dynamicOptions.status };
    }
    if (field.id === 'fitnessGoal' && dynamicOptions.fitnessGoal.length > 0) {
      return { ...field, dynamicOptions: dynamicOptions.fitnessGoal };
    }
    if (field.id === 'activityLevel' && dynamicOptions.activityLevel.length > 0) {
      return { ...field, dynamicOptions: dynamicOptions.activityLevel };
    }
    if (field.id === 'preferredTime' && dynamicOptions.preferredTime.length > 0) {
      return { ...field, dynamicOptions: dynamicOptions.preferredTime };
    }
    if (field.id === 'source' && dynamicOptions.source.length > 0) {
      return { ...field, dynamicOptions: dynamicOptions.source };
    }
    return field;
  });
}

// For backward compatibility, export base fields
export const LEAD_FILTER_FIELDS = LEAD_FILTER_FIELDS_BASE;

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

/**
 * Get filter fields for Workout Templates table with dynamic options from data
 */
export function getWorkoutTemplateFilterFields(templates: any[] = []): FilterField[] {
  return [
    {
      id: 'created_at',
      label: 'תאריך יצירה',
      type: 'date',
      operators: ['equals', 'before', 'after', 'between'],
    },
    {
      id: 'goal_tags',
      label: 'תגיות מטרה',
      type: 'multiselect',
      dynamicOptions: extractWorkoutTemplateFilterOptions(templates, 'goal_tags'),
      operators: ['is', 'isNot'],
    },
    {
      id: 'is_public',
      label: 'תבנית ציבורית',
      type: 'select',
      dynamicOptions: extractWorkoutTemplateFilterOptions(templates, 'is_public'),
      operators: ['is', 'isNot'],
    },
    {
      id: 'has_leads',
      label: 'יש לידים',
      type: 'select',
      options: ['כן', 'לא'],
      operators: ['is', 'isNot'],
    },
  ];
}

// Base filter fields for Templates table (without dynamic options)
export const TEMPLATE_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'goal_tags',
    label: 'תגיות מטרה',
    type: 'multiselect',
    operators: ['is', 'isNot'],
  },
  {
    id: 'is_public',
    label: 'תבנית ציבורית',
    type: 'select',
    operators: ['is', 'isNot'],
  },
  {
    id: 'has_leads',
    label: 'יש לידים',
    type: 'select',
    options: ['כן', 'לא'],
    operators: ['is', 'isNot'],
  },
];

/**
 * Get filter fields for Nutrition Templates table with dynamic options from data
 */
export function getNutritionTemplateFilterFields(templates: any[] = []): FilterField[] {
  return [
    {
      id: 'created_at',
      label: 'תאריך יצירה',
      type: 'date',
      operators: ['equals', 'before', 'after', 'between'],
    },
    {
      id: 'is_public',
      label: 'תבנית ציבורית',
      type: 'select',
      dynamicOptions: extractNutritionTemplateFilterOptions(templates, 'is_public'),
      operators: ['is', 'isNot'],
    },
    {
      id: 'calories_range',
      label: 'טווח קלוריות',
      type: 'multiselect',
      dynamicOptions: extractNutritionTemplateFilterOptions(templates, 'calories_range'),
      operators: ['is', 'isNot'],
    },
    {
      id: 'protein_range',
      label: 'טווח חלבון',
      type: 'multiselect',
      dynamicOptions: extractNutritionTemplateFilterOptions(templates, 'protein_range'),
      operators: ['is', 'isNot'],
    },
  ];
}

// Base filter fields for Nutrition Templates table (without dynamic options)
export const NUTRITION_TEMPLATE_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'is_public',
    label: 'תבנית ציבורית',
    type: 'select',
    operators: ['is', 'isNot'],
  },
  {
    id: 'calories_range',
    label: 'טווח קלוריות',
    type: 'multiselect',
    operators: ['is', 'isNot'],
  },
  {
    id: 'protein_range',
    label: 'טווח חלבון',
    type: 'multiselect',
    operators: ['is', 'isNot'],
  },
];

// Define filter fields for Meetings table
export const MEETING_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'meeting_date',
    label: 'תאריך פגישה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'status',
    label: 'סטטוס',
    type: 'select',
    options: ['פעיל', 'בוטל', 'הושלם', 'מתוכנן'],
    operators: ['is', 'isNot'],
  },
];

/**
 * Get filter fields for Meetings table with dynamic options from data
 */
export function getMeetingFilterFields(meetings: any[] = []): FilterField[] {
  return MEETING_FILTER_FIELDS.map(field => {
    // If we need dynamic options in the future, we can add them here
    // For now, return the base fields
    return field;
  });
}

// Base filter fields for Budgets table (without dynamic options)
export const BUDGET_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'is_public',
    label: 'תקציב ציבורי',
    type: 'select',
    options: ['כן', 'לא'],
    operators: ['is', 'isNot'],
  },
  {
    id: 'steps_goal',
    label: 'יעד צעדים',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
];

/**
 * Get filter fields for Budgets table with dynamic options from data
 */
export function getBudgetFilterFields(budgets: any[] = []): FilterField[] {
  return BUDGET_FILTER_FIELDS.map(field => {
    // If we need dynamic options in the future, we can add them here
    // For now, return the base fields
    return field;
  });
}

// Define filter fields for Subscription Types table
export const SUBSCRIPTION_TYPE_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
];

/**
 * Get filter fields for Subscription Types table with dynamic options from data
 */
export function getSubscriptionTypeFilterFields(subscriptionTypes: any[] = []): FilterField[] {
  return SUBSCRIPTION_TYPE_FILTER_FIELDS.map(field => {
    // If we need dynamic options in the future, we can add them here
    // For now, return the base fields
    return field;
  });
}

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















