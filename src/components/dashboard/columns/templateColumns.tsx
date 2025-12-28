import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { TemplateLeadsCell } from '../TemplateLeadsCell';

/**
 * Strict column definitions for Nutrition Templates table.
 * Only includes fields that exist on the NutritionTemplate type.
 * TypeScript will error if any accessorKey doesn't exist on NutritionTemplate.
 */
export const nutritionTemplateColumns: DataTableColumn<NutritionTemplate>[] = [
  {
    id: 'name',
    header: 'שם התבנית',
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
    id: 'description',
    header: 'תיאור',
    accessorKey: 'description',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
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
  },
  {
    id: 'targets',
    header: 'מקרו-נוטריאנטים',
    accessorKey: 'targets',
    enableSorting: false,
    enableResizing: true,
    enableHiding: false, // Always visible - core data
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
      const value = getValue() as string;
      return (
        <span className="text-gray-600">
          {format(new Date(value), 'dd/MM/yyyy', { locale: he })}
        </span>
      );
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

/**
 * Strict column definitions for Workout Templates table.
 * Only includes fields that exist on the WorkoutTemplate type.
 * TypeScript will error if any accessorKey doesn't exist on WorkoutTemplate.
 */
export const workoutTemplateColumns: DataTableColumn<WorkoutTemplate>[] = [
  {
    id: 'name',
    header: 'שם התוכנית',
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
    id: 'description',
    header: 'תיאור',
    accessorKey: 'description',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
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
  },
  {
    id: 'goal_tags',
    header: 'תגיות',
    accessorKey: 'goal_tags',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
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
  },
  {
    id: 'connected_leads',
    header: 'לידים מחוברים',
    accessorKey: 'id', // Use id to access the template for connected leads lookup
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      return <TemplateLeadsCell templateId={row.original.id} />;
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
      const value = getValue() as string;
      return (
        <span className="text-gray-600">
          {format(new Date(value), 'dd/MM/yyyy', { locale: he })}
        </span>
      );
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

/**
 * Default column visibility for Nutrition Templates table.
 * Only includes columns that exist in nutritionTemplateColumns.
 */
export const defaultNutritionTemplateColumnVisibility: Record<string, boolean> = {
  name: true,
  description: true,
  targets: true, // Always visible
  created_at: true,
};

/**
 * Default column visibility for Workout Templates table.
 * Only includes columns that exist in workoutTemplateColumns.
 */
export const defaultWorkoutTemplateColumnVisibility: Record<string, boolean> = {
  name: true,
  description: true,
  goal_tags: true,
  connected_leads: true,
  created_at: true,
};















