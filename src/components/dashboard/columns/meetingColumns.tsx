import type { Meeting } from '@/hooks/useMeetings';
import { formatDate } from '@/utils/dashboard';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/DataTable';

/**
 * Column definitions for Meetings table.
 */
export const meetingColumns: DataTableColumn<Meeting>[] = [
  {
    id: 'customer_name',
    header: 'לקוח',
    accessorKey: 'customer_name',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const customer = row.original.customer;
      return (
        <span className="font-medium text-gray-900">
          {customer?.full_name || '-'}
        </span>
      );
    },
  },
  {
    id: 'meeting_date',
    header: 'תאריך פגישה',
    accessorKey: 'meeting_date',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      // Try to extract date from meeting_data (common fields: date, meeting_date, etc.)
      const dateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
      if (dateValue) {
        return <span className="text-gray-700">{String(dateValue)}</span>;
      }
      return <span className="text-gray-400">{formatDate(row.original.created_at)}</span>;
    },
  },
  {
    id: 'meeting_time',
    header: 'שעה',
    accessorKey: 'meeting_time',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      const timeValue = meetingData.time || meetingData.meeting_time || meetingData['שעה'] || meetingData['שעת פגישה'];
      return <span className="text-gray-700">{timeValue ? String(timeValue) : '-'}</span>;
    },
  },
  {
    id: 'phone',
    header: 'טלפון',
    accessorKey: 'phone',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const customer = row.original.customer;
      return <span className="font-mono text-sm text-gray-700">{customer?.phone || '-'}</span>;
    },
  },
  {
    id: 'status',
    header: 'סטטוס',
    accessorKey: 'status',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      const status = meetingData.status || meetingData['סטטוס'] || 'פעיל';
      const statusValue = String(status);
      
      const getStatusColor = (status: string) => {
        if (status.includes('בוטל') || status.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
        if (status.includes('הושלם') || status.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
        if (status.includes('מתוכנן') || status.includes('תוכנן')) return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-gray-50 text-gray-700 border-gray-200';
      };

      return (
        <Badge variant="outline" className={getStatusColor(statusValue)}>
          {statusValue}
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
 * Default column visibility for Meetings table.
 */
export const defaultMeetingColumnVisibility = {
  customer_name: true,
  meeting_date: true,
  meeting_time: true,
  phone: true,
  status: true,
  created_at: true,
};

