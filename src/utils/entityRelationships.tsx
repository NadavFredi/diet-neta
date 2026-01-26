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
          return columns.map(col => {
            const originalCell = col.cell;
            return {
              ...col,
              id: `budget.${col.id}`,
              accessorFn: (row: any) => {
                // Access budget data through budget_assignments -> budgets
                const budget = row.budget_assignments?.[0]?.budgets;
                if (!budget) return null;
                return col.accessorKey ? budget[col.accessorKey] : (col.accessorFn ? col.accessorFn(budget) : null);
              },
              cell: originalCell ? (props: any) => {
                // Create a modified row object where original points to the budget
                const budget = props.row.original.budget_assignments?.[0]?.budgets;
                if (!budget) {
                  // If no budget, show empty
                  return <span className="text-gray-400">-</span>;
                }
                // Create a modified props object with budget as the original
                const modifiedProps = {
                  ...props,
                  row: {
                    ...props.row,
                    original: budget, // Point to budget instead of lead
                  },
                  getValue: () => {
                    // Try to get value from budget using the accessorKey
                    if (col.accessorKey) {
                      return budget[col.accessorKey];
                    }
                    // If there's an accessorFn, use it
                    if (col.accessorFn) {
                      return col.accessorFn(budget);
                    }
                    return null;
                  },
                };
                return originalCell(modifiedProps);
              } : undefined,
            };
          });
        }
        // Fallback: key budget columns
        return [
          {
            id: 'budget.name',
            header: 'שם תכנית פעולה',
            accessorFn: (row: any) => {
              // Try multiple ways to access the budget name
              const budgetAssignments = row.budget_assignments;
              if (budgetAssignments && Array.isArray(budgetAssignments) && budgetAssignments.length > 0) {
                const budget = budgetAssignments[0]?.budgets;
                if (budget && budget.name) {
                  return budget.name;
                }
              }
              // Fallback: check if it's in a flattened format
              if (row.budget_name) {
                return row.budget_name;
              }
              return null;
            },
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 180,
            meta: { align: 'right' },
            cell: ({ getValue, row }) => {
              const value = getValue() as string | null | undefined;
              // Also try direct access as fallback
              const directValue = row.original.budget_assignments?.[0]?.budgets?.name || 
                                  row.original.budget_name ||
                                  value;
              if (!directValue || directValue.trim() === '') return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900 font-medium">{directValue}</span>;
            },
          },
          {
            id: 'budget.steps_goal',
            header: 'יעד צעדים',
            accessorFn: (row: any) => {
              // Try multiple ways to access the steps_goal
              const budgetAssignments = row.budget_assignments;
              if (budgetAssignments && Array.isArray(budgetAssignments) && budgetAssignments.length > 0) {
                const budget = budgetAssignments[0]?.budgets;
                if (budget && budget.steps_goal !== undefined && budget.steps_goal !== null) {
                  return budget.steps_goal;
                }
              }
              // Fallback: check if it's in a flattened format
              if (row.budget_steps_goal !== undefined && row.budget_steps_goal !== null) {
                return row.budget_steps_goal;
              }
              return null;
            },
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 120,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue, row }) => {
              const value = getValue() as number | null | undefined;
              // Also try direct access as fallback
              const directValue = row.original.budget_assignments?.[0]?.budgets?.steps_goal || 
                                  row.original.budget_steps_goal;
              const finalValue = value !== null && value !== undefined ? value : directValue;
              if (!finalValue || finalValue === 0) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{Number(finalValue).toLocaleString()}</span>;
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
          return columns.map(col => {
            const originalCell = col.cell;
            return {
              ...col,
              id: `menu.${col.id}`,
              accessorFn: (row: any) => {
                // Access nutrition template through budget_assignments -> budgets -> nutrition_templates
                const budget = row.budget_assignments?.[0]?.budgets;
                const nutritionTemplate = budget?.nutrition_templates;
                
                // For targets column, also check nutrition_targets directly on budget
                if (col.accessorKey === 'targets') {
                  return nutritionTemplate?.targets || budget?.nutrition_targets || null;
                }
                
                if (!nutritionTemplate) return null;
                return col.accessorKey ? nutritionTemplate[col.accessorKey] : (col.accessorFn ? col.accessorFn(nutritionTemplate) : null);
              },
              cell: originalCell ? (props: any) => {
                // Get budget and nutrition template from the lead's budget_assignments
                const budget = props.row.original.budget_assignments?.[0]?.budgets;
                const nutritionTemplate = budget?.nutrition_templates;
                const nutritionTargets = budget?.nutrition_targets;
                
                // For targets column, merge both sources
                if (col.accessorKey === 'targets') {
                  const targets = nutritionTemplate?.targets || nutritionTargets;
                  if (!targets) {
                    return <span className="text-sm text-gray-400">—</span>;
                  }
                  
                  // Create modified props with targets
                  const modifiedProps = {
                    ...props,
                    row: {
                      ...props.row,
                      original: {
                        targets: targets,
                        // Also include individual values for backward compatibility
                        calories_value: targets?.calories,
                        protein_value: targets?.protein,
                        carbs_value: targets?.carbs,
                        fat_value: targets?.fat,
                      },
                    },
                    getValue: () => targets,
                  };
                  return originalCell(modifiedProps);
                }
                
                // For other columns, use nutrition template
                if (!nutritionTemplate) {
                  return <span className="text-gray-400">-</span>;
                }
                
                // Create a modified props object with nutrition template as the original
                const modifiedProps = {
                  ...props,
                  row: {
                    ...props.row,
                    original: nutritionTemplate,
                  },
                  getValue: () => {
                    // Try to get value from nutrition template using the accessorKey
                    if (col.accessorKey) {
                      return nutritionTemplate[col.accessorKey] || null;
                    }
                    // If there's an accessorFn, use it
                    if (col.accessorFn) {
                      return col.accessorFn(nutritionTemplate);
                    }
                    return null;
                  },
                };
                return originalCell(modifiedProps);
              } : undefined,
            };
          });
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
            id: 'menu.targets',
            header: 'מקרו-נוטריאנטים',
            accessorFn: (row: any) => {
              // Try nutrition_templates.targets first, then budget.nutrition_targets
              const budget = row.budget_assignments?.[0]?.budgets;
              return budget?.nutrition_templates?.targets || budget?.nutrition_targets || null;
            },
            enableSorting: true,
            enableResizing: true,
            enableHiding: false,
            size: 350,
            meta: { align: 'right' },
            cell: ({ row }) => {
              const budget = row.original.budget_assignments?.[0]?.budgets;
              const targets = budget?.nutrition_templates?.targets || budget?.nutrition_targets;
              
              if (!targets) {
                return <span className="text-sm text-gray-400">—</span>;
              }
              
              const calories = targets?.calories;
              const protein = targets?.protein;
              const carbs = targets?.carbs;
              const fat = targets?.fat;
              
              if (!calories && !protein && !carbs && !fat) {
                return <span className="text-sm text-gray-400">—</span>;
              }
              
              return (
                <div className="flex gap-2 flex-wrap">
                  {calories != null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {calories} קק״ל
                    </span>
                  )}
                  {protein != null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {protein}ג חלבון
                    </span>
                  )}
                  {carbs != null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                      {carbs}ג פחמימות
                    </span>
                  )}
                  {fat != null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      {fat}ג שומן
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            id: 'menu.calories',
            header: 'קלוריות',
            accessorFn: (row: any) => {
              const budget = row.budget_assignments?.[0]?.budgets;
              return budget?.nutrition_templates?.targets?.calories || budget?.nutrition_targets?.calories;
            },
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 100,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue, row }) => {
              const budget = row.original.budget_assignments?.[0]?.budgets;
              const value = budget?.nutrition_templates?.targets?.calories || budget?.nutrition_targets?.calories || getValue() as number;
              if (!value) return <span className="text-gray-400">-</span>;
              return <span className="text-gray-900">{value} קק״ל</span>;
            },
          },
          {
            id: 'menu.protein',
            header: 'חלבון',
            accessorFn: (row: any) => {
              const budget = row.budget_assignments?.[0]?.budgets;
              return budget?.nutrition_templates?.targets?.protein || budget?.nutrition_targets?.protein;
            },
            enableSorting: true,
            enableResizing: true,
            enableHiding: true,
            size: 100,
            meta: { align: 'right', isNumeric: true },
            cell: ({ getValue, row }) => {
              const budget = row.original.budget_assignments?.[0]?.budgets;
              const value = budget?.nutrition_templates?.targets?.protein || budget?.nutrition_targets?.protein || getValue() as number;
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
