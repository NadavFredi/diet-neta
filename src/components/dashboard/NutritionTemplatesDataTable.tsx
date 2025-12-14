import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { TemplateColumnVisibility } from './TemplateColumnSettings';

interface NutritionTemplatesDataTableProps {
  templates: NutritionTemplate[];
  columnVisibility: TemplateColumnVisibility;
  onEdit: (template: NutritionTemplate) => void;
  onDelete: (template: NutritionTemplate) => void;
}

export const NutritionTemplatesDataTable = ({
  templates,
  columnVisibility,
  onEdit,
  onDelete,
}: NutritionTemplatesDataTableProps) => {
  const columns = useMemo<DataTableColumn<NutritionTemplate>[]>(() => {
    const cols: DataTableColumn<NutritionTemplate>[] = [];

    if (columnVisibility.name) {
      cols.push({
        id: 'name',
        header: 'שם התבנית',
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

    // Always show macros
    cols.push({
      id: 'targets',
      header: 'מקרו-נוטריאנטים',
      accessorKey: 'targets',
      enableSorting: false,
      enableResizing: true,
      size: 350,
      meta: {
        align: 'right',
      },
      cell: ({ row }) => {
        const targets = row.original.targets;
        return (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {targets.calories} קק״ל
            </Badge>
            <Badge variant="outline" className="text-xs">
              {targets.protein}ג חלבון
            </Badge>
            <Badge variant="outline" className="text-xs">
              {targets.carbs}ג פחמימות
            </Badge>
            <Badge variant="outline" className="text-xs">
              {targets.fat}ג שומן
            </Badge>
          </div>
        );
      },
    });

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

  const handleRowClick = (template: NutritionTemplate) => {
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
          ? 'אין תבניות. צור תבנית חדשה כדי להתחיל'
          : 'לא נמצאו תבניות התואמות לחיפוש'
      }
    />
  );
};
