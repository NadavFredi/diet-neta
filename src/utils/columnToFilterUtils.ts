/**
 * Utility to automatically generate FilterField entries from DataTableColumn definitions
 * 
 * This ensures that any column that can be rendered is also filterable.
 */

import type { DataTableColumn } from '@/components/ui/DataTable';
import type { FilterField, FilterOperator } from '@/components/dashboard/TableFilter';

const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  select: ['is', 'isNot'],
  multiselect: ['is', 'isNot'],
  date: ['equals', 'before', 'after', 'between'],
  number: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  text: ['contains', 'notContains', 'equals', 'notEquals'],
};

/**
 * Determines the filter type for a column based on its metadata and data
 */
function inferFilterType<T>(
  column: DataTableColumn<T>,
  data: T[] = []
): 'text' | 'number' | 'date' | 'select' | 'multiselect' {
  // Check column id for common patterns
  const columnId = column.id.toLowerCase();
  
  // Date patterns
  if (
    columnId.includes('date') ||
    columnId.includes('created') ||
    columnId.includes('updated') ||
    columnId.includes('meeting_date') ||
    columnId.includes('birth')
  ) {
    return 'date';
  }
  
  // Number patterns
  if (column.meta?.isNumeric) {
    return 'number';
  }
  
  if (
    columnId.includes('age') ||
    columnId.includes('weight') ||
    columnId.includes('height') ||
    columnId.includes('count') ||
    columnId.includes('amount') ||
    columnId.includes('total') ||
    columnId.includes('steps') ||
    columnId.includes('price') ||
    columnId.includes('leads') ||
    columnId.includes('spent') ||
    columnId.includes('goal')
  ) {
    return 'number';
  }
  
  // Check actual data types if data is provided
  if (data.length > 0 && column.accessorKey) {
    const sampleValues = data
      .slice(0, 10)
      .map(row => (row as any)[column.accessorKey!])
      .filter(val => val !== null && val !== undefined);
    
    if (sampleValues.length > 0) {
      const firstValue = sampleValues[0];
      
      // Check if it's a number
      if (typeof firstValue === 'number') {
        return 'number';
      }
      
      // Check if it's a date string
      if (typeof firstValue === 'string') {
        // Check if it looks like a date (ISO format or common date patterns)
        const datePattern = /^\d{4}-\d{2}-\d{2}/; // ISO date pattern
        if (datePattern.test(firstValue) || !isNaN(Date.parse(firstValue))) {
          return 'date';
        }
      }
      
      // Check if values are limited (likely a select)
      const uniqueValues = new Set(sampleValues.map(v => String(v)));
      // If we have relatively few unique values (less than 20), treat as select/multiselect
      if (uniqueValues.size > 0 && uniqueValues.size <= 20 && sampleValues.length >= uniqueValues.size) {
        // If all samples are unique, probably text. Otherwise, probably select
        return uniqueValues.size === sampleValues.length ? 'text' : 'multiselect';
      }
    }
  }
  
  // Special cases for known multiselect/select fields
  if (
    columnId === 'status' ||
    columnId === 'fitnessgoal' ||
    columnId === 'activitylevel' ||
    columnId === 'preferredtime' ||
    columnId === 'source' ||
    columnId === 'tags' ||
    columnId === 'goal_tags' ||
    columnId === 'is_public' ||
    columnId === 'membership_tier' ||
    columnId === 'currency' ||
    columnId === 'has_leads'
  ) {
    // For boolean-like fields, use select
    if (columnId === 'is_public' || columnId === 'has_leads') {
      return 'select';
    }
    return 'multiselect';
  }
  
  // Default to text
  return 'text';
}

/**
 * Gets the column header as a string
 */
function getColumnHeader<T>(column: DataTableColumn<T>): string {
  if (typeof column.header === 'string') {
    return column.header;
  }
  // If it's a function, we can't call it here, so fallback to id
  return column.id;
}

/**
 * Extracts unique values from data for a column (for select/multiselect filters)
 */
function extractColumnValues<T>(
  column: DataTableColumn<T>,
  data: T[]
): string[] {
  if (!column.accessorKey || data.length === 0) {
    return [];
  }
  
  const valueSet = new Set<string>();
  
  data.forEach(row => {
    let value: any;
    
    if (column.accessorKey) {
      value = (row as any)[column.accessorKey];
    } else if (column.accessorFn) {
      value = column.accessorFn(row);
    } else {
      return;
    }
    
    // Handle different value types
    if (value === null || value === undefined) {
      return;
    }
    
    if (Array.isArray(value)) {
      // For array values (like tags), add each item
      value.forEach((item: any) => {
        if (item !== null && item !== undefined) {
          valueSet.add(String(item));
        }
      });
    } else {
      valueSet.add(String(value));
    }
  });
  
  return Array.from(valueSet).sort();
}

/**
 * Creates a FilterField from a DataTableColumn
 */
function columnToFilterField<T>(
  column: DataTableColumn<T>,
  data: T[] = [],
  customConfig?: Partial<FilterField>
): FilterField | null {
  // Skip columns that shouldn't be filterable
  // Skip action columns, selection columns, and columns explicitly marked as non-filterable
  if (
    column.id === 'actions' ||
    column.id === '__select__' ||
    column.id === 'select' ||
    column.meta?.isSelection === true
  ) {
    return null;
  }
  
  // Only include columns that can be rendered (enableHiding !== false)
  // If enableHiding is undefined, assume it can be hidden/filtered
  if (column.enableHiding === false) {
    return null;
  }
  
  // If column doesn't have an accessor, we can't filter it
  if (!column.accessorKey && !column.accessorFn) {
    return null;
  }
  
  const filterType = inferFilterType(column, data);
  const header = getColumnHeader(column);
  
  // Determine operators
  let operators: FilterOperator[] = DEFAULT_OPERATORS[filterType] || DEFAULT_OPERATORS.text;
  
  // Extract options for select/multiselect
  let options: string[] | undefined;
  let dynamicOptions: string[] | undefined;
  
  if (filterType === 'select' || filterType === 'multiselect') {
    const extractedValues = extractColumnValues(column, data);
    if (extractedValues.length > 0) {
      dynamicOptions = extractedValues;
    }
    // Don't set static options - rely on dynamic options or custom config
  }
  
  // Build the filter field
  const filterField: FilterField = {
    id: column.id,
    label: header,
    type: filterType,
    operators,
    ...(options && { options }),
    ...(dynamicOptions && { dynamicOptions }),
    ...customConfig, // Allow custom config to override anything
  };
  
  return filterField;
}

/**
 * Generates filter fields from column definitions
 * 
 * @param columns - Array of DataTableColumn definitions
 * @param data - Optional data array to infer types and extract values
 * @param existingFields - Optional existing filter fields to merge with
 * @param customFieldConfigs - Optional map of column id -> custom filter field config
 * 
 * @returns Array of FilterField entries
 */
export function generateFilterFieldsFromColumns<T>(
  columns: DataTableColumn<T>[],
  data: T[] = [],
  existingFields: FilterField[] = [],
  customFieldConfigs?: Record<string, Partial<FilterField>>
): FilterField[] {
  // Create a map of existing fields by id for quick lookup
  const existingFieldsMap = new Map<string, FilterField>();
  existingFields.forEach(field => {
    existingFieldsMap.set(field.id, field);
  });
  
  // Generate filter fields from columns
  const generatedFields: FilterField[] = [];
  
  columns.forEach(column => {
    // Skip if already exists in existing fields
    if (existingFieldsMap.has(column.id)) {
      // Use existing field but update with any custom config
      const existingField = existingFieldsMap.get(column.id)!;
      const customConfig = customFieldConfigs?.[column.id];
      if (customConfig) {
        generatedFields.push({ ...existingField, ...customConfig });
      } else {
        generatedFields.push(existingField);
      }
      return;
    }
    
    // Generate new field from column
    const customConfig = customFieldConfigs?.[column.id];
    const filterField = columnToFilterField(column, data, customConfig);
    
    if (filterField) {
      generatedFields.push(filterField);
    }
  });
  
  // Add any existing fields that don't have corresponding columns
  // (for backward compatibility with custom filter fields)
  existingFields.forEach(field => {
    if (!columns.some(col => col.id === field.id)) {
      generatedFields.push(field);
    }
  });
  
  return generatedFields;
}
