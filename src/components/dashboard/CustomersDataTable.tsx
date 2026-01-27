import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Customer } from '@/hooks/useCustomers';
import { customerColumns } from './columns/customerColumns';

interface CustomersDataTableProps {
  customers: Customer[];
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const CustomersDataTable = ({ 
  customers, 
  onBulkDelete,
  onSortChange,
  sortBy,
  sortOrder,
  groupCurrentPage,
  groupPageSize,
}: CustomersDataTableProps) => {
  const navigate = useNavigate();

  const handleRowClick = (customer: Customer) => {
    navigate(`/dashboard/customers/${customer.id}`);
  };

  return (
    <DataTable
      data={customers}
      columns={customerColumns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו לקוחות"
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="customers"
      enableRowSelection
      totalCount={customers.length}
      onBulkDelete={onBulkDelete}
      selectionLabel="לקוחות"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
};







