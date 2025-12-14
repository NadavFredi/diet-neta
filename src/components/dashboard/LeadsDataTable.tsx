import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate, getColumnLabel, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadsDataTableProps {
  leads: Lead[];
  columnVisibility: ColumnVisibility;
}

export const LeadsDataTable = ({ leads, columnVisibility }: LeadsDataTableProps) => {
  const navigate = useNavigate();

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

  const columns = useMemo<DataTableColumn<Lead>[]>(() => {
    const visibleColumns = COLUMN_ORDER.filter((col) => columnVisibility[col]);

    return visibleColumns.map((col) => {
      const baseColumn: DataTableColumn<Lead> = {
        id: col,
        header: getColumnLabel(col),
        accessorKey: col as keyof Lead,
        enableSorting: true,
        enableResizing: true,
        size: col === 'notes' ? 250 : col === 'name' ? 200 : col === 'email' ? 220 : col === 'status' ? 140 : 150,
        meta: {
          align: 'right',
        },
      };

      // Custom cell renderers
      if (col === 'id') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
              {value}
            </span>
          );
        };
      } else if (col === 'name') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              {value}
            </span>
          );
        };
      } else if (col === 'createdDate' || col === 'birthDate') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return <span className="text-gray-600">{formatDate(value)}</span>;
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: false };
      } else if (col === 'status') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(value)}`}
            >
              {value}
            </span>
          );
        };
      } else if (col === 'phone') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return <span className="text-gray-600 font-mono text-sm">{value}</span>;
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: false };
      } else if (col === 'email') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="text-gray-900 hover:text-blue-600 transition-colors text-sm">
              {value}
            </span>
          );
        };
      } else if (col === 'source') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
              {value}
            </span>
          );
        };
      } else if (col === 'age') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as number;
          return <span className="text-gray-900">{value} שנים</span>;
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: true };
      } else if (col === 'height') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as number;
          return <span className="text-gray-900">{value} ס"מ</span>;
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: true };
      } else if (col === 'weight') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as number;
          return <span className="text-gray-900 font-semibold">{value} ק"ג</span>;
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: true };
      } else if (col === 'fitnessGoal') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
              {value}
            </span>
          );
        };
      } else if (col === 'activityLevel') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
              {value}
            </span>
          );
        };
      } else if (col === 'preferredTime') {
        baseColumn.cell = ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
              {value}
            </span>
          );
        };
      } else if (col === 'notes') {
        baseColumn.cell = ({ row }) => {
          const notes = row.original.notes;
          if (!notes) return <span className="text-gray-400">-</span>;
          return (
            <span className="text-gray-600 text-xs italic" title={notes}>
              {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
            </span>
          );
        };
        baseColumn.meta = { ...baseColumn.meta, isNumeric: false };
      }

      return baseColumn;
    });
  }, [columnVisibility]);

  const handleRowClick = (lead: Lead) => {
    navigate(`/leads/${lead.id}`);
  };

  return (
    <DataTable
      data={leads}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו תוצאות"
    />
  );
};
