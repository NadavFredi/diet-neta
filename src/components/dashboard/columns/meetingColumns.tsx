import type { Meeting } from '@/hooks/useMeetings';
import { formatDate } from '@/utils/dashboard';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { MeetingDeleteButton } from '@/components/dashboard/MeetingDeleteButton';

const compareStrings = (a: string, b: string) => a.localeCompare(b, 'he');
const compareNumbers = (a: number, b: number) => a - b;

const getMeetingCustomer = (meeting: Meeting) => meeting.customer || (meeting.lead as any)?.customer;

const getMeetingSchedulingData = (meetingData: Record<string, any>) => {
  if (meetingData.event_start_time || meetingData.event_end_time || meetingData.eventStartTime || meetingData.eventEndTime) {
    return {
      eventStartTime: meetingData.event_start_time || meetingData.eventStartTime,
      eventEndTime: meetingData.event_end_time || meetingData.eventEndTime,
    };
  }

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

const getMeetingDateDisplayValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (!isNaN(startDate.getTime())) {
      return formatDate(startDate.toISOString());
    }
  }

  return meetingData.date ||
    meetingData.meeting_date ||
    meetingData['תאריך'] ||
    meetingData['תאריך פגישה'] ||
    meetingData['Date'] ||
    meetingData['Meeting Date'] ||
    null;
};

const getMeetingDateSortValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (!isNaN(startDate.getTime())) return startDate.getTime();
  }

  const fallback = getMeetingDateDisplayValue(meeting);
  if (!fallback) return 0;
  const parsed = Date.parse(String(fallback));
  return isNaN(parsed) ? 0 : parsed;
};

const getMeetingTimeDisplayValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  if (!schedulingData?.eventStartTime && !schedulingData?.eventEndTime) return null;

  let meetingStartTime: string | null = null;
  let meetingEndTime: string | null = null;

  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (!isNaN(startDate.getTime())) {
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      meetingStartTime = `${hours}:${minutes}`;
    }
  }

  if (schedulingData?.eventEndTime) {
    const endDate = new Date(schedulingData.eventEndTime);
    if (!isNaN(endDate.getTime())) {
      const hours = endDate.getHours().toString().padStart(2, '0');
      const minutes = endDate.getMinutes().toString().padStart(2, '0');
      meetingEndTime = `${hours}:${minutes}`;
    }
  }

  if (meetingStartTime && meetingEndTime) {
    return meetingStartTime > meetingEndTime ? `${meetingEndTime} - ${meetingStartTime}` : `${meetingStartTime} - ${meetingEndTime}`;
  }

  return meetingStartTime || null;
};

const getMeetingStatusValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(meetingData.status || meetingData['סטטוס'] || 'פעיל');
};

const getMeetingEmailValue = (meeting: Meeting) => {
  const customer = getMeetingCustomer(meeting);
  const meetingData = meeting.meeting_data || {};
  return String(customer?.email || meetingData.email || meetingData['אימייל'] || '-');
};

const getMeetingPhoneValue = (meeting: Meeting) => {
  const customer = getMeetingCustomer(meeting);
  return String(customer?.phone || '-');
};

const getMeetingTypeValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(
    meetingData['סוג פגישה'] ||
    meetingData.meeting_type ||
    meetingData['פגישת הכרות'] ||
    meetingData.type ||
    'פגישת הכרות'
  );
};

const getMeetingNotesValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(
    meetingData.notes ||
    meetingData['הערות'] ||
    meetingData['תיאור'] ||
    meetingData.description ||
    '-'
  );
};

/**
 * Column definitions for Meetings table.
 */
export const meetingColumns: DataTableColumn<Meeting>[] = [
  {
    id: 'customer_name',
    header: 'לקוח',
    accessorKey: 'customer_name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const aName = getMeetingCustomer(rowA.original)?.full_name || '';
      const bName = getMeetingCustomer(rowB.original)?.full_name || '';
      return compareStrings(aName, bName);
    },
    cell: ({ row }) => {
      const customer = getMeetingCustomer(row.original);
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 180,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareNumbers(getMeetingDateSortValue(rowA.original), getMeetingDateSortValue(rowB.original)),
    cell: ({ row }) => {
      const dateValue = getMeetingDateDisplayValue(row.original);
      if (dateValue) return <span className="text-gray-700">{String(dateValue)}</span>;
      // Don't use submission date - show placeholder if actual meeting date not found
      return <span className="text-gray-400">-</span>;
    },
  },
  {
    id: 'meeting_time',
    header: 'שעה',
    accessorKey: 'meeting_time',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => {
      const aTime = getMeetingTimeDisplayValue(rowA.original) || '';
      const bTime = getMeetingTimeDisplayValue(rowB.original) || '';
      return compareStrings(aTime, bTime);
    },
    cell: ({ row }) => {
      const timeValue = getMeetingTimeDisplayValue(row.original);
      if (timeValue) return <span className="text-gray-700">{timeValue}</span>;
      
      return <span className="text-gray-400">-</span>;
    },
  },
  {
    id: 'phone',
    header: 'טלפון',
    accessorKey: 'phone',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareStrings(getMeetingPhoneValue(rowA.original), getMeetingPhoneValue(rowB.original)),
    cell: ({ row }) => {
      return <span className="font-mono text-sm text-gray-700">{getMeetingPhoneValue(row.original)}</span>;
    },
  },
  {
    id: 'status',
    header: 'סטטוס',
    accessorKey: 'status',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 120,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareStrings(getMeetingStatusValue(rowA.original), getMeetingStatusValue(rowB.original)),
    cell: ({ row }) => {
      const statusValue = getMeetingStatusValue(row.original);
      
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 200,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareStrings(getMeetingEmailValue(rowA.original), getMeetingEmailValue(rowB.original)),
    cell: ({ row }) => {
      const email = getMeetingEmailValue(row.original);
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
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 150,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareStrings(getMeetingTypeValue(rowA.original), getMeetingTypeValue(rowB.original)),
    cell: ({ row }) => {
      const meetingType = getMeetingTypeValue(row.original);
      return (
        <span className="text-sm font-medium text-gray-900">
          {String(meetingType)}
        </span>
      );
    },
  },
  {
    id: 'notes',
    header: 'הערות',
    accessorKey: 'notes',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    size: 250,
    meta: {
      align: 'right',
    },
    sortingFn: (rowA, rowB) => compareStrings(getMeetingNotesValue(rowA.original), getMeetingNotesValue(rowB.original)),
    cell: ({ row }) => {
      const notesStr = getMeetingNotesValue(row.original);
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
  {
    id: 'actions',
    header: 'פעולות',
    enableSorting: false,
    enableResizing: false,
    enableHiding: false,
    size: 100,
    meta: {
      align: 'center',
    },
    cell: ({ row }) => {
      return <MeetingDeleteButton meeting={row.original} />;
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
  notes: false,
  created_at: true,
  actions: true,
};
