import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Trash2, Send, Zap } from 'lucide-react';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

export interface WhatsAppAutomation {
  key: string;
  label: string;
  hasTemplate?: boolean;
  isAutoTrigger?: boolean;
}

interface WhatsAppAutomationColumnsProps {
  onEdit?: (automation: WhatsAppAutomation) => void;
  onDelete?: (automation: WhatsAppAutomation) => void;
}

/**
 * Column definitions for WhatsApp Automations table.
 */
export const createWhatsAppAutomationColumns = ({
  onEdit,
  onDelete,
}: WhatsAppAutomationColumnsProps = {}): DataTableColumn<WhatsAppAutomation>[] => [
  {
    id: 'label',
    header: 'שם האוטומציה',
    accessorKey: 'label',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 400,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const automation = row.original;
      return <span className="text-sm text-gray-900">{automation.label}</span>;
    },
  },
  {
    id: 'status',
    header: 'סטטוס',
    accessorFn: (row) => row.hasTemplate ? 'מוגדר' : 'לא מוגדר',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const hasTemplate = row.original.hasTemplate;
      return (
        <Badge
          variant={hasTemplate ? 'default' : 'outline'}
          className={cn(
            hasTemplate
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-700 border-gray-200'
          )}
        >
          {hasTemplate ? 'מוגדר' : 'לא מוגדר'}
        </Badge>
      );
    },
  },
  {
    id: 'key',
    header: 'מפתח',
    accessorKey: 'key',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className="font-mono text-sm text-gray-600">{value}</span>;
    },
  },
  {
    id: 'actions',
    header: 'פעולות',
    enableSorting: false,
    enableResizing: false,
    enableHiding: false,
    size: 120,
    meta: {
      align: 'center',
    },
    cell: ({ row }) => {
      const automation = row.original;
      return (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-gray-300 hover:bg-gray-200 hover:border-gray-400"
            title="ערוך תבנית"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(automation);
            }}
          >
            <Settings className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600"
            title="מחק אוטומציה"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(automation);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
  },
];

/**
 * Default column visibility for WhatsApp Automations table.
 */
export const defaultWhatsAppAutomationColumnVisibility: Record<string, boolean> = {
  label: true,
  status: true,
  key: true,
  actions: true,
};
