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
      
      // Extract scheduling data (same logic as MeetingDetailView)
      const extractSchedulingData = () => {
        if (meetingData.scheduling && Array.isArray(meetingData.scheduling) && meetingData.scheduling.length > 0) {
          const scheduling = meetingData.scheduling[0];
          if (scheduling.value) {
            return {
              eventStartTime: scheduling.value.eventStartTime,
              eventEndTime: scheduling.value.eventEndTime,
            };
          }
        }

        const eventStartTimeKey = 'scheduling[0].value.eventStartTime';
        const eventEndTimeKey = 'scheduling[0].value.eventEndTime';
        
        if (meetingData[eventStartTimeKey] || meetingData[eventEndTimeKey]) {
          return {
            eventStartTime: meetingData[eventStartTimeKey],
            eventEndTime: meetingData[eventEndTimeKey],
          };
        }

        return null;
      };

      const schedulingData = extractSchedulingData();
      
      // Extract date from eventStartTime (same logic as MeetingDetailView)
      let dateValue = null;
      if (schedulingData?.eventStartTime) {
        try {
          const startDate = new Date(schedulingData.eventStartTime);
          if (!isNaN(startDate.getTime())) {
            dateValue = formatDate(startDate.toISOString());
          }
        } catch (e) {
          console.error('[MeetingColumns] Error parsing start time:', e);
        }
      }
      
      // Fallback to other common date fields
      if (!dateValue) {
        dateValue = meetingData.date || 
                   meetingData.meeting_date || 
                   meetingData['תאריך'] || 
                   meetingData['תאריך פגישה'] ||
                   meetingData['Date'] ||
                   meetingData['Meeting Date'];
      }
      
      if (dateValue) {
        return <span className="text-gray-700">{String(dateValue)}</span>;
      }
      // Don't use submission date - show placeholder if actual meeting date not found
      return <span className="text-gray-400">-</span>;
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
      
      // Extract scheduling data (same logic as MeetingDetailView)
      const extractSchedulingData = () => {
        if (meetingData.scheduling && Array.isArray(meetingData.scheduling) && meetingData.scheduling.length > 0) {
          const scheduling = meetingData.scheduling[0];
          if (scheduling.value) {
            return {
              eventStartTime: scheduling.value.eventStartTime,
              eventEndTime: scheduling.value.eventEndTime,
            };
          }
        }

        const eventStartTimeKey = 'scheduling[0].value.eventStartTime';
        const eventEndTimeKey = 'scheduling[0].value.eventEndTime';
        
        if (meetingData[eventStartTimeKey] || meetingData[eventEndTimeKey]) {
          return {
            eventStartTime: meetingData[eventStartTimeKey],
            eventEndTime: meetingData[eventEndTimeKey],
          };
        }

        return null;
      };

      const schedulingData = extractSchedulingData();
      
      // Extract time from eventStartTime and eventEndTime (same logic as MeetingDetailView)
      let meetingStartTime = null;
      let meetingEndTime = null;

      if (schedulingData?.eventStartTime) {
        try {
          const startDate = new Date(schedulingData.eventStartTime);
          if (!isNaN(startDate.getTime())) {
            const hours = startDate.getHours().toString().padStart(2, '0');
            const minutes = startDate.getMinutes().toString().padStart(2, '0');
            meetingStartTime = `${hours}:${minutes}`;
          }
        } catch (e) {
          console.error('[MeetingColumns] Error parsing start time:', e);
        }
      }

      if (schedulingData?.eventEndTime) {
        try {
          const endDate = new Date(schedulingData.eventEndTime);
          if (!isNaN(endDate.getTime())) {
            const hours = endDate.getHours().toString().padStart(2, '0');
            const minutes = endDate.getMinutes().toString().padStart(2, '0');
            meetingEndTime = `${hours}:${minutes}`;
          }
        } catch (e) {
          console.error('[MeetingColumns] Error parsing end time:', e);
        }
      }

      // Format time range (same logic as MeetingDetailView formatTimeRange)
      const formatTimeRange = () => {
        if (meetingStartTime && meetingEndTime) {
          if (meetingStartTime > meetingEndTime) {
            return `${meetingEndTime} - ${meetingStartTime}`;
          }
          return `${meetingStartTime} - ${meetingEndTime}`;
        }
        return meetingStartTime || null;
      };

      const timeValue = formatTimeRange();
      
      if (timeValue) {
        return <span className="text-gray-700">{timeValue}</span>;
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
    id: 'email',
    header: 'אימייל',
    accessorKey: 'email',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const customer = row.original.customer;
      const meetingData = row.original.meeting_data || {};
      const email = customer?.email || meetingData.email || meetingData['אימייל'] || '-';
      return (
        <span className="text-sm text-gray-700 truncate block max-w-[200px]" title={email}>
          {email}
        </span>
      );
    },
  },
  {
    id: 'meeting_type',
    header: 'סוג פגישה',
    accessorKey: 'meeting_type',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      // Extract meeting type from various possible fields (prioritize סוג פגישה and meeting_type)
      const meetingType = meetingData['סוג פגישה'] || 
                        meetingData.meeting_type ||
                        meetingData['פגישת הכרות'] || 
                        meetingData.type ||
                        'פגישת הכרות';
      return (
        <span className="text-sm font-medium text-gray-900">
          {String(meetingType)}
        </span>
      );
    },
  },
  {
    id: 'location',
    header: 'מיקום',
    accessorKey: 'location',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      const location = meetingData.location || 
                      meetingData['מיקום'] || 
                      meetingData['מקום'] ||
                      '-';
      return (
        <span className="text-sm text-gray-700">
          {String(location)}
        </span>
      );
    },
  },
  {
    id: 'notes',
    header: 'הערות',
    accessorKey: 'notes',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
    },
    cell: ({ row }) => {
      const meetingData = row.original.meeting_data || {};
      const notes = meetingData.notes || 
                   meetingData['הערות'] || 
                   meetingData['תיאור'] ||
                   meetingData.description ||
                   '-';
      const notesStr = String(notes);
      return (
        <span 
          className="text-sm text-gray-700 truncate block max-w-[250px]" 
          title={notesStr !== '-' ? notesStr : undefined}
        >
          {notesStr}
        </span>
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
  email: true,
  meeting_type: true,
  status: true,
  location: false,
  notes: false,
  created_at: true,
};


