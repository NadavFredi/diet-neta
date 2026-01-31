import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import type { Exercise } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { exerciseColumns } from './columns/exerciseColumns';

interface ExercisesDataTableProps {
  exercises: Exercise[];
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  groupCurrentPage?: number;
  groupPageSize?: number;
  onCategoryUpdate?: (exerciseId: string, category: string) => Promise<void>;
}

export const ExercisesDataTable = ({
  exercises,
  onEdit,
  onDelete,
  onBulkDelete,
  onSortChange,
  sortBy,
  sortOrder,
  groupCurrentPage,
  groupPageSize,
  onCategoryUpdate,
}: ExercisesDataTableProps) => {
  // CRITICAL: Pass ALL columns from schema to DataTable
  // This ensures the column visibility popover shows ALL available Exercise columns
  // DataTable will filter visible columns internally
  const columns = useMemo(() => {
    return exerciseColumns.map((col) => {
      // Add actions cell renderer if this is the actions column
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const exercise = row.original;
            return (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(exercise);
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
                    onDelete(exercise);
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

  const handleRowClick = (exercise: Exercise) => {
    onEdit(exercise);
  };

  return (
    <DataTable
      data={exercises}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage={
        exercises.length === 0
          ? 'אין תרגילים. צור תרגיל חדש כדי להתחיל'
          : 'לא נמצאו תרגילים התואמים לחיפוש'
      }
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="exercises"
      enableRowSelection
      totalCount={exercises.length}
      onBulkDelete={onBulkDelete}
      selectionLabel="תרגילים"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      meta={{
        onCategoryUpdate,
      }}
    />
  );
};
