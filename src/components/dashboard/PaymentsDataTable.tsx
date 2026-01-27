import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { AllPaymentRecord } from '@/hooks/useAllPayments';
import { paymentColumns } from './columns/paymentColumns';
import { useAppSelector } from '@/store/hooks';

interface PaymentsDataTableProps {
  payments: AllPaymentRecord[];
  enableColumnVisibility?: boolean;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  totalCount?: number;
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const PaymentsDataTable = ({ 
  payments, 
  enableColumnVisibility = true, 
  onSortChange,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  totalCount,
  onBulkDelete,
  groupCurrentPage,
  groupPageSize,
}: PaymentsDataTableProps) => {
  // Get sorting state from Redux if not provided as props
  const reduxSortBy = useAppSelector((state) => {
    const tableState = state.tableState.tables['payments'];
    return tableState?.sortBy;
  });
  const reduxSortOrder = useAppSelector((state) => {
    const tableState = state.tableState.tables['payments'];
    return tableState?.sortOrder;
  });
  
  const sortBy = externalSortBy ?? reduxSortBy;
  const sortOrder = externalSortOrder ?? reduxSortOrder;
  const navigate = useNavigate();

  // Pass columns to DataTable
  const columns = useMemo(() => {
    return paymentColumns;
  }, []);

  // Default column visibility - DataTable will read from Redux tableStateSlice after initialization
  const initialVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    paymentColumns.forEach((col) => {
      visibility[col.id] = col.enableHiding !== false;
    });
    return visibility;
  }, []);

  // Default column order (from right to left in RTL)
  // Order: date, status, lead, customer, amount, product
  const initialColumnOrder = useMemo(() => {
    return [
      'date',      // תאריך
      'status',    // סטטוס תשלום
      'lead',      // ליד
      'customer',  // לקוח
      'amount',    // מחיר
      'product',   // מוצר
    ];
  }, []);

  const handleRowClick = (payment: AllPaymentRecord) => {
    // Navigate to payment detail page
    navigate(`/dashboard/payments/${payment.id}`);
  };

  return (
    <DataTable
      data={payments}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו תשלומים"
      enableColumnVisibility={enableColumnVisibility}
      enableColumnReordering={true}
      resourceKey="payments"
      initialColumnVisibility={initialVisibility}
      initialColumnOrder={initialColumnOrder}
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      enableRowSelection
      totalCount={totalCount}
      onBulkDelete={onBulkDelete}
      selectionLabel="תשלומים"
      singularLabel="תשלום"
      pluralLabel="תשלומים"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
    />
  );
};
