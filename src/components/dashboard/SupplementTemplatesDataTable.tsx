import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import type { SupplementTemplate } from '@/hooks/useSupplementTemplates';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { supplementTemplateColumns } from './columns/templateColumns';

interface SupplementTemplatesDataTableProps {
  templates: SupplementTemplate[];
  onEdit: (template: SupplementTemplate) => void;
  onDelete: (template: SupplementTemplate) => void;
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const SupplementTemplatesDataTable = ({
  templates,
  onEdit,
  onDelete,
  onBulkDelete,
  onSortChange,
  sortBy,
  sortOrder,
  groupCurrentPage,
  groupPageSize,
}: SupplementTemplatesDataTableProps) => {
  const columns = useMemo(() => {
    return supplementTemplateColumns.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
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
        };
      }
      return col;
    });
  }, [onEdit, onDelete]);

  const handleRowClick = (template: SupplementTemplate) => {
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
          ? 'אין תבניות תוספים. צור תבנית חדשה כדי להתחיל'
          : 'לא נמצאו תבניות התואמות לחיפוש'
      }
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="templates"
      enableRowSelection
      totalCount={templates.length}
      onBulkDelete={onBulkDelete}
      selectionLabel="תבניות תוספים"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
};
