/**
 * Hook for managing table filters
 * Converts between new filter format and legacy format for backward compatibility
 */

import { useState, useCallback, useMemo } from 'react';
import { ActiveFilter, FilterField, FilterGroup, FilterOperator } from '@/components/dashboard/TableFilter';
import {
  addFilterToGroup,
  addGroupToGroup,
  createRootGroup,
  flattenFilterGroup,
  removeFilterFromGroup,
  removeGroupFromGroup,
  updateFilterInGroup,
  updateGroupInGroup,
} from '@/utils/filterGroupUtils';
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
    filterKey: 'selectedDate',
  },
  {
    id: 'name',
    label: 'שם',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
    filterKey: 'searchQuery',
  },
  {
    id: 'phone',
    label: 'טלפון',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
    filterKey: 'searchQuery',
  },
  {
    id: 'email',
    label: 'אימייל',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
    filterKey: 'searchQuery',
  },
  {
    id: 'status',
    label: 'סטטוס',
    type: 'multiselect',
    options: [...STATUS_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
    filterKey: 'selectedStatus',
  },
  {
    id: 'age',
    label: 'גיל',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
    filterKey: 'selectedAge',
  },
  {
    id: 'birthDate',
    label: 'תאריך לידה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'height',
    label: 'גובה (ס"מ)',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
    filterKey: 'selectedHeight',
  },
  {
    id: 'weight',
    label: 'משקל (ק"ג)',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
    filterKey: 'selectedWeight',
  },
  {
    id: 'fitnessGoal',
    label: 'מטרת כושר',
    type: 'multiselect',
    options: [...FITNESS_GOAL_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
    filterKey: 'selectedFitnessGoal',
  },
  {
    id: 'activityLevel',
    label: 'רמת פעילות',
    type: 'multiselect',
    options: [...ACTIVITY_LEVEL_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
    filterKey: 'selectedActivityLevel',
  },
  {
    id: 'preferredTime',
    label: 'זמן מועדף',
    type: 'multiselect',
    options: [...PREFERRED_TIME_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
    filterKey: 'selectedPreferredTime',
  },
  {
    id: 'source',
    label: 'מקור',
    type: 'multiselect',
    options: [...SOURCE_OPTIONS], // Fallback static options
    operators: ['is', 'isNot'],
    filterKey: 'selectedSource',
  },
  {
    id: 'notes',
    label: 'הערות',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
    filterKey: 'searchQuery',
  },
  {
    id: 'id',
    label: 'מזהה',
    type: 'text',
    operators: ['equals', 'notEquals'],
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
    id: 'full_name',
    label: 'שם',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
  },
  {
    id: 'phone',
    label: 'טלפון',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
  },
  {
    id: 'email',
    label: 'אימייל',
    type: 'text',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
  },
  {
    id: 'total_leads',
    label: 'מספר לידים',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'total_spent',
    label: 'סכום כולל',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'membership_tier',
    label: 'רמת חברות',
    type: 'select',
    options: ['New', 'Standard', 'Premium', 'VIP'],
    operators: ['is', 'isNot'],
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
// Base filter fields for Payments table (without dynamic options)
export const PAYMENT_FILTER_FIELDS: FilterField[] = [
  {
    id: 'created_at',
    label: 'תאריך יצירה',
    type: 'date',
    operators: ['equals', 'before', 'after', 'between'],
  },
  {
    id: 'status',
    label: 'סטטוס תשלום',
    type: 'multiselect',
    options: ['שולם', 'ממתין', 'הוחזר', 'נכשל'],
    operators: ['is', 'isNot'],
  },
  {
    id: 'amount',
    label: 'סכום',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  },
  {
    id: 'currency',
    label: 'מטבע',
    type: 'multiselect',
    options: ['ILS', 'USD', 'EUR'],
    operators: ['is', 'isNot'],
  },
];

/**
 * Get filter fields for Payments table with dynamic options from data
 */
export function getPaymentFilterFields(payments: any[] = []): FilterField[] {
  return PAYMENT_FILTER_FIELDS.map(field => {
    // If we need dynamic options in the future, we can add them here
    // For now, return the base fields
    return field;
  });
}

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
  const [filterGroup, setFilterGroupState] = useState<FilterGroup>(() => createRootGroup(initialFilters));
  const filters = useMemo(() => flattenFilterGroup(filterGroup), [filterGroup]);

  const addFilter = useCallback((filter: ActiveFilter) => {
    setFilterGroupState((prev) => addFilterToGroup(prev, filter));
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setFilterGroupState((prev) => removeFilterFromGroup(prev, filterId));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterGroupState(createRootGroup([]));
  }, []);

  const updateFilters = useCallback((newFilters: ActiveFilter[]) => {
    setFilterGroupState(createRootGroup(newFilters));
  }, []);

  const updateFilter = useCallback((updatedFilter: ActiveFilter) => {
    setFilterGroupState((prev) => updateFilterInGroup(prev, updatedFilter));
  }, []);

  const setFilterGroup = useCallback((group: FilterGroup) => {
    setFilterGroupState(group);
  }, []);

  const addGroup = useCallback((group: FilterGroup, parentGroupId?: string) => {
    setFilterGroupState((prev) => addGroupToGroup(prev, group, parentGroupId));
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<FilterGroup>) => {
    setFilterGroupState((prev) => updateGroupInGroup(prev, groupId, updates));
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setFilterGroupState((prev) => removeGroupFromGroup(prev, groupId));
  }, []);

  // Convert new filter format to legacy format for backward compatibility
  const toLegacyFormat = useCallback(() => {
    const legacy: Record<string, any> = {};

    filters.forEach(filter => {
      const fieldConfig = LEAD_FILTER_FIELDS_BASE.find((field) => field.id === filter.fieldId);
      if (!fieldConfig?.filterKey) return;
      if (!filter.values || filter.values.length === 0) return;

      if (filter.operator === 'is' || filter.operator === 'equals' || filter.operator === 'contains') {
        legacy[fieldConfig.filterKey] = filter.values[0];
      }
    });

    return legacy;
  }, [filters]);

  return {
    filterGroup,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    updateFilters,
    updateFilter,
    setFilterGroup,
    addGroup,
    updateGroup,
    removeGroup,
    toLegacyFormat,
  };
};











