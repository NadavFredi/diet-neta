import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Lead } from '@/store/slices/dashboardSlice';
import { allLeadColumns } from './columns/leadColumns';
import { useAppSelector } from '@/store/hooks';

interface LeadsDataTableProps {
  leads: Lead[];
  enableColumnVisibility?: boolean;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  totalCount?: number;
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const LeadsDataTable = ({ 
  leads, 
  enableColumnVisibility = true, 
  onSortChange,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  totalCount,
  onBulkDelete,
  groupCurrentPage,
  groupPageSize,
}: LeadsDataTableProps) => {
  // Get sorting state from Redux if not provided as props
  const reduxSortBy = useAppSelector((state) => state.dashboard.sortBy);
  const reduxSortOrder = useAppSelector((state) => state.dashboard.sortOrder);
  
  const sortBy = externalSortBy ?? reduxSortBy;
  const sortOrder = externalSortOrder ?? reduxSortOrder;
  const navigate = useNavigate();

  // CRITICAL: Pass ALL columns from schema to DataTable (including related entity columns)
  // This ensures the column visibility popover shows ALL available columns
  const columns = useMemo(() => {
    return allLeadColumns;
  }, []);

  // Default column visibility - DataTable will read from Redux tableStateSlice after initialization
  // This is only used for initial setup if Redux state doesn't exist yet
  const initialVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    allLeadColumns.forEach((col) => {
      // Default: related entity columns are hidden by default, direct columns follow their enableHiding setting
      if (col.meta?.relatedEntity) {
        visibility[col.id] = false; // Hide related entity columns by default
      } else {
        visibility[col.id] = col.enableHiding !== false;
      }
    });
    return visibility;
  }, []);

  // Default column order matching the image (from right to left in RTL)
  // Order: createdDate, name, status, age, fitnessGoal, activityLevel, preferredTime, phone, source, notes
  // Hidden columns (id, email, height, weight) are placed at the end
  const initialColumnOrder = useMemo(() => {
    return [
      'createdDate',  // תאריך יצירה
      'name',         // שם
      'status',       // סטטוס
      'age',          // גיל
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
      onSortChange={onSortChange} // Server-side sorting handler
      serverSideSorting={!!onSortChange} // Enable server-side sorting if handler provided
      sortBy={sortBy} // Current sort column (for server-side sorting)
      sortOrder={sortOrder} // Current sort order (for server-side sorting)
      enableRowSelection
      totalCount={totalCount}
      onBulkDelete={onBulkDelete}
      selectionLabel="לידים"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
    />
  );
};

