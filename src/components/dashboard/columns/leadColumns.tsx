import { type ColumnDef } from '@tanstack/react-table';
import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate } from '@/utils/dashboard';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { getEntityRelationships } from '@/utils/entityRelationships.tsx';
import { budgetColumns } from '@/components/dashboard/BudgetsDataTable';
import { nutritionTemplateColumns } from '@/components/dashboard/columns/templateColumns';

/**
 * Strict column definitions for Leads table.
 * Only includes fields that exist on the Lead type.
 * TypeScript will error if any accessorKey doesn't exist on Lead.
 * 
 * Column order matches the default view (from right to left in RTL):
 * 1. createdDate, 2. name, 3. status, 4. age, 5. fitnessGoal,
 * 6. activityLevel, 7. preferredTime, 8. phone, 9. source, 10. notes
 * Hidden: id, email, height, weight
 */
export const leadColumns: DataTableColumn<Lead>[] = [
  {
    id: 'createdDate',
    header: 'תאריך יצירה',
    accessorKey: 'createdDate',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
      sortKey: 'created_at',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      try {
        return <span className="text-gray-600">{formatDate(value)}</span>;
      } catch {
        return <span className="text-gray-400">-</span>;
      }
    },
  },
  {
    id: 'name',
    header: 'שם',
    accessorFn: (row) => row.name || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
      sortKey: 'customer_name',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          {value}
        </span>
      );
    },
  },
  {
    id: 'status',
    header: 'סטטוס',
    accessorFn: (row) => row.status || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 140,
    meta: {
      align: 'right',
      sortKeys: ['status_sub', 'status_main'],
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'חדש':
            return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'בטיפול':
            return 'bg-amber-50 text-amber-700 border-amber-200';
          case 'הושלם':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          default:
            return 'bg-gray-50 text-gray-700 border-gray-200';
        }
      };
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(value)}`}
        >
          {value}
        </span>
      );
    },
  },
  {
    id: 'age',
    header: 'גיל',
    accessorFn: (row) => row.age ?? null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 100,
    meta: {
      align: 'right',
      isNumeric: true,
      sortKey: 'age',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null | undefined;
      if (value === null || value === undefined || value === 0) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-900">{value} שנים</span>;
    },
  },
  {
    id: 'fitnessGoal',
    header: 'מטרת כושר',
    accessorFn: (row) => row.fitnessGoal || row.fitness_goal || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
      sortKey: 'fitness_goal',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
          {value}
        </span>
      );
    },
  },
  {
    id: 'activityLevel',
    header: 'רמת פעילות',
    accessorFn: (row) => row.activityLevel || row.activity_level || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 140,
    meta: {
      align: 'right',
      sortKey: 'activity_level',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
          {value}
        </span>
      );
    },
  },
  {
    id: 'preferredTime',
    header: 'זמן מועדף',
    accessorFn: (row) => row.preferredTime || row.preferred_time || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
      sortKey: 'preferred_time',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
          {value}
        </span>
      );
    },
  },
  {
    id: 'phone',
    header: 'טלפון',
    accessorFn: (row) => row.phone || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
      sortKey: 'customer_phone',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return <span className="text-gray-600 font-mono text-sm">{value}</span>;
    },
  },
  {
    id: 'source',
    header: 'מקור',
    accessorFn: (row) => row.source || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
      sortKey: 'source',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
          {value}
        </span>
      );
    },
  },
  {
    id: 'notes',
    header: 'הערות',
    accessorFn: (row) => row.notes || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
      sortKey: 'notes',
    },
    cell: ({ row }) => {
      const notes = row.original.notes;
      if (!notes || notes.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="text-gray-600 text-xs italic" title={notes}>
          {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
        </span>
      );
    },
  },
  {
    id: 'steps',
    header: 'צעדים',
    accessorFn: (row) => {
      // Get steps_goal from the first active budget assignment
      const budgetAssignment = row.budget_assignments?.[0];
      const budget = budgetAssignment?.budgets;
      return budget?.steps_goal ?? row.dailyStepsGoal ?? null;
    },
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
      isNumeric: true,
      sortKey: 'budget.steps_goal',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null | undefined;
      if (value === null || value === undefined || value === 0) return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-medium border border-cyan-100">
          {value.toLocaleString()} צעדים
        </span>
      );
    },
  },
  {
    id: 'email',
    header: 'אימייל',
    accessorFn: (row) => row.email || null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 220,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value || value.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="text-gray-900 hover:text-blue-600 transition-colors text-sm">
          {value}
        </span>
      );
    },
  },
  {
    id: 'height',
    header: 'גובה (ס"מ)',
    accessorFn: (row) => row.height ?? null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
      isNumeric: true,
      sortKey: 'height',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null | undefined;
      if (value === null || value === undefined || value === 0) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-900">{value} ס"מ</span>;
    },
  },
  {
    id: 'weight',
    header: 'משקל (ק"ג)',
    accessorFn: (row) => row.weight ?? null,
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
      isNumeric: true,
      sortKey: 'weight',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null | undefined;
      if (value === null || value === undefined || value === 0) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-900 font-semibold">{value} ק"ג</span>;
    },
  },
];

/**
 * Get related entity columns for leads
 */
function getRelatedEntityColumns(): DataTableColumn<Lead>[] {
  const relationships = getEntityRelationships('leads');
  const relatedColumns: DataTableColumn<Lead>[] = [];
  
  for (const relationship of relationships) {
    let entityColumns: DataTableColumn<any>[] | undefined;
    
    // Map entity names to their column definitions
    if (relationship.entityName === 'budget') {
      entityColumns = budgetColumns;
    } else if (relationship.entityName === 'menu') {
      entityColumns = nutritionTemplateColumns;
    }
    
    const columns = relationship.getColumns(entityColumns);
    relatedColumns.push(...columns.map(col => ({
      ...col,
      meta: {
        ...col.meta,
        relatedEntity: relationship.entityName,
        relatedEntityLabel: relationship.label,
      },
    })));
  }
  
  return relatedColumns;
}

/**
 * All lead columns including related entity columns
 */
export const allLeadColumns: DataTableColumn<Lead>[] = [
  ...leadColumns,
  ...getRelatedEntityColumns(),
];

/**
 * Default column visibility for Leads table.
 * Only includes columns that exist in leadColumns.
 */
export const defaultLeadColumnVisibility: Record<string, boolean> = {
  name: true,
  status: true,
  phone: true,
  createdDate: true, // תאריך יצירה - visible by default
  // All other columns hidden by default
  age: false,
  height: false,
  weight: false,
  fitnessGoal: false,
  activityLevel: false,
  preferredTime: false,
  email: false,
  source: false,
  notes: false,
};















