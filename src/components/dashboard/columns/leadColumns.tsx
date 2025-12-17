import { type ColumnDef } from '@tanstack/react-table';
import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate } from '@/utils/dashboard';
import type { DataTableColumn } from '@/components/ui/DataTable';

/**
 * Strict column definitions for Leads table.
 * Only includes fields that exist on the Lead type.
 * TypeScript will error if any accessorKey doesn't exist on Lead.
 * 
 * Column order matches the default view (from right to left in RTL):
 * 1. createdDate, 2. name, 3. status, 4. age, 5. birthDate, 6. fitnessGoal,
 * 7. activityLevel, 8. preferredTime, 9. phone, 10. source, 11. notes
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
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="text-gray-600">{formatDate(value)}</span>;
    },
  },
  {
    id: 'name',
    header: 'שם',
    accessorKey: 'name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'status',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 140,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'age',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 100,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return <span className="text-gray-900">{value} שנים</span>;
    },
  },
  {
    id: 'birthDate',
    header: 'תאריך לידה',
    accessorKey: 'birthDate',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="text-gray-600">{formatDate(value)}</span>;
    },
  },
  {
    id: 'fitnessGoal',
    header: 'מטרת כושר',
    accessorKey: 'fitnessGoal',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'activityLevel',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 140,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'preferredTime',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'phone',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="text-gray-600 font-mono text-sm">{value}</span>;
    },
  },
  {
    id: 'source',
    header: 'מקור',
    accessorKey: 'source',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'notes',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const notes = row.original.notes;
      if (!notes) return <span className="text-gray-400">-</span>;
      return (
        <span className="text-gray-600 text-xs italic" title={notes}>
          {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
        </span>
      );
    },
  },
  // Hidden columns (placed at the end)
  {
    id: 'id',
    header: 'מזהה',
    accessorKey: 'id',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 90,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
          {value}
        </span>
      );
    },
  },
  {
    id: 'email',
    header: 'אימייל',
    accessorKey: 'email',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 220,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
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
    accessorKey: 'height',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return <span className="text-gray-900">{value} ס"מ</span>;
    },
  },
  {
    id: 'weight',
    header: 'משקל (ק"ג)',
    accessorKey: 'weight',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return <span className="text-gray-900 font-semibold">{value} ק"ג</span>;
    },
  },
];

/**
 * Default column visibility for Leads table.
 * Only includes columns that exist in leadColumns.
 */
export const defaultLeadColumnVisibility: Record<string, boolean> = {
  id: true,
  name: true,
  status: true,
  phone: true,
  // All other columns hidden by default
  age: false,
  birthDate: false,
  height: false,
  weight: false,
  fitnessGoal: false,
  activityLevel: false,
  preferredTime: false,
  createdDate: false,
  email: false,
  source: false,
  notes: false,
};






