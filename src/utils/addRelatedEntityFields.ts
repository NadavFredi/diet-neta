/**
 * Utility to add related entity fields and columns to any entity
 * This ensures all entities have access to their related entities for filtering, grouping, and column selection
 */

import type { FilterField } from '@/components/dashboard/TableFilter';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { getEntityRelationships } from './entityRelationships';

/**
 * Add related entity filter fields to base filter fields
 */
export function addRelatedEntityFilterFields<T>(
  entityName: string,
  baseFields: FilterField[],
  columns?: DataTableColumn<T>[],
  data?: T[]
): FilterField[] {
  const relationships = getEntityRelationships(entityName);
  if (relationships.length === 0) {
    return baseFields;
  }

  const relatedFields: FilterField[] = [];

  for (const relationship of relationships) {
    // Get columns for this relationship if available
    let entityColumns: DataTableColumn<any>[] | undefined;
    
    // Try to find columns that match this relationship's target table
    // This is a fallback - ideally columns should be passed explicitly
    if (columns) {
      // Look for columns that have this relationship's entity name in their meta
      entityColumns = columns.filter(
        col => col.meta?.relatedEntity === relationship.entityName
      );
    }

    const fields = relationship.getFilterFields(entityColumns, data as any[]);
    relatedFields.push(...fields.map(field => ({
      ...field,
      relatedEntity: relationship.entityName,
      relatedEntityLabel: relationship.label,
    })));
  }

  return [...baseFields, ...relatedFields];
}

/**
 * Add related entity columns to base columns
 */
export function addRelatedEntityColumns<T>(
  entityName: string,
  baseColumns: DataTableColumn<T>[],
  relationshipColumnsMap?: Record<string, DataTableColumn<any>[]>
): DataTableColumn<T>[] {
  const relationships = getEntityRelationships(entityName);
  if (relationships.length === 0) {
    return baseColumns;
  }

  const relatedColumns: DataTableColumn<T>[] = [];

  for (const relationship of relationships) {
    // Get columns for this relationship
    let entityColumns: DataTableColumn<any>[] | undefined;
    
    // First try the relationship columns map
    if (relationshipColumnsMap?.[relationship.entityName]) {
      entityColumns = relationshipColumnsMap[relationship.entityName];
    } else if (relationshipColumnsMap?.[relationship.targetTable]) {
      entityColumns = relationshipColumnsMap[relationship.targetTable];
    }

    const columns = relationship.getColumns(entityColumns);
    relatedColumns.push(...columns.map(col => ({
      ...col,
      meta: {
        ...col.meta,
        relatedEntity: relationship.entityName,
        relatedEntityLabel: relationship.label,
      },
    })) as DataTableColumn<T>[]);
  }

  return [...baseColumns, ...relatedColumns];
}
