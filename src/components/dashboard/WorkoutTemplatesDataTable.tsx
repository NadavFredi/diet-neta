import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { TemplateColumnVisibility } from './TemplateColumnSettings';
import { TemplateLeadsCell } from './TemplateLeadsCell';

interface WorkoutTemplatesDataTableProps {
  templates: WorkoutTemplate[];
  columnVisibility: TemplateColumnVisibility;
  onEdit: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
}

export const WorkoutTemplatesDataTable = ({
  templates,
  columnVisibility,
  onEdit,
  onDelete,
}: WorkoutTemplatesDataTableProps) => {
  const columns = useMemo<DataTableColumn<WorkoutTemplate>[]>(() => {
    const cols: DataTableColumn<WorkoutTemplate>[] = [];

    if (columnVisibility.name) {
      cols.push({
        id: 'name',
        header: 'שם התוכנית',
        accessorKey: 'name',
        enableSorting: true,
        enableResizing: true,
        size: 200,
        meta: {
          align: 'right',
        },
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return <span className="font-medium text-gray-900">{value}</span>;
        },
      });
    }

    if (columnVisibility.description) {
      cols.push({
        id: 'description',
        header: 'תיאור',
        accessorKey: 'description',
        enableSorting: true,
        enableResizing: true,
        size: 300,
        meta: {
          align: 'right',
        },
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          return (
            <span className="text-gray-600 max-w-md truncate block">
              {value || '-'}
            </span>
          );
        },
      });
    }

    if (columnVisibility.tags) {
      cols.push({
        id: 'goal_tags',
        header: 'תגיות',
        accessorKey: 'goal_tags',
        enableSorting: false,
        enableResizing: true,
        size: 200,
        meta: {
          align: 'right',
        },
        cell: ({ row }) => {
          const tags = row.original.goal_tags || [];
          return (
            <div className="flex gap-1 flex-wrap">
              {tags.length > 0 ? (
                tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400 text-sm">-</span>
              )}
            </div>
          );
        },
      });
    }

    if (columnVisibility.connectedLeads) {
      cols.push({
        id: 'connected_leads',
        header: 'לידים מחוברים',
        accessorKey: 'id',
        enableSorting: false,
        enableResizing: true,
        size: 180,
        meta: {
          align: 'right',
        },
        cell: ({ row }) => {
          return <TemplateLeadsCell templateId={row.original.id} />;
        },
      });
    }

    if (columnVisibility.createdDate) {
      cols.push({
        id: 'created_at',
        header: 'תאריך יצירה',
        accessorKey: 'created_at',
        enableSorting: true,
        enableResizing: true,
        size: 150,
        meta: {
          align: 'right',
        },
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className="text-gray-600">
              {format(new Date(value), 'dd/MM/yyyy', { locale: he })}
            </span>
          );
        },
      });
    }

    if (columnVisibility.actions) {
      cols.push({
        id: 'actions',
        header: 'פעולות',
        accessorKey: 'id',
        enableSorting: false,
        enableResizing: true,
        size: 120,
        meta: {
          align: 'right',
        },
        cell: ({ row }) => {
          const template = row.original;
          return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template);
                }}
                className="hover:bg-blue-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [columnVisibility, onEdit, onDelete]);

  const handleRowClick = (template: WorkoutTemplate) => {
    onEdit(template);
  };

  return (
    <DataTable
      data={templates}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage={
        templates.length === 0
          ? 'אין תוכניות. צור תוכנית חדשה כדי להתחיל'
          : 'לא נמצאו תוכניות התואמות לחיפוש'
      }
    />
  );
};
