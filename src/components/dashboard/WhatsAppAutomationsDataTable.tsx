import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { createWhatsAppAutomationColumns, type WhatsAppAutomation } from './columns/whatsappAutomationColumns';

interface WhatsAppAutomationsDataTableProps {
  automations: WhatsAppAutomation[];
  onEdit?: (automation: WhatsAppAutomation) => void;
  onDelete?: (automation: WhatsAppAutomation) => void;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const WhatsAppAutomationsDataTable = ({
  automations,
  onEdit,
  onDelete,
  onSortChange,
  sortBy,
  sortOrder,
}: WhatsAppAutomationsDataTableProps) => {
  const columns = useMemo(
    () => createWhatsAppAutomationColumns({ onEdit, onDelete }),
    [onEdit, onDelete]
  );

  return (
    <DataTable
      data={automations}
      columns={columns}
      dir="rtl"
      emptyMessage="לא נמצאו אוטומציות"
      enableColumnVisibility={true}
      enableColumnReordering={true}
      resourceKey="whatsapp_automations"
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
};
