import type { Exercise } from '@/hooks/useExercises';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { Image, Video, ExternalLink } from 'lucide-react';
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';

/**
 * Strict column definitions for Exercises table.
 * Only includes fields that exist on the Exercise type.
 * TypeScript will error if any accessorKey doesn't exist on Exercise.
 */
export const exerciseColumns: DataTableColumn<Exercise>[] = [
  {
    id: 'name',
    header: 'שם התרגיל',
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
      return <span className="font-medium text-gray-900">{value}</span>;
    },
  },
  {
    id: 'category',
    header: 'קטגוריה',
    accessorKey: 'category',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row, table }) => {
      const exercise = row.original;
      const value = exercise.category;
      
      // Get onCategoryUpdate handler from table meta if available
      const onCategoryUpdate = (table.options.meta as any)?.onCategoryUpdate;
      
      if (onCategoryUpdate) {
        return (
          <InlineEditableField
            label="קטגוריה"
            value={value || ''}
            onSave={async (newValue) => {
              const categoryValue = (newValue as string).trim() || null;
              await onCategoryUpdate(exercise.id, categoryValue);
            }}
            type="text"
            formatValue={(val) => val || ''}
            className="min-w-[120px]"
          />
        );
      }
      
      // Fallback: display as badge
      if (!value || value.trim() === '') {
        return <span className="text-gray-400">-</span>;
      }
      
      return (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      );
    },
  },
  {
    id: 'repetitions',
    header: 'חזרות',
    accessorKey: 'repetitions',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 100,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      return (
        <span className="text-gray-600">
          {value != null ? value : '-'}
        </span>
      );
    },
  },
  {
    id: 'weight',
    header: 'משקל (ק״ג)',
    accessorKey: 'weight',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      return (
        <span className="text-gray-600">
          {value != null ? `${value} ק״ג` : '-'}
        </span>
      );
    },
  },
  {
    id: 'media',
    header: 'מדיה',
    accessorKey: 'id',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 100,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original;
      const b = rowB.original;
      const aScore = (a.image && a.image.trim() ? 1 : 0) + (a.video_link && a.video_link.trim() ? 2 : 0);
      const bScore = (b.image && b.image.trim() ? 1 : 0) + (b.video_link && b.video_link.trim() ? 2 : 0);
      return aScore - bScore;
    },
    cell: ({ row }) => {
      const exercise = row.original;
      const hasImage = exercise.image && exercise.image.trim();
      const hasVideo = exercise.video_link && exercise.video_link.trim();
      
      if (!hasImage && !hasVideo) {
        return <span className="text-gray-400">-</span>;
      }
      
      return (
        <div className="flex gap-2 items-center">
          {hasImage && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Image className="h-3 w-3" />
              תמונה
            </Badge>
          )}
          {hasVideo && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Video className="h-3 w-3" />
              וידאו
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: 'created_at',
    header: 'תאריך יצירה',
    accessorKey: 'created_at',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null | undefined;
      if (!value) return <span className="text-gray-400">-</span>;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return <span className="text-gray-400">-</span>;
        return (
          <span className="text-gray-600">
            {format(date, 'dd/MM/yyyy', { locale: he })}
          </span>
        );
      } catch {
        return <span className="text-gray-400">-</span>;
      }
    },
  },
  {
    id: 'actions',
    header: 'פעולות',
    accessorKey: 'id', // Use id as accessor for actions column
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    // Note: cell renderer will be provided by the component using this column
    // to allow passing onEdit and onDelete handlers
  },
];
