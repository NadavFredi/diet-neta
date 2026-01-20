import type { ActiveFilter, FilterField } from '@/components/dashboard/TableFilter';

type ValueGetter<T> = (row: T, fieldId: string) => unknown;

const toDateOnlyString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
  }
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? null : num;
};

const toComparableStrings = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap(toComparableStrings);
  }
  if (typeof value === 'boolean') {
    return value
      ? ['true', 'כן', 'yes', '1']
      : ['false', 'לא', 'no', '0'];
  }
  if (typeof value === 'number') {
    return [String(value)];
  }
  return [String(value).toLowerCase()];
};

const matchesTextFilter = (filter: ActiveFilter, rawValue: unknown) => {
  const value = String(rawValue ?? '').toLowerCase();
  const needle = (filter.values[0] || '').toLowerCase();
  switch (filter.operator) {
    case 'contains':
      return value.includes(needle);
    case 'notContains':
      return !value.includes(needle);
    case 'equals':
      return value === needle;
    case 'notEquals':
      return value !== needle;
    default:
      return true;
  }
};

const matchesNumberFilter = (filter: ActiveFilter, rawValue: unknown) => {
  const value = toNumber(rawValue);
  const target = toNumber(filter.values[0]);
  if (value === null || target === null) return false;
  switch (filter.operator) {
    case 'equals':
      return value === target;
    case 'notEquals':
      return value !== target;
    case 'greaterThan':
      return value > target;
    case 'lessThan':
      return value < target;
    default:
      return true;
  }
};

const matchesDateFilter = (filter: ActiveFilter, rawValue: unknown) => {
  const value = toDateOnlyString(rawValue);
  if (!value) return false;
  switch (filter.operator) {
    case 'equals':
      return value === filter.values[0];
    case 'before':
      return value < filter.values[0];
    case 'after':
      return value > filter.values[0];
    case 'between':
      return !!filter.values[0] && !!filter.values[1] && value >= filter.values[0] && value <= filter.values[1];
    default:
      return true;
  }
};

const matchesSelectFilter = (filter: ActiveFilter, rawValue: unknown) => {
  const valueOptions = toComparableStrings(rawValue);
  const targetOptions = filter.values.map((val) => val.toLowerCase());
  const hasMatch = targetOptions.some((target) => valueOptions.includes(target));
  if (filter.operator === 'isNot') {
    return !hasMatch;
  }
  return hasMatch;
};

const matchesFilter = (filter: ActiveFilter, field: FilterField | undefined, rawValue: unknown) => {
  if (!field) return true;
  switch (field.type) {
    case 'text':
      return matchesTextFilter(filter, rawValue);
    case 'number':
      return matchesNumberFilter(filter, rawValue);
    case 'date':
      return matchesDateFilter(filter, rawValue);
    case 'select':
    case 'multiselect':
      return matchesSelectFilter(filter, rawValue);
    default:
      return true;
  }
};

export const applyTableFilters = <T>(
  rows: T[],
  filters: ActiveFilter[],
  fields: FilterField[],
  getValue?: ValueGetter<T>
): T[] => {
  if (!filters || filters.length === 0) return rows;
  const fieldMap = new Map(fields.map((field) => [field.id, field]));

  return rows.filter((row) =>
    filters.every((filter) => {
      const field = fieldMap.get(filter.fieldId);
      const rawValue = getValue ? getValue(row, filter.fieldId) : (row as any)[filter.fieldId];
      return matchesFilter(filter, field, rawValue);
    })
  );
};
