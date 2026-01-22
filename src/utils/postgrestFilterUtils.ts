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
  // Related entity filtering
  relatedEntity?: string; // Entity name (e.g., 'subscription', 'budget')
  relatedPath?: string; // Path to the related field (e.g., 'budgets.name' or 'subscription_data->>months')
  joinType?: 'jsonb' | 'through' | 'direct'; // How to access the related entity
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

  // Handle related entity filtering
  let column = fieldConfig?.column || filter.fieldId;
  
  // If it's a related entity field, use the related path
  if (fieldConfig?.relatedPath) {
    column = fieldConfig.relatedPath;
  } else if (fieldConfig?.relatedEntity) {
    // Build the path based on join type
    const baseFieldId = filter.fieldId.split('.').slice(1).join('.');
    if (fieldConfig.joinType === 'jsonb') {
      // JSONB path: subscription_data->>'months'
      column = `${fieldConfig.relatedPath || `${fieldConfig.relatedEntity}_data`}->>'${baseFieldId}'`;
    } else if (fieldConfig.joinType === 'through') {
      // Through relationship: budgets.name (PostgREST nested filtering)
      column = `${fieldConfig.relatedEntity}.${baseFieldId}`;
    } else {
      // Direct relationship
      column = `${fieldConfig.relatedEntity}.${baseFieldId}`;
    }
  }

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
  
  // Handle null checks specially - PostgREST uses .is.null
  if (condition.value === null || condition.value === 'null') {
    if (condition.negate) {
      return `${condition.column}.not.is.null`;
    }
    return `${condition.column}.is.null`;
  }
  
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

/**
 * Apply filter group to query, handling related entity joins
 */
export const applyFilterGroupToQuery = <TQuery>(
  query: TQuery,
  group: FilterGroup | null | undefined,
  fieldConfigs: FilterFieldConfigMap = {},
  baseTable?: string
): TQuery => {
  if (!group || !group.children || group.children.length === 0) return query;

  // Check if we need to join related entities
  const needsJoin = Object.values(fieldConfigs).some(config => 
    config.relatedEntity && config.joinType === 'through'
  );

  // For related entity filtering through joins, we need to use PostgREST's nested filtering
  // This requires selecting related data and filtering on it
  if (needsJoin && baseTable) {
    // Collect all related entities that need to be joined
    const relatedEntities = new Set<string>();
    Object.values(fieldConfigs).forEach(config => {
      if (config.relatedEntity && config.joinType === 'through') {
        relatedEntities.add(config.relatedEntity);
      }
    });

    // For each related entity, we need to select it and filter on it
    // PostgREST handles this with nested select syntax
    relatedEntities.forEach(entity => {
      // This will be handled by the query builder when we use nested select
      // For now, we'll build the filter expression and let PostgREST handle it
    });
  }

  const expression = buildPostgrestOr(group, fieldConfigs);
  if (!expression) return query;
  return (query as any).or(expression);
};

