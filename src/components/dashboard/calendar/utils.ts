import { format, isValid, parseISO } from 'date-fns';
import type { Meeting } from '@/hooks/useMeetings';

export const availableFields = [
  { id: 'customer_name', label: 'שם לקוח', default: true },
  { id: 'time', label: 'שעה', default: true },
  { id: 'status', label: 'סטטוס', default: true },
  { id: 'type', label: 'סוג פגישה', default: false },
  { id: 'phone', label: 'טלפון', default: false },
  { id: 'email', label: 'אימייל', default: false },
];

export const getMeetingCustomer = (meeting: Meeting) => meeting.customer || (meeting.lead as any)?.customer;

export const getMeetingSchedulingData = (meetingData: Record<string, any>) => {
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

export const getMeetingDate = (meeting: Meeting): Date | null => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  
  // First try to get date from scheduling data
  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (isValid(startDate)) {
      return startDate;
    }
  }

  // Fallback to other date fields
  const dateStr = meetingData.date ||
    meetingData.meeting_date ||
    meetingData['תאריך'] ||
    meetingData['תאריך פגישה'] ||
    meetingData['Date'] ||
    meetingData['Meeting Date'] ||
    null;

  if (dateStr) {
    const parsed = parseISO(String(dateStr));
    if (isValid(parsed)) {
      return parsed;
    }
    // Try regular Date parse
    const date = new Date(String(dateStr));
    if (isValid(date)) {
      return date;
    }
  }

  return null;
};

export const getMeetingTimeDisplayValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  if (!schedulingData?.eventStartTime && !schedulingData?.eventEndTime) return null;

  let meetingStartTime: string | null = null;
  let meetingEndTime: string | null = null;

  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (isValid(startDate)) {
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      meetingStartTime = `${hours}:${minutes}`;
    }
  }

  if (schedulingData?.eventEndTime) {
    const endDate = new Date(schedulingData.eventEndTime);
    if (isValid(endDate)) {
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

export const getMeetingStatusValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(meetingData.status || meetingData['סטטוס'] || 'פעיל');
};

export const getMeetingTypeValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(
    meetingData['סוג פגישה'] ||
    meetingData.meeting_type ||
    meetingData['פגישת הכרות'] ||
    meetingData.type ||
    'פגישת הכרות'
  );
};

export const getMeetingHour = (meeting: Meeting): number | null => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  
  if (schedulingData?.eventStartTime) {
    const startDate = new Date(schedulingData.eventStartTime);
    if (!isNaN(startDate.getTime())) {
      return startDate.getHours() + startDate.getMinutes() / 60;
    }
  }
  
  // Try to parse time from other fields
  const timeStr = meetingData.meeting_time_start || meetingData['שעת התחלה'] || meetingData['שעה'];
  if (timeStr) {
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60;
    }
  }
  
  return null;
};

export const getMeetingEndHour = (meeting: Meeting): number | null => {
  const meetingData = meeting.meeting_data || {};
  const schedulingData = getMeetingSchedulingData(meetingData);
  
  if (schedulingData?.eventEndTime) {
    const endDate = new Date(schedulingData.eventEndTime);
    if (!isNaN(endDate.getTime())) {
      return endDate.getHours() + endDate.getMinutes() / 60;
    }
  }
  
  // Try to parse end time from other fields
  const timeStr = meetingData.meeting_time_end || meetingData['שעת סיום'];
  if (timeStr) {
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60;
    }
  }
  
  // Default to 1 hour duration if no end time
  const startHour = getMeetingHour(meeting);
  return startHour !== null ? startHour + 1 : null;
};

export const generateHours = () => {
  const hours = [];
  for (let i = 6; i <= 23; i++) {
    hours.push(i);
  }
  return hours;
};
