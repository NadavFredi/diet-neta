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
      
      // First, try to extract from Schedule field (actual meeting date/time from Fillout)
      let dateValue = null;
      if (meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות']) {
        const scheduleValue = meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות'];
        // Schedule field might be a datetime string or formatted date
        if (scheduleValue) {
          try {
            // Try to parse as date
            const scheduleDate = new Date(scheduleValue);
            if (!isNaN(scheduleDate.getTime())) {
              // Format as date only (without time)
              dateValue = formatDate(scheduleDate.toISOString());
            } else {
              // If parsing fails, try to extract date part from string
              const dateMatch = String(scheduleValue).match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
              if (dateMatch) {
                dateValue = dateMatch[0];
              } else {
                dateValue = String(scheduleValue).split(' ')[0]; // Take first part if space-separated
              }
            }
          } catch (e) {
            // If all parsing fails, use the raw value
            dateValue = String(scheduleValue);
          }
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
      
      // Debug: Log all keys to help identify time field (remove in production)
      if (process.env.NODE_ENV === 'development' && Object.keys(meetingData).length > 0) {
        const allKeys = Object.keys(meetingData);
        const timeRelatedKeys = allKeys.filter(key => {
          const keyLower = key.toLowerCase();
          return keyLower.includes('time') || keyLower.includes('hour') || keyLower.includes('שעה') || keyLower.includes('זמן');
        });
        if (timeRelatedKeys.length > 0) {
          console.log('[MeetingColumns] Time-related keys found:', timeRelatedKeys, meetingData);
        }
      }
      
      // First, try to extract from Schedule field (actual meeting date/time from Fillout)
      let timeValue = null;
      if (meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות']) {
        const scheduleValue = meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות'];
        if (scheduleValue) {
          try {
            // Try to parse as date and extract time
            const scheduleDate = new Date(scheduleValue);
            if (!isNaN(scheduleDate.getTime())) {
              // Extract time in HH:MM format
              const hours = scheduleDate.getHours().toString().padStart(2, '0');
              const minutes = scheduleDate.getMinutes().toString().padStart(2, '0');
              timeValue = `${hours}:${minutes}`;
            } else {
              // If parsing fails, try to extract time pattern from string (e.g., "11:00 AM")
              const timeMatch = String(scheduleValue).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3].toUpperCase();
                if (ampm === 'PM' && hours !== 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                timeValue = `${hours.toString().padStart(2, '0')}:${minutes}`;
              } else {
                // Try to find time pattern without AM/PM
                const timePatternMatch = String(scheduleValue).match(/(\d{1,2}):(\d{2})/);
                if (timePatternMatch) {
                  timeValue = timePatternMatch[0];
                }
              }
            }
          } catch (e) {
            // If parsing fails, continue to other fields
          }
        }
      }
      
      // Fallback to common field names - prioritize 'hour' field from form submission
      if (!timeValue) {
        timeValue = meetingData.hour ||
                   meetingData.time || 
                   meetingData.meeting_time || 
                   meetingData.start_time ||
                   meetingData.end_time ||
                   meetingData['שעה'] || 
                   meetingData['שעת פגישה'] ||
                   meetingData['שעת התחלה'] ||
                   meetingData['שעת סיום'] ||
                   meetingData['זמן'];
      }
      
      // If not found, search through ALL keys for time-related patterns
      // Prioritize 'hour' field first
      if (!timeValue) {
        const allKeys = Object.keys(meetingData);
        
        // First pass: look specifically for 'hour' field (case-insensitive)
        for (const key of allKeys) {
          const keyLower = key.toLowerCase();
          if (keyLower === 'hour' || keyLower === 'שעה') {
            const value = meetingData[key];
            if (value && value !== null && value !== '') {
              timeValue = value;
              break;
            }
          }
        }
        
        // Second pass: look for other time-related fields
        if (!timeValue) {
          for (const key of allKeys) {
            const keyLower = key.toLowerCase();
            const value = meetingData[key];
            
            // Check if key name suggests it's a time field
            if (keyLower.includes('time') || 
                keyLower.includes('hour') || 
                keyLower.includes('שעה') ||
                keyLower.includes('זמן')) {
              if (value && value !== null && value !== '') {
                timeValue = value;
                break;
              }
            }
            
            // Check if value looks like a time (HH:MM or HHMM format)
            if (value && typeof value === 'string') {
              const timePattern = /^(\d{1,2}):(\d{2})/; // HH:MM
              const timePatternNoColon = /^(\d{3,4})$/; // HHMM or HMM
              if (timePattern.test(value) || timePatternNoColon.test(value)) {
                timeValue = value;
                break;
              }
            }
          }
        }
      }
      
      // If no direct time field, try to extract from datetime strings
      if (!timeValue) {
        // Check all date fields
        const dateFields = ['date', 'meeting_date', 'start_date', 'end_date', 'תאריך', 'תאריך פגישה', 'תאריך התחלה', 'תאריך סיום'];
        for (const field of dateFields) {
          const dateValue = meetingData[field];
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
                  break;
                }
              } catch (e) {
                // If parsing fails, try to extract time pattern from string
                const timeMatch = dateValue.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                  timeValue = timeMatch[0];
                  break;
                }
              }
            }
          }
        }
      }
      
      // Format time value if it exists
      if (timeValue) {
        const timeStr = String(timeValue).trim();
        // If it's already in HH:MM format, use it
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
        // If it's in format like "14:30:00", extract just HH:MM
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          return <span className="text-gray-700">{timeMatch[0]}</span>;
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


