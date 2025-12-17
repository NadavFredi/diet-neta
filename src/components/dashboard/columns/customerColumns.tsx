import type { Customer } from '@/hooks/useCustomers';
import { formatDate } from '@/utils/dashboard';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/DataTable';

/**
 * Strict column definitions for Customers table.
 * Only includes fields that exist on the Customer type.
 * TypeScript will error if any accessorKey doesn't exist on Customer.
 */
export const customerColumns: DataTableColumn<Customer>[] = [
  {
    id: 'full_name',
    header: 'שם',
    accessorKey: 'full_name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 240,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="font-medium text-gray-900">{value}</span>;
    },
  },
  {
    id: 'phone',
    header: 'טלפון',
    accessorKey: 'phone',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="font-mono text-sm">{value}</span>;
    },
  },
  {
    id: 'email',
    header: 'אימייל',
    accessorKey: 'email',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 240,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      return <span className="text-gray-700">{value || '-'}</span>;
    },
  },
  {
    id: 'total_leads',
    header: 'מספר לידים',
    accessorKey: 'total_leads',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
      isNumeric: true,
    },
    cell: ({ getValue }) => {
      const value = getValue() as number | undefined;
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {value || 0}
        </Badge>
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
    size: 180,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="text-gray-600">{formatDate(value)}</span>;
    },
  },
];

/**
 * Default column visibility for Customers table.
 * Only includes columns that exist in customerColumns.
 */
export const defaultCustomerColumnVisibility: Record<string, boolean> = {
  full_name: true,
  phone: true,
  email: true,
  total_leads: true,
  created_at: true,
};






