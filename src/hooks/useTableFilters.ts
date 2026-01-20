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
import { generateFilterFieldsFromColumns } from '@/utils/columnToFilterUtils';
import type { Lead } from '@/store/slices/dashboardSlice';
import type { DataTableColumn } from '@/components/ui/DataTable';

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
 * Now automatically includes all renderable columns as filterable
 */
export function getLeadFilterFields(
  leads: Lead[] = [],
  columns?: DataTableColumn<Lead>[]
): FilterField[] {
  const dynamicOptions = getLeadFilterOptions(leads);
  
  // Custom configs for specific fields that need special handling
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    status: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.status.length > 0 ? dynamicOptions.status : undefined,
      options: dynamicOptions.status.length === 0 ? [...STATUS_OPTIONS] : undefined,
    },
    fitnessGoal: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.fitnessGoal.length > 0 ? dynamicOptions.fitnessGoal : undefined,
      options: dynamicOptions.fitnessGoal.length === 0 ? [...FITNESS_GOAL_OPTIONS] : undefined,
    },
    activityLevel: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.activityLevel.length > 0 ? dynamicOptions.activityLevel : undefined,
      options: dynamicOptions.activityLevel.length === 0 ? [...ACTIVITY_LEVEL_OPTIONS] : undefined,
    },
    preferredTime: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.preferredTime.length > 0 ? dynamicOptions.preferredTime : undefined,
      options: dynamicOptions.preferredTime.length === 0 ? [...PREFERRED_TIME_OPTIONS] : undefined,
    },
    source: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.source.length > 0 ? dynamicOptions.source : undefined,
      options: dynamicOptions.source.length === 0 ? [...SOURCE_OPTIONS] : undefined,
    },
  };
  
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      leads,
      LEAD_FILTER_FIELDS_BASE, // Merge with existing base fields for backward compatibility
      customFieldConfigs
    );
  }
  
  // Fallback to existing logic if columns not provided
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
 * Get filter fields for Customers table
 * Now automatically includes all renderable columns as filterable
 */
export function getCustomerFilterFields<T>(
  customers: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      customers,
      CUSTOMER_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      {}
    );
  }
  
  // Fallback to existing fields if columns not provided
  return CUSTOMER_FILTER_FIELDS;
}

/**
 * Get filter fields for Workout Templates table with dynamic options from data
 * Now automatically includes all renderable columns as filterable
 */
export function getWorkoutTemplateFilterFields<T>(
  templates: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const dynamicOptions = {
    goal_tags: extractWorkoutTemplateFilterOptions(templates as any, 'goal_tags'),
    is_public: extractWorkoutTemplateFilterOptions(templates as any, 'is_public'),
  };
  
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    goal_tags: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.goal_tags.length > 0 ? dynamicOptions.goal_tags : undefined,
    },
    is_public: {
      type: 'select',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.is_public.length > 0 ? dynamicOptions.is_public : undefined,
    },
    has_leads: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['כן', 'לא'],
    },
  };
  
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      templates,
      TEMPLATE_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      customFieldConfigs
    );
  }
  
  // Fallback to existing logic if columns not provided
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
      dynamicOptions: dynamicOptions.goal_tags,
      operators: ['is', 'isNot'],
    },
    {
      id: 'is_public',
      label: 'תבנית ציבורית',
      type: 'select',
      dynamicOptions: dynamicOptions.is_public,
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
 * Now automatically includes all renderable columns as filterable
 */
export function getNutritionTemplateFilterFields<T>(
  templates: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const dynamicOptions = {
    is_public: extractNutritionTemplateFilterOptions(templates as any, 'is_public'),
    calories_range: extractNutritionTemplateFilterOptions(templates as any, 'calories_range'),
    protein_range: extractNutritionTemplateFilterOptions(templates as any, 'protein_range'),
  };
  
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    is_public: {
      type: 'select',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.is_public.length > 0 ? dynamicOptions.is_public : undefined,
    },
    calories_range: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.calories_range.length > 0 ? dynamicOptions.calories_range : undefined,
    },
    protein_range: {
      type: 'multiselect',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.protein_range.length > 0 ? dynamicOptions.protein_range : undefined,
    },
  };
  
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      templates,
      NUTRITION_TEMPLATE_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      customFieldConfigs
    );
  }
  
  // Fallback to existing logic if columns not provided
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
      dynamicOptions: dynamicOptions.is_public,
      operators: ['is', 'isNot'],
    },
    {
      id: 'calories_range',
      label: 'טווח קלוריות',
      type: 'multiselect',
      dynamicOptions: dynamicOptions.calories_range,
      operators: ['is', 'isNot'],
    },
    {
      id: 'protein_range',
      label: 'טווח חלבון',
      type: 'multiselect',
      dynamicOptions: dynamicOptions.protein_range,
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
 * Now automatically includes all renderable columns as filterable
 */
export function getMeetingFilterFields<T>(
  meetings: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      meetings,
      MEETING_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      {}
    );
  }
  
  // Fallback to existing fields if columns not provided
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
    type: 'select',
    options: ['ILS', 'USD', 'EUR'],
    operators: ['is', 'isNot'],
  },
];

/**
 * Get filter fields for Payments table with dynamic options from data
 * Now automatically includes all renderable columns as filterable
 */
export function getPaymentFilterFields<T>(
  payments: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    // Filter out ID column from columns before generating filter fields
    const filteredColumns = columns.filter((col) => col.id !== 'id');
    const fields = generateFilterFieldsFromColumns(
      filteredColumns,
      payments,
      PAYMENT_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      {}
    );
    // Also filter out ID from the generated fields (in case it came from PAYMENT_FILTER_FIELDS)
    return fields.filter((field) => field.id !== 'id');
  }
  
  // Fallback to existing fields if columns not provided - exclude ID
  return PAYMENT_FILTER_FIELDS.filter((field) => field.id !== 'id').map(field => {
    // If we need dynamic options in the future, we can add them here
    // For now, return the base fields
    return field;
  });
}

/**
 * Get filter fields for Budgets table with dynamic options from data
 * Now automatically includes all renderable columns as filterable
 */
export function getBudgetFilterFields<T>(
  budgets: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      budgets,
      BUDGET_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      {}
    );
  }
  
  // Fallback to existing fields if columns not provided
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
 * Now automatically includes all renderable columns as filterable
 */
export function getSubscriptionTypeFilterFields<T>(
  subscriptionTypes: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  // If columns are provided, generate filter fields from them
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      subscriptionTypes,
      SUBSCRIPTION_TYPE_FILTER_FIELDS, // Merge with existing fields for backward compatibility
      {}
    );
  }
  
  // Fallback to existing fields if columns not provided
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











