/**
 * Entity Relationship Configuration
 * 
 * Defines how entities are related to each other for nested filtering.
 * This allows filtering by related entities and their sub-filters.
 */

import type { FilterField } from '@/components/dashboard/TableFilter';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { generateFilterFieldsFromColumns } from '@/utils/columnToFilterUtils';

export interface EntityRelationship {
  /** The related entity name (e.g., 'subscription', 'budget', 'menu') */
  entityName: string;
  /** Display label for the relationship */
  label: string;
  /** How to join: 'direct' (FK), 'through' (junction table), 'jsonb' (JSONB field) */
  joinType: 'direct' | 'through' | 'jsonb';
  /** For 'direct': the foreign key column name */
  foreignKey?: string;
  /** For 'through': the junction table and columns */
  junctionTable?: string;
  junctionSourceColumn?: string;
  junctionTargetColumn?: string;
  /** For 'jsonb': the JSONB column and path */
  jsonbColumn?: string;
  jsonbPath?: string;
  /** The target table/view to query */
  targetTable: string;
  /** Filter fields available for this related entity - can be static or dynamic from columns */
  getFilterFields: (columns?: DataTableColumn<any>[], data?: any[]) => FilterField[];
  /** Columns available for this related entity - for displaying in table */
  getColumns: (columns?: DataTableColumn<any>[]) => DataTableColumn<any>[];
  /** Prefix for filter field IDs (e.g., 'subscription.' or 'budget.') */
  fieldPrefix: string;
  /** Optional: Column definitions for auto-generating filter fields */
  columns?: DataTableColumn<any>[];
}

/**
 * Entity relationships configuration
 * Maps entity names to their relationship definitions
 */
export const ENTITY_RELATIONSHIPS: Record<string, EntityRelationship[]> = {
  leads: [
    {
      entityName: 'subscription',
      label: 'מנוי',
      joinType: 'jsonb',
      jsonbColumn: 'subscription_data',
      targetTable: 'subscription_types',
      fieldPrefix: 'subscription.',
      getFilterFields: (columns, data) => {
        // Subscription fields from subscription_data JSONB
        // These are JSONB fields, so we define them manually
        return [
          {
            id: 'subscription.exists',
            label: 'יש מנוי',
            type: 'select',
            operators: ['is', 'isNot'],
            options: ['כן', 'לא'],
          },
          {
            id: 'subscription.months',
            label: 'חודשי מנוי',
            type: 'number',
            operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
          },
          {
            id: 'subscription.initialPrice',
            label: 'מחיר התחלתי',
            type: 'number',
            operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
          },
          {
            id: 'subscription.renewalPrice',
            label: 'מחיר חידוש',
            type: 'number',
            operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
          },
        ];
      },
      getColumns: () => {
        // Subscription columns from subscription_data JSONB
        return [
          {
            id: 'subscription.months',
            header: 'חודשי מנוי',
            accessorFn: (row: any) => row.subscription?.initialPackageMonths || row.subscription_months,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 120,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{value} חודשים</span>;
            },
          },
          {
            id: 'subscription.initialPrice',
            header: 'מחיר התחלתי',
            accessorFn: (row: any) => row.subscription?.initialPrice || row.subscription_initial_price,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 130,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">₪{value.toLocaleString()}</span>;
            },
          },
          {
            id: 'subscription.renewalPrice',
            header: 'מחיר חידוש',
            accessorFn: (row: any) => row.subscription?.monthlyRenewalPrice || row.subscription_renewal_price,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 130,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">₪{value.toLocaleString()}</span>;
            },
          },
        ];
      },
    },
    {
      entityName: 'budget',
      label: 'תכנית פעולה',
      joinType: 'through',
      junctionTable: 'budget_assignments',
      junctionSourceColumn: 'lead_id',
      junctionTargetColumn: 'budget_id',
      targetTable: 'budgets',
      fieldPrefix: 'budget.',
      getFilterFields: (columns, data) => {
        const fields: FilterField[] = [];
        
        // Add "entity exists" filter first
        fields.push({
          id: 'budget.exists',
          label: 'יש תכנית פעולה',
          type: 'select',
          operators: ['is', 'isNot'],
          options: ['כן', 'לא'],
        });
        
        // Budget fields - auto-generated from columns if provided, otherwise fallback to manual
        if (columns && columns.length > 0) {
          const generatedFields = generateFilterFieldsFromColumns(columns, data || []);
          // Add prefix to all field IDs
          fields.push(...generatedFields.map(field => ({
            ...field,
            id: `budget.${field.id}`,
          })));
        } else {
          // Fallback: manual fields (for backward compatibility)
          fields.push(
            {
              id: 'budget.name',
              label: 'שם תכנית פעולה',
              type: 'text',
              operators: ['contains', 'notContains', 'equals', 'notEquals'],
            },
            {
              id: 'budget.steps_goal',
              label: 'יעד צעדים',
              type: 'number',
              operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
            },
            {
              id: 'budget.is_public',
              label: 'תכנית פעולה ציבורית',
              type: 'select',
              operators: ['is', 'isNot'],
            }
          );
        }
        
        return fields;
      },
      getColumns: (columns) => {
        // Budget columns - use provided columns or fallback to key fields
        if (columns && columns.length > 0) {
          return columns.map(col => ({
            ...col,
            id: `budget.${col.id}`,
            accessorFn: (row: any) => {
              // Access budget data through budget_assignments -> budgets
              const budget = row.budget_assignments?.[0]?.budgets;
              if (!budget) return null;
              return col.accessorKey ? budget[col.accessorKey] : (col.accessorFn ? col.accessorFn(budget) : null);
            },
          }));
        }
        // Fallback: key budget columns
        return [
          {
            id: 'budget.name',
            header: 'שם תכנית פעולה',
            accessorFn: (row: any) => row.budget_assignments?.[0]?.budgets?.name,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 180,
            meta: { align: 'right' },
            cell: ({ getValue }) => {
              const value = getValue() as string;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900 font-medium">{value}</span>;
            },
          },
          {
            id: 'budget.steps_goal',
            header: 'יעד צעדים',
            accessorFn: (row: any) => row.budget_assignments?.[0]?.budgets?.steps_goal,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 120,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{value.toLocaleString()}</span>;
            },
          },
        ];
      },
    },
    {
      entityName: 'menu',
      label: 'תפריט',
      joinType: 'through',
      junctionTable: 'budget_assignments',
      junctionSourceColumn: 'lead_id',
      junctionTargetColumn: 'budget_id',
      targetTable: 'budgets',
      fieldPrefix: 'menu.',
      getFilterFields: (columns, data) => {
        const fields: FilterField[] = [];
        
        // Add "entity exists" filter first
        fields.push({
          id: 'menu.exists',
          label: 'יש תפריט',
          type: 'select',
          operators: ['is', 'isNot'],
          options: ['כן', 'לא'],
        });
        
        // Menu fields come from budgets -> nutrition_templates
        // Auto-generated from nutrition template columns if provided
        if (columns && columns.length > 0) {
          const generatedFields = generateFilterFieldsFromColumns(columns, data || []);
          // Add prefix to all field IDs
          fields.push(...generatedFields.map(field => ({
            ...field,
            id: `menu.${field.id}`,
          })));
        } else {
          // Fallback: manual fields (for backward compatibility)
          fields.push(
            {
              id: 'menu.nutrition_template_name',
              label: 'שם תבנית תזונה',
              type: 'text',
              operators: ['contains', 'notContains', 'equals', 'notEquals'],
            },
            {
              id: 'menu.calories',
              label: 'קלוריות',
              type: 'number',
              operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
            },
            {
              id: 'menu.protein',
              label: 'חלבון',
              type: 'number',
              operators: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
            }
          );
        }
        
        return fields;
      },
      getColumns: (columns) => {
        // Menu columns come from budgets -> nutrition_templates
        if (columns && columns.length > 0) {
          return columns.map(col => ({
            ...col,
            id: `menu.${col.id}`,
            accessorFn: (row: any) => {
              // Access nutrition template through budget_assignments -> budgets -> nutrition_templates
              const nutritionTemplate = row.budget_assignments?.[0]?.budgets?.nutrition_templates;
              if (!nutritionTemplate) return null;
              return col.accessorKey ? nutritionTemplate[col.accessorKey] : (col.accessorFn ? col.accessorFn(nutritionTemplate) : null);
            },
          }));
        }
        // Fallback: key menu columns
        return [
          {
            id: 'menu.nutrition_template_name',
            header: 'שם תבנית תזונה',
            accessorFn: (row: any) => row.budget_assignments?.[0]?.budgets?.nutrition_templates?.name,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 200,
            meta: { align: 'right' },
            cell: ({ getValue }) => {
              const value = getValue() as string;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900 font-medium">{value}</span>;
            },
          },
          {
            id: 'menu.calories',
            header: 'קלוריות',
            accessorFn: (row: any) => row.budget_assignments?.[0]?.budgets?.nutrition_templates?.targets?.calories,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 100,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{value} קק״ל</span>;
            },
          },
          {
            id: 'menu.protein',
            header: 'חלבון',
            accessorFn: (row: any) => row.budget_assignments?.[0]?.budgets?.nutrition_templates?.targets?.protein,
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 100,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue }) => {
              const value = getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{value}ג</span>;
            },
          },
        ];
      },
    },
  ],
};

/**
 * Get all related entity relationships for a given entity
 */
export function getEntityRelationships(entityName: string): EntityRelationship[] {
  return ENTITY_RELATIONSHIPS[entityName] || [];
}

/**
 * Check if a filter field ID belongs to a related entity
 */
export function isRelatedEntityField(fieldId: string): boolean {
  return fieldId.includes('.');
}

/**
 * Extract the entity prefix from a field ID
 */
export function extractEntityPrefix(fieldId: string): string | null {
  const parts = fieldId.split('.');
  return parts.length > 1 ? parts[0] : null;
}

/**
 * Get the base field ID (without entity prefix)
 */
export function getBaseFieldId(fieldId: string): string {
  const parts = fieldId.split('.');
  return parts.length > 1 ? parts.slice(1).join('.') : fieldId;
}
