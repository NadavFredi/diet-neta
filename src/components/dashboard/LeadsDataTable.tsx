import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Lead } from '@/store/slices/dashboardSlice';
import { leadColumns } from './columns/leadColumns';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadsDataTableProps {
  leads: Lead[];
  columnVisibility: ColumnVisibility;
  enableColumnVisibility?: boolean;
}

export const LeadsDataTable = ({ leads, columnVisibility, enableColumnVisibility = true }: LeadsDataTableProps) => {
  const navigate = useNavigate();

  // CRITICAL: Pass ALL columns from schema to DataTable
  // This ensures the column visibility popover shows ONLY Lead columns (not Customer or Template columns)
  const columns = useMemo(() => {
    return leadColumns;
  }, []);

  // Convert Redux ColumnVisibility to DataTable's VisibilityState format
  // This syncs Redux state with DataTable's internal state
  const initialVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    leadColumns.forEach((col) => {
      // Map Redux columnVisibility to DataTable visibility state
      visibility[col.id] = columnVisibility[col.id] !== false;
    });
    return visibility;
  }, [columnVisibility]);

  // Default column order matching the image (from right to left in RTL)
  // Order: createdDate, name, status, age, birthDate, fitnessGoal, activityLevel, preferredTime, phone, source, notes
  // Hidden columns (id, email, height, weight) are placed at the end
  const initialColumnOrder = useMemo(() => {
    return [
      'createdDate',  // תאריך יצירה
      'name',         // שם
      'status',       // סטטוס
      'age',          // גיל
      'birthDate',    // תאריך לידה
      'fitnessGoal',  // מטרת כושר
      'activityLevel', // רמת פעילות
      'preferredTime', // זמן מועדף
      'phone',        // טלפון
      'source',       // מקור
      'notes',        // הערות
      // Hidden columns at the end
      'id',
      'email',
      'height',
      'weight',
    ];
  }, []);

  const handleRowClick = (lead: Lead) => {
    navigate(`/leads/${lead.id}`);
  };

  return (
    <DataTable
      data={leads}
      columns={columns} // Pass ALL Lead columns - popover will show only these
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו תוצאות"
      enableColumnVisibility={enableColumnVisibility}
      enableColumnReordering={true}
      resourceKey="leads"
      initialColumnVisibility={initialVisibility} // Used only for initial Redux initialization
      initialColumnOrder={initialColumnOrder} // Used only for initial Redux initialization
    />
  );
};


