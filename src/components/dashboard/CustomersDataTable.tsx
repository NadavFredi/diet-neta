import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { Customer } from '@/hooks/useCustomers';
import { formatDate } from '@/utils/dashboard';
import { Badge } from '@/components/ui/badge';

interface CustomersDataTableProps {
  customers: Customer[];
}

export const CustomersDataTable = ({ customers }: CustomersDataTableProps) => {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<Customer>[]>(() => {
    return [
      {
        id: 'full_name',
        header: 'שם',
        accessorKey: 'full_name',
        enableSorting: true,
        enableResizing: true,
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
        size: 150,
        meta: {
          align: 'right',
          isNumeric: true,
        },
        cell: ({ getValue }) => {
          const value = getValue() as number;
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
  }, []);

  const handleRowClick = (customer: Customer) => {
    navigate(`/dashboard/customers/${customer.id}`);
  };

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו לקוחות"
    />
  );
};
