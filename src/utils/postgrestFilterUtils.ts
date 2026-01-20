import type { ActiveFilter, FilterGroup, FilterType } from '@/components/dashboard/TableFilter';
import { isFilterGroup } from '@/utils/filterGroupUtils';

type PostgrestOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'ilike' | 'in' | 'ov';

export interface PostgrestCondition {
  column: string;
  operator: PostgrestOperator;
  value: string | number | boolean | Array<string | number | boolean>;
  negate?: boolean;
}

export type FilterClause = PostgrestCondition[];
export type FilterDnf = FilterClause[];

export interface FieldFilterConfig {
  column?: string;
  type?: FilterType;
  isArray?: boolean;
  valueMap?: (value: string) => string | number | boolean;
  custom?: (filter: ActiveFilter, negate: boolean) => FilterDnf;
}

export type FilterFieldConfigMap = Record<string, FieldFilterConfig>;

const toBoolean = (value: string): boolean | string => {
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1', 'כן'].includes(normalized)) return true;
  if (['false', 'no', '0', 'לא'].includes(normalized)) return false;
  return value;
};

const resolveFilterDnf = (
  filter: ActiveFilter,
  negate: boolean,
  fieldConfigs: FilterFieldConfigMap
): FilterDnf => {
  const fieldConfig = fieldConfigs[filter.fieldId];
  if (fieldConfig?.custom) {
    return fieldConfig.custom(filter, negate);
  }

  const column = fieldConfig?.column || filter.fieldId;
  const type = fieldConfig?.type || filter.type;
  const isArray = fieldConfig?.isArray || false;
  const mapValue = fieldConfig?.valueMap || toBoolean;

  const value = filter.values[0];
  const values = filter.values.map(mapValue);

  const wrap = (condition: PostgrestCondition): FilterDnf => [[condition]];

  switch (type) {
    case 'text': {
      const needle = value ? `%${value}%` : '%';
      if (filter.operator === 'contains') {
        return wrap({ column, operator: 'ilike', value: needle, negate });
      }
      if (filter.operator === 'notContains') {
        return wrap({ column, operator: 'ilike', value: needle, negate: !negate });
      }
      if (filter.operator === 'equals') {
        return wrap({ column, operator: 'ilike', value: value || '', negate });
      }
      if (filter.operator === 'notEquals') {
        return wrap({ column, operator: 'ilike', value: value || '', negate: !negate });
      }
      return [];
    }
    case 'number': {
      if (filter.operator === 'equals') {
        return wrap({ column, operator: 'eq', value: Number(value), negate });
      }
      if (filter.operator === 'notEquals') {
        return wrap({ column, operator: 'eq', value: Number(value), negate: !negate });
      }
      if (filter.operator === 'greaterThan') {
        return wrap({ column, operator: 'gt', value: Number(value), negate });
      }
      if (filter.operator === 'lessThan') {
        return wrap({ column, operator: 'lt', value: Number(value), negate });
      }
      return [];
    }
    case 'date': {
      if (filter.operator === 'equals') {
        return wrap({ column, operator: 'eq', value, negate });
      }
      if (filter.operator === 'before') {
        return wrap({ column, operator: 'lt', value, negate });
      }
      if (filter.operator === 'after') {
        return wrap({ column, operator: 'gt', value, negate });
      }
      if (filter.operator === 'between') {
        const start = filter.values[0];
        const end = filter.values[1];
        if (!start || !end) return [];
        if (!negate) {
          return [[
            { column, operator: 'gte', value: start },
            { column, operator: 'lte', value: end },
          ]];
        }
        return [
          [{ column, operator: 'lt', value: start }],
          [{ column, operator: 'gt', value: end }],
        ];
      }
      return [];
    }
    case 'select':
    case 'multiselect': {
      if (isArray) {
        return wrap({
          column,
          operator: 'ov',
          value: values.length > 0 ? values : [],
          negate: filter.operator === 'isNot' ? !negate : negate,
        });
      }

      if (values.length > 1) {
        return wrap({
          column,
          operator: 'in',
          value: values,
          negate: filter.operator === 'isNot' ? !negate : negate,
        });
      }

      return wrap({
        column,
        operator: 'eq',
        value: values[0],
        negate: filter.operator === 'isNot' ? !negate : negate,
      });
    }
    default:
      return [];
  }
};

const combineAnd = (left: FilterDnf, right: FilterDnf): FilterDnf => {
  const result: FilterDnf = [];
  left.forEach((l) => {
    right.forEach((r) => {
      result.push([...l, ...r]);
    });
  });
  return result;
};

const combineOr = (left: FilterDnf, right: FilterDnf): FilterDnf => {
  return [...left, ...right];
};

const buildDnf = (
  node: FilterGroup | ActiveFilter,
  fieldConfigs: FilterFieldConfigMap,
  negate = false
): FilterDnf => {
  if (!isFilterGroup(node)) {
    return resolveFilterDnf(node, negate, fieldConfigs);
  }

  const nextNegate = !!node.not ? !negate : negate;

  const children = node.children || [];
  if (children.length === 0) return [];

  if (node.operator === 'and') {
    if (nextNegate) {
      return children.reduce<FilterDnf>((acc, child) => {
        const childDnf = buildDnf(child, fieldConfigs, true);
        return acc.length === 0 ? childDnf : combineOr(acc, childDnf);
      }, []);
    }

    return children.reduce<FilterDnf>((acc, child) => {
      const childDnf = buildDnf(child, fieldConfigs, false);
      return acc.length === 0 ? childDnf : combineAnd(acc, childDnf);
    }, []);
  }

  if (nextNegate) {
    return children.reduce<FilterDnf>((acc, child) => {
      const childDnf = buildDnf(child, fieldConfigs, true);
      return acc.length === 0 ? childDnf : combineAnd(acc, childDnf);
    }, []);
  }

  return children.reduce<FilterDnf>((acc, child) => {
    const childDnf = buildDnf(child, fieldConfigs, false);
    return acc.length === 0 ? childDnf : combineOr(acc, childDnf);
  }, []);
};

const formatPostgrestValue = (value: PostgrestCondition['value']): string => {
  if (Array.isArray(value)) {
    const formatted = value.map((item) => String(item));
    return `(${formatted.join(',')})`;
  }
  return String(value);
};

const toConditionString = (condition: PostgrestCondition): string => {
  const prefix = condition.negate ? 'not.' : '';
  if (condition.operator === 'in') {
    return `${condition.column}.${prefix}in.${formatPostgrestValue(condition.value)}`;
  }
  if (condition.operator === 'ov') {
    const values = Array.isArray(condition.value) ? `{${condition.value.map((val) => String(val)).join(',')}}` : `{${String(condition.value)}}`;
    return `${condition.column}.${prefix}ov.${values}`;
  }
  return `${condition.column}.${prefix}${condition.operator}.${formatPostgrestValue(condition.value)}`;
};

export const buildPostgrestOr = (
  group: FilterGroup | null | undefined,
  fieldConfigs: FilterFieldConfigMap = {}
): string | null => {
  if (!group || !group.children || group.children.length === 0) return null;
  const dnf = buildDnf(group, fieldConfigs);
  if (dnf.length === 0) return null;

  const clauses = dnf.map((clause) => {
    const conditions = clause.map(toConditionString);
    if (conditions.length === 1) {
      return conditions[0];
    }
    return `and(${conditions.join(',')})`;
  });

  return clauses.join(',');
};

export const applyFilterGroupToQuery = <TQuery>(
  query: TQuery,
  group: FilterGroup | null | undefined,
  fieldConfigs: FilterFieldConfigMap = {}
): TQuery => {
  const expression = buildPostgrestOr(group, fieldConfigs);
  if (!expression) return query;
  return (query as any).or(expression);
};

