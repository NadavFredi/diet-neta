import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { DataTableColumn } from '@/components/ui/DataTable';
import type { DurationUnit } from '@/store/slices/subscriptionTypesSlice';

// Helper function to get duration unit label in Hebrew
const getDurationUnitLabel = (unit: DurationUnit, count: number): string => {
  switch (unit) {
    case 'days':
      return count === 1 ? 'יום' : 'ימים';
    case 'weeks':
      return count === 1 ? 'שבוע' : 'שבועות';
    case 'months':
      return count === 1 ? 'חודש' : 'חודשים';
    default:
      return '';
  }
};

interface SubscriptionTypesDataTableProps {
  subscriptionTypes: SubscriptionType[];
  onEdit: (subscriptionType: SubscriptionType) => void;
  onDelete: (subscriptionType: SubscriptionType) => void;
}

export const subscriptionTypeColumns: DataTableColumn<SubscriptionType>[] = [
  {
    id: 'name',
    header: 'שם מנוי',
    accessorKey: 'name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
  },
  {
    id: 'duration',
    header: 'תוקף',
    accessorKey: 'duration',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const duration = row.original.duration;
      const durationUnit: DurationUnit = row.original.duration_unit || 'months';
      return <span className="text-sm font-medium">{duration} {getDurationUnitLabel(durationUnit, duration)}</span>;
    },
  },
  {
    id: 'price',
    header: 'מחיר',
    accessorKey: 'price',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const price = row.original.price;
      const currency = row.original.currency || 'ILS';
      const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
      return <span className="text-sm font-medium">{currencySymbol}{price.toLocaleString('he-IL')}</span>;
    },
  },
  {
    id: 'createdDate',
    header: 'תאריך יצירה',
    accessorKey: 'created_at',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const date = row.original.created_at;
      return date ? (
        <span className="text-sm text-gray-600">
          {format(new Date(date), 'd MMM yyyy', { locale: he })}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'actions',
    header: 'פעולות',
    accessorKey: 'id',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: () => null, // Will be overridden
  },
];

export const SubscriptionTypesDataTable = ({
  subscriptionTypes,
  onEdit,
  onDelete,
}: SubscriptionTypesDataTableProps) => {
  const columns = useMemo(() => {
    return subscriptionTypeColumns.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const subscriptionType = row.original;

            return (
              <TooltipProvider>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(subscriptionType);
                        }}
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>עריכה</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(subscriptionType);
                        }}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>מחיקה</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            );
          },
        };
      }
      return col;
    });
  }, [onEdit, onDelete]);

  return (
    <DataTable
      data={subscriptionTypes}
      columns={columns}
      enableRowSelection={false}
      enableColumnResizing={true}
      enableColumnVisibility={true}
    />
  );
};
