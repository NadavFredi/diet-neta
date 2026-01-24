import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';
import type { WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import type { SupplementTemplate } from '@/hooks/useSupplementTemplates';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { TemplateLeadsCell } from '../TemplateLeadsCell';

/**
 * Strict column definitions for Supplement Templates table.
 */
export const supplementTemplateColumns: DataTableColumn<SupplementTemplate>[] = [
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
    id: 'supplements_count',
    header: 'מספר תוספים',
    accessorKey: 'supplements',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const count = row.original.supplements?.length || 0;
      return <Badge variant="outline">{count} תוספים</Badge>;
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: false, // Always visible - core data
    size: 350,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const aCalories = rowA.original?.targets?.calories ?? 0;
      const bCalories = rowB.original?.targets?.calories ?? 0;
      return aCalories - bCalories;
    },
    cell: ({ row }) => {
      const targets = row.original?.targets;
      if (!targets) return <span className="text-gray-400">-</span>;
      return (
        <div className="flex gap-2 flex-wrap">
          {targets.calories != null && (
            <Badge variant="outline" className="text-xs">
              {targets.calories} קק״ל
            </Badge>
          )}
          {targets.protein != null && (
            <Badge variant="outline" className="text-xs">
              {targets.protein}ג חלבון
            </Badge>
          )}
          {targets.carbs != null && (
            <Badge variant="outline" className="text-xs">
              {targets.carbs}ג פחמימות
            </Badge>
          )}
          {targets.fat != null && (
            <Badge variant="outline" className="text-xs">
              {targets.fat}ג שומן
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const aTags = (rowA.original.goal_tags || []).join(', ');
      const bTags = (rowB.original.goal_tags || []).join(', ');
      return aTags.localeCompare(bTags, 'he');
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const aCount = rowA.original.leads_count ?? (rowA.original.has_leads ? 1 : 0);
      const bCount = rowB.original.leads_count ?? (rowB.original.has_leads ? 1 : 0);
      return aCount - bCount;
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

/**
 * Default column visibility for Supplement Templates table.
 */
export const defaultSupplementTemplateColumnVisibility: Record<string, boolean> = {
  name: true,
  description: true,
  supplements_count: true,
  created_at: true,
};



















