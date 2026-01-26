import React, { useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate } from '@/utils/dashboard';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { getEntityRelationships } from '@/utils/entityRelationships.tsx';
import { budgetColumns } from '@/components/dashboard/BudgetsDataTable';
import { nutritionTemplateColumns } from '@/components/dashboard/columns/templateColumns';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchCustomerNotes, 
  selectCustomerNotes, 
  selectIsLoadingNotes,
  type CustomerNote 
} from '@/store/slices/leadViewSlice';

/**
 * NotesCell Component - Displays customer notes from customer_notes table
 * Similar to CustomerNotesSidebar but in a compact table cell format
 */
const NotesCell: React.FC<{ lead: Lead }> = ({ lead }) => {
  const dispatch = useAppDispatch();
  const customerId = lead.customerId;
  
  // Create memoized selectors
  const customerNotesSelector = useMemo(
    () => selectCustomerNotes(customerId || ''),
    [customerId]
  );
  const isLoadingNotesSelector = useMemo(
    () => selectIsLoadingNotes(customerId || ''),
    [customerId]
  );
  
  const notes = useAppSelector(customerNotesSelector);
  const isLoading = useAppSelector(isLoadingNotesSelector);
  
  // Fetch notes if customerId exists and notes aren't loaded
  useEffect(() => {
    if (customerId && notes === undefined && !isLoading) {
      dispatch(fetchCustomerNotes(customerId));
    }
  }, [customerId, notes, isLoading, dispatch]);
  
  // If no customerId, show legacy notes field or empty
  if (!customerId) {
    const legacyNotes = lead.notes;
    if (!legacyNotes || legacyNotes.trim() === '') {
      return <span className="text-gray-400">-</span>;
    }
    return (
      <span className="text-gray-600 text-xs italic" title={legacyNotes}>
        {legacyNotes.length > 30 ? `${legacyNotes.substring(0, 30)}...` : legacyNotes}
      </span>
    );
  }
  
  // If loading, show loading state
  if (isLoading) {
    return <span className="text-gray-400 text-xs">טוען...</span>;
  }
  
  // If no notes, show empty state
  if (!notes || notes.length === 0) {
    return <span className="text-gray-400">-</span>;
  }
  
  // Get the most recent note (notes are sorted by created_at desc)
  const mostRecentNote = notes[0];
  const noteContent = mostRecentNote.content || '';
  
  // Show count if there are multiple notes
  const notesCount = notes.length;
  const displayText = notesCount > 1 
    ? `${noteContent.substring(0, 25)}... (${notesCount})`
    : noteContent;
  
  // Truncate if too long
  const truncatedText = displayText.length > 30 
    ? `${displayText.substring(0, 30)}...` 
    : displayText;
  
  // Create tooltip with all notes
  const allNotesText = notes
    .map((note, idx) => `${idx + 1}. ${note.content}`)
    .join('\n');
  
  return (
    <span 
      className="text-gray-600 text-xs italic cursor-help" 
      title={allNotesText || noteContent}
    >
      {truncatedText}
    </span>
  );
};

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
    cell: ({ getValue, row }) => {
      const value = getValue() as string;
      // Also try direct access as fallback
      const directValue = row.original.createdDate || row.original.created_at || value;
      if (!directValue || directValue.trim() === '') return <span className="text-gray-400">-</span>;
      const formatted = formatDate(directValue);
      if (!formatted) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-600">{formatted}</span>;
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
      sortKey: 'customer_name',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-gray-400">-</span>;
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
      sortKeys: ['status_sub', 'status_main'],
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
      sortKey: 'age',
    },
    cell: ({ getValue, row }) => {
      const value = getValue() as number;
      // Also try direct access as fallback
      const directValue = row.original.age || value;
      if (!directValue || directValue === 0) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-900">{directValue} שנים</span>;
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
      sortKey: 'fitness_goal',
    },
    cell: ({ getValue, row }) => {
      const value = getValue() as string;
      // Also try direct access as fallback
      const directValue = row.original.fitnessGoal || value;
      if (!directValue || directValue.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
          {directValue}
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
      sortKey: 'activity_level',
    },
    cell: ({ getValue, row }) => {
      const value = getValue() as string;
      // Also try direct access as fallback
      const directValue = row.original.activityLevel || value;
      if (!directValue || directValue.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
          {directValue}
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
      sortKey: 'preferred_time',
    },
    cell: ({ getValue, row }) => {
      const value = getValue() as string;
      // Also try direct access as fallback
      const directValue = row.original.preferredTime || value;
      if (!directValue || directValue.trim() === '') return <span className="text-gray-400">-</span>;
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
          {directValue}
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
      sortKey: 'customer_phone',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-gray-400">-</span>;
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
      sortKey: 'source',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-gray-400">-</span>;
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
      sortKey: 'notes',
    },
    cell: ({ row }) => {
      return <NotesCell lead={row.original} />;
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
      if (!value) return <span className="text-gray-400">-</span>;
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
      sortKey: 'height',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      if (!value || value === 0) return <span className="text-gray-400">-</span>;
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
      sortKey: 'weight',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      if (!value || value === 0) return <span className="text-gray-400">-</span>;
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















