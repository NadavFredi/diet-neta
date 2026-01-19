import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { createWhatsAppAutomationColumns, type WhatsAppAutomation } from './columns/whatsappAutomationColumns';

interface WhatsAppAutomationsDataTableProps {
  automations: WhatsAppAutomation[];
  onEdit?: (automation: WhatsAppAutomation) => void;
  onDelete?: (automation: WhatsAppAutomation) => void;
}

export const WhatsAppAutomationsDataTable = ({
  automations,
  onEdit,
  onDelete,
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
    />
  );
};
