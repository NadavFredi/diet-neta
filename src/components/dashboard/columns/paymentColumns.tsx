import { type ColumnDef } from '@tanstack/react-table';
import type { AllPaymentRecord } from '@/hooks/useAllPayments';
import { formatDate } from '@/utils/dashboard';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { DevModeId } from '@/components/ui/DevModeId';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Package, User, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Payment column definitions for Payments table.
 * Matches the structure and functionality of leadColumns.
 * 
 * Column order (from right to left in RTL):
 * 1. date, 2. status, 3. lead, 4. customer, 5. amount, 6. product
 * Hidden: id
 */
export const paymentColumns: DataTableColumn<AllPaymentRecord>[] = [
  {
    id: 'date',
    header: 'תאריך',
    accessorKey: 'date',
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
    id: 'status',
    header: 'סטטוס תשלום',
    accessorKey: 'status',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 140,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      const statusConfig: Record<string, { label: string; className: string }> = {
        paid: {
          label: 'שולם',
          className: 'bg-green-50 text-green-700 border-green-200',
        },
        pending: {
          label: 'ממתין',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        },
        refunded: {
          label: 'הוחזר',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        failed: {
          label: 'נכשל',
          className: 'bg-red-50 text-red-700 border-red-200',
        },
      };
      const config = statusConfig[value] || statusConfig.pending;
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
    id: 'amount',
    header: 'מחיר',
    accessorKey: 'amount',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ row }) => {
      const amount = row.original.amount;
      const currency = row.original.currency || 'ILS';
      const formatted = new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: currency,
      }).format(amount);
      return (
        <span className="text-sm font-bold text-slate-900">{formatted}</span>
      );
    },
  },
  {
    id: 'product',
    header: 'מוצר',
    accessorKey: 'product_name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-gray-400">ללא שם מוצר</span>;
      return (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-900">{value}</span>
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
