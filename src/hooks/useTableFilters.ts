import { useState, useCallback } from 'react';
import type { FilterField, ActiveFilter, FilterGroup } from '@/components/dashboard/TableFilter';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { generateFilterFieldsFromColumns } from '@/utils/columnToFilterUtils';
import { 
  extractWorkoutTemplateFilterOptions, 
  extractNutritionTemplateFilterOptions,
  extractBudgetFilterOptions,
  extractCustomerFilterOptions,
  extractLeadFilterOptions
} from '@/utils/filterUtils';

export type { FilterField, ActiveFilter, FilterGroup };

export const useTableFilters = (initialFilters: ActiveFilter[] = []) => {
  const [filters, setFilters] = useState<ActiveFilter[]>(initialFilters);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>(undefined);

  const addFilter = useCallback((filter: ActiveFilter) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  const updateFilter = useCallback((updatedFilter: ActiveFilter) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === updatedFilter.id ? updatedFilter : f))
    );
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setFilterGroup(undefined);
  }, []);

  return {
    filters,
    filterGroup,
    setFilterGroup,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
  };
};

// --- Workout Templates ---
export function getWorkoutTemplateFilterFields<T>(
  templates: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const dynamicOptions = {
    goal_tags: extractWorkoutTemplateFilterOptions(templates as any, 'goal_tags'),
    is_public: extractWorkoutTemplateFilterOptions(templates as any, 'is_public'),
    has_leads: extractWorkoutTemplateFilterOptions(templates as any, 'has_leads'),
  };
  
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    goal_tags: {
      type: 'multiselect',
      operators: ['hasData', 'noData', 'contains', 'notContains'],
      dynamicOptions: dynamicOptions.goal_tags,
    },
    is_public: {
      type: 'select',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.is_public,
    },
    has_leads: {
      type: 'select',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.has_leads,
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      templates,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Nutrition Templates ---
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
      dynamicOptions: dynamicOptions.is_public,
    },
    'targets.calories': {
      type: 'select',
      label: 'טווח קלוריות',
      dynamicOptions: dynamicOptions.calories_range,
    },
    'targets.protein': {
      type: 'select',
      label: 'טווח חלבון',
      dynamicOptions: dynamicOptions.protein_range,
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      templates,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Supplement Templates ---
export const SUPPLEMENT_TEMPLATE_FILTER_FIELDS: FilterField[] = [
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
];

export function getSupplementTemplateFilterFields<T>(
  templates: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const dynamicOptions = {
    is_public: extractNutritionTemplateFilterOptions(templates as any, 'is_public'), // Reusing utility
  };
  
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    is_public: {
      type: 'select',
      operators: ['is', 'isNot'],
      dynamicOptions: dynamicOptions.is_public.length > 0 ? dynamicOptions.is_public : undefined,
    },
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      templates,
      SUPPLEMENT_TEMPLATE_FILTER_FIELDS,
      customFieldConfigs
    );
  }
  
  return SUPPLEMENT_TEMPLATE_FILTER_FIELDS;
}

// --- Subscription Types ---
export function getSubscriptionTypeFilterFields<T>(
  types: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    is_active: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['פעיל', 'לא פעיל'],
    },
    status: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['active', 'inactive', 'archived'],
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      types,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Payments ---
export function getPaymentFilterFields<T>(
  payments: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    status: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['paid', 'pending', 'failed', 'refunded'],
    },
    payment_method: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['credit_card', 'bit', 'transfer', 'cash'],
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      payments,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Meetings ---
export function getMeetingFilterFields<T>(
  meetings: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    status: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['scheduled', 'completed', 'cancelled', 'no_show'],
    },
    meeting_type: {
      type: 'select',
      operators: ['is', 'isNot'],
      // dynamic options will be extracted by generateFilterFieldsFromColumns
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      meetings,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Exercises ---
export function getExerciseFilterFields<T>(
  exercises: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    muscle_group: {
      type: 'select',
      operators: ['is', 'isNot'],
      // dynamic options extracted automatically
    },
    difficulty: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['beginner', 'intermediate', 'advanced'],
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      exercises,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Customers ---
export function getCustomerFilterFields<T>(
  customers: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    status: {
      type: 'select',
      operators: ['is', 'isNot'],
      options: ['active', 'inactive', 'lead'],
    },
    city: {
      type: 'select',
      operators: ['is', 'isNot'],
      // dynamic options extracted automatically
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      customers,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}

// --- Budgets ---
export function getBudgetFilterFields<T>(
  budgets: T[] = [],
  columns?: DataTableColumn<T>[]
): FilterField[] {
  const dynamicOptions = {
    workout_template_name: extractBudgetFilterOptions(budgets as any, 'workout_template_name'),
    nutrition_template_name: extractBudgetFilterOptions(budgets as any, 'nutrition_template_name'),
    steps_goal_range: extractBudgetFilterOptions(budgets as any, 'steps_goal_range'),
  };

  const customFieldConfigs: Record<string, Partial<FilterField>> = {
    'workout_template.name': {
      type: 'select',
      label: 'תבנית אימון',
      dynamicOptions: dynamicOptions.workout_template_name,
    },
    'nutrition_template.name': {
      type: 'select',
      label: 'תבנית תזונה',
      dynamicOptions: dynamicOptions.nutrition_template_name,
    },
    steps_goal: {
      type: 'select',
      label: 'יעד צעדים',
      dynamicOptions: dynamicOptions.steps_goal_range,
    }
  };
  
  if (columns && columns.length > 0) {
    return generateFilterFieldsFromColumns(
      columns,
      budgets,
      [],
      customFieldConfigs
    );
  }
  
  return [];
}
