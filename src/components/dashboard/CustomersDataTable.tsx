import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Customer } from '@/hooks/useCustomers';
import { customerColumns } from './columns/customerColumns';

interface CustomersDataTableProps {
  customers: Customer[];
}

export const CustomersDataTable = ({ customers }: CustomersDataTableProps) => {
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
      enableColumnVisibility={true}
      enableColumnReordering={true}
    />
  );
};





