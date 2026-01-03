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
      
      // Try multiple possible field names for time
      let timeValue = meetingData.time || 
                     meetingData.meeting_time || 
                     meetingData.hour ||
                     meetingData.start_time ||
                     meetingData['שעה'] || 
                     meetingData['שעת פגישה'] ||
                     meetingData['שעת התחלה'] ||
                     meetingData['זמן'];
      
      // If no direct time field, try to extract from datetime strings
      if (!timeValue) {
        // Check if date field contains time
        const dateValue = meetingData.date || meetingData.meeting_date || meetingData['תאריך'] || meetingData['תאריך פגישה'];
        if (dateValue && typeof dateValue === 'string') {
          // Check if it's a datetime string (contains time)
          if (dateValue.includes('T') || dateValue.includes(' ')) {
            try {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                // Extract time in HH:MM format
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                timeValue = `${hours}:${minutes}`;
              }
            } catch (e) {
              // If parsing fails, try to extract time pattern from string
              const timeMatch = dateValue.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                timeValue = timeMatch[0];
              }
            }
          }
        }
      }
      
      // Format time value if it exists
      if (timeValue) {
        const timeStr = String(timeValue);
        // If it's already in a good format, use it
        if (timeStr.match(/^\d{1,2}:\d{2}/)) {
          return <span className="text-gray-700">{timeStr}</span>;
        }
        // If it's a number (like 1430 for 14:30), convert it
        if (/^\d{3,4}$/.test(timeStr)) {
          const padded = timeStr.padStart(4, '0');
          const hours = padded.substring(0, 2);
          const minutes = padded.substring(2, 4);
          return <span className="text-gray-700">{hours}:{minutes}</span>;
        }
        // Otherwise, just display as is
        return <span className="text-gray-700">{timeStr}</span>;
      }
      
      return <span className="text-gray-400">-</span>;
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


