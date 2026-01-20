import { type ColumnDef } from '@tanstack/react-table';
import type { AllCollectionRecord } from '@/hooks/useAllCollections';
import { formatDate } from '@/utils/dashboard';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { DevModeId } from '@/components/ui/DevModeId';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Calendar, CreditCard, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Collection column definitions for Collections table.
 * Matches the structure and functionality of paymentColumns.
 * 
 * Column order (from right to left in RTL):
 * 1. created_at, 2. due_date, 3. status, 4. customer, 5. lead, 6. total_amount, 7. paid_amount, 8. remaining_amount, 9. description
 * Hidden: id
 */
export const collectionColumns: DataTableColumn<AllCollectionRecord>[] = [
  {
    id: 'created_at',
    header: 'תאריך יצירה',
    accessorKey: 'created_at',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-gray-400">-</span>;
      try {
        const date = new Date(value);
        const formatted = format(date, 'dd/MM/yyyy | HH:mm', { locale: he });
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-600">{formatted}</span>
          </div>
        );
      } catch {
        return <span className="text-gray-400">-</span>;
      }
    },
  },
  {
    id: 'due_date',
    header: 'תאריך יעד',
    accessorKey: 'due_date',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      if (!value) return <span className="text-gray-400">-</span>;
      try {
        const date = new Date(value);
        const formatted = format(date, 'dd/MM/yyyy', { locale: he });
        const isOverdue = date < new Date() && date < new Date(new Date().setHours(0, 0, 0, 0));
        return (
          <div className="flex items-center gap-2">
            <Calendar className={cn('h-4 w-4 flex-shrink-0', isOverdue ? 'text-red-400' : 'text-slate-400')} />
            <span className={cn('text-sm', isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600')}>
              {formatted}
            </span>
          </div>
        );
      } catch {
        return <span className="text-gray-400">-</span>;
      }
    },
  },
  {
    id: 'status',
    header: 'סטטוס',
    accessorKey: 'status',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    cell: ({ getValue, row }) => {
      const value = getValue() as string;
      const record = row.original;
      // Auto-update status based on paid amount
      let displayStatus = value;
      if (record.paid_amount !== undefined && record.total_amount > 0) {
        if (record.paid_amount >= record.total_amount) {
          displayStatus = 'הושלם';
        } else if (record.paid_amount > 0) {
          displayStatus = 'חלקי';
        } else {
          displayStatus = 'ממתין';
        }
      }
      
      const statusConfig: Record<string, { label: string; className: string }> = {
        'ממתין': {
          label: 'ממתין',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        },
        'חלקי': {
          label: 'חלקי',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        'הושלם': {
          label: 'הושלם',
          className: 'bg-green-50 text-green-700 border-green-200',
        },
        'בוטל': {
          label: 'בוטל',
          className: 'bg-gray-50 text-gray-700 border-gray-200',
        },
      };
      const config = statusConfig[displayStatus] || statusConfig['ממתין'];
      return (
        <Badge
          className={cn(
            'text-xs font-semibold px-2.5 py-1 border',
            config.className
          )}
        >
          {config.label}
        </Badge>
      );
    },
  },
  {
    id: 'customer',
    header: 'לקוח',
    accessorKey: 'customer_name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      if (!value) return <span className="text-sm text-slate-400">—</span>;
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-900">{value}</span>
        </div>
      );
    },
  },
  {
    id: 'lead',
    header: 'ליד',
    accessorKey: 'lead_name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const leadName = row.original.lead_name;
      const leadId = row.original.lead_id;
      if (leadName) {
        return <span className="text-sm text-slate-900">{leadName}</span>;
      } else if (leadId) {
        return <span className="text-sm text-slate-500">ליד #{leadId.slice(0, 8)}</span>;
      }
      return <span className="text-sm text-slate-400">—</span>;
    },
  },
  {
    id: 'total_amount',
    header: 'סכום כולל',
    accessorKey: 'total_amount',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const amount = getValue() as number;
      const formatted = new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(amount);
      return (
        <span className="text-sm font-bold text-slate-900">{formatted}</span>
      );
    },
  },
  {
    id: 'paid_amount',
    header: 'שולם',
    accessorKey: 'paid_amount',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const amount = getValue() as number | undefined;
      if (amount === undefined) return <span className="text-sm text-slate-400">—</span>;
      const formatted = new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(amount);
      return (
        <span className="text-sm font-semibold text-green-600">{formatted}</span>
      );
    },
  },
  {
    id: 'remaining_amount',
    header: 'נותר',
    accessorKey: 'remaining_amount',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 130,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const amount = getValue() as number | undefined;
      if (amount === undefined) return <span className="text-sm text-slate-400">—</span>;
      const formatted = new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
      }).format(amount);
      return (
        <span className={cn(
          'text-sm font-semibold',
          amount > 0 ? 'text-red-600' : 'text-green-600'
        )}>
          {formatted}
        </span>
      );
    },
  },
  {
    id: 'description',
    header: 'תיאור',
    accessorKey: 'description',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      if (!value) return <span className="text-gray-400">-</span>;
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-900 truncate">{value}</span>
        </div>
      );
    },
  },
  // Hidden column: id (for row selection and dev mode)
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    enableSorting: false,
    enableResizing: false,
    enableHiding: true,
    size: 100,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      return <DevModeId id={getValue() as string} />;
    },
  },
];

/**
 * Default column visibility for Collections table.
 */
export const defaultCollectionColumnVisibility = {
  created_at: true,
  due_date: true,
  status: true,
  customer: true,
  lead: true,
  total_amount: true,
  paid_amount: true,
  remaining_amount: true,
  description: false,
  id: false,
};
