/**
 * MeetingsCalendarView Component
 * Displays meetings in a calendar format with one month view
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, setMonth, setYear, startOfDay, endOfDay, eachHourOfInterval, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/hooks/useMeetings';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Plus, Settings, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover as SettingsPopover,
  PopoverContent as SettingsPopoverContent,
  PopoverTrigger as SettingsPopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MeetingsCalendarViewProps {
  meetings: Meeting[];
  onAddMeeting?: (date: Date) => void;
}

// Available fields for calendar cards
const availableFields = [
  { id: 'customer_name', label: 'שם לקוח', default: true },
  { id: 'time', label: 'שעה', default: true },
  { id: 'status', label: 'סטטוס', default: true },
  { id: 'type', label: 'סוג פגישה', default: false },
  { id: 'phone', label: 'טלפון', default: false },
  { id: 'email', label: 'אימייל', default: false },
];

// Draggable Meeting Component
const DraggableMeetingCard = ({ meeting, date }: { meeting: Meeting; date: Date }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meeting.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const customer = getMeetingCustomer(meeting);
  const time = getMeetingTimeDisplayValue(meeting);
  const customerName = customer?.full_name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "text-xs text-gray-600 bg-gray-100 rounded px-1 py-0.5 cursor-grab active:cursor-grabbing flex items-center gap-1",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="h-3 w-3 text-gray-400" />
      {time && <span>{time}</span>}
      {customerName && <span className="font-medium">{customerName}</span>}
    </div>
  );
};

// Droppable Date Cell Component
const DroppableDateCell = ({ 
  date, 
  children, 
  isCurrentMonth, 
  isToday 
}: { 
  date: Date; 
  children: React.ReactNode;
  isCurrentMonth: boolean;
  isToday: boolean;
}) => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${dateKey}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] bg-white p-2 flex flex-col transition-colors",
        !isCurrentMonth && "bg-gray-50",
        isToday && "bg-blue-50 border-2 border-blue-500",
        isOver && "bg-blue-100 border-2 border-blue-400"
      )}
    >
      {children}
    </div>
  );
};

// Helper functions from meetingColumns.tsx
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

const getMeetingDate = (meeting: Meeting): Date | null => {
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

const getMeetingTimeDisplayValue = (meeting: Meeting) => {
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

const getMeetingStatusValue = (meeting: Meeting) => {
  const meetingData = meeting.meeting_data || {};
  return String(meetingData.status || meetingData['סטטוס'] || 'פעיל');
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

type ViewMode = 'calendar' | 'month' | 'year';
type CalendarViewType = 'month' | 'week' | 'day';

export const MeetingsCalendarView: React.FC<MeetingsCalendarViewProps> = ({ meetings, onAddMeeting }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [currentDay, setCurrentDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewType, setCalendarViewType] = useState<CalendarViewType>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [draggedMeeting, setDraggedMeeting] = useState<Meeting | null>(null);
  
  // Field visibility state - initialize with defaults
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    availableFields.forEach(field => {
      defaults[field.id] = field.default;
    });
    return defaults;
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    
    meetings.forEach((meeting) => {
      const meetingDate = getMeetingDate(meeting);
      if (meetingDate) {
        const dateKey = format(meetingDate, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(meeting);
      }
    });

    return grouped;
  }, [meetings]);

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return meetingsByDate[dateKey] || [];
  };

  // Get calendar days based on view type
  const calendarDays = useMemo(() => {
    if (calendarViewType === 'month') {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = 0
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (calendarViewType === 'week') {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // Day view
      return [currentDay];
    }
  }, [currentMonth, currentWeek, currentDay, calendarViewType]);

  // Get week range for display
  const weekRange = useMemo(() => {
    if (calendarViewType === 'week') {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
      return { start: weekStart, end: weekEnd };
    }
    return null;
  }, [currentWeek, calendarViewType]);

  // Update meeting date when dragged
  const updateMeetingDate = async (meetingId: string, newDate: Date) => {
    try {
      // Get the meeting to preserve existing data
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (fetchError || !meeting) throw fetchError;

      const meetingData = meeting.meeting_data || {};
      const schedulingData = getMeetingSchedulingData(meetingData);
      
      // Preserve the time from existing meeting
      let newStartTime = newDate;
      let newEndTime = newDate;
      
      if (schedulingData?.eventStartTime) {
        const oldStart = new Date(schedulingData.eventStartTime);
        newStartTime = new Date(newDate);
        newStartTime.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds());
        
        if (schedulingData?.eventEndTime) {
          const oldEnd = new Date(schedulingData.eventEndTime);
          newEndTime = new Date(newDate);
          newEndTime.setHours(oldEnd.getHours(), oldEnd.getMinutes(), oldEnd.getSeconds());
        }
      }

      // Update meeting_data with new dates
      const updatedMeetingData = {
        ...meetingData,
        'תאריך': format(newDate, 'yyyy-MM-dd'),
        'תאריך פגישה': format(newDate, 'yyyy-MM-dd'),
        date: format(newDate, 'yyyy-MM-dd'),
        meeting_date: format(newDate, 'yyyy-MM-dd'),
        event_start_time: newStartTime.toISOString(),
        eventStartTime: newStartTime.toISOString(),
        event_end_time: newEndTime.toISOString(),
        eventEndTime: newEndTime.toISOString(),
      };

      const { error: updateError } = await supabase
        .from('meetings')
        .update({ meeting_data: updatedMeetingData })
        .eq('id', meetingId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      
      toast({
        title: 'הצלחה',
        description: 'תאריך הפגישה עודכן בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן לעדכן את תאריך הפגישה',
        variant: 'destructive',
      });
    }
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const meetingId = active.id as string;
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setDraggedMeeting(meeting);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedMeeting(null);

    if (!over) return;

    const meetingId = active.id as string;
    const targetDateStr = over.id as string;

    // Parse target date (format: "date-YYYY-MM-DD")
    if (targetDateStr.startsWith('date-')) {
      const dateStr = targetDateStr.replace('date-', '');
      const targetDate = parseISO(dateStr);
      
      if (isValid(targetDate)) {
        updateMeetingDate(meetingId, targetDate);
      }
    }
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (calendarViewType === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    } else if (calendarViewType === 'week') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else if (calendarViewType === 'day') {
      setCurrentDay(addDays(currentDay, -1));
    }
  };

  const goToNext = () => {
    if (calendarViewType === 'month') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    } else if (calendarViewType === 'week') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else if (calendarViewType === 'day') {
      setCurrentDay(addDays(currentDay, 1));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setCurrentWeek(today);
    setCurrentDay(today);
    setSelectedYear(today.getFullYear());
    setViewMode('calendar');
  };

  const handleMonthClick = () => {
    setViewMode('month');
  };

  const handleYearClick = () => {
    setSelectedYear(currentMonth.getFullYear());
    setViewMode('year');
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setViewMode('calendar');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setCurrentMonth(setYear(currentMonth, year));
    setViewMode('calendar');
  };

  const toggleFieldVisibility = (fieldId: string) => {
    setVisibleFields(prev => {
      const newFields = {
        ...prev,
        [fieldId]: !prev[fieldId]
      };
      return newFields;
    });
  };

  const today = new Date();
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Hebrew: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  // Generate years for year picker (current year ± 10 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      yearsList.push(i);
    }
    return yearsList;
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white" dir="rtl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {viewMode === 'calendar' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          {viewMode === 'month' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('year')}
              className="h-8 px-3 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              {selectedYear}
            </Button>
          )}
          {viewMode === 'year' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-8 px-3 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              {selectedYear - 10} - {selectedYear + 10}
            </Button>
          )}
          <h2 
            className={cn(
              "text-lg font-semibold text-gray-900 min-w-[180px] text-center transition-colors",
              viewMode === 'calendar' && "cursor-pointer hover:text-blue-600"
            )}
            onClick={viewMode === 'calendar' ? handleMonthClick : undefined}
          >
            {viewMode === 'calendar' && (
              <>
                {calendarViewType === 'month' && format(currentMonth, 'MMMM yyyy', { locale: he })}
                {calendarViewType === 'week' && weekRange && (
                  <>
                    {format(weekRange.start, 'd', { locale: he })} - {format(weekRange.end, 'd בMMMM yyyy', { locale: he })}
                  </>
                )}
                {calendarViewType === 'day' && format(currentDay, 'EEEE, d בMMMM yyyy', { locale: he })}
              </>
            )}
            {viewMode === 'month' && (
              <span 
                className="cursor-pointer hover:text-blue-600"
                onClick={handleYearClick}
              >
                {format(currentMonth, 'yyyy', { locale: he })}
              </span>
            )}
            {viewMode === 'year' && 'בחר שנה'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* View Type Selector */}
          {viewMode === 'calendar' && (
            <Select value={calendarViewType} onValueChange={(value) => setCalendarViewType(value as CalendarViewType)}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="month">חודש</SelectItem>
                <SelectItem value="week">שבוע</SelectItem>
                <SelectItem value="day">יום</SelectItem>
              </SelectContent>
            </Select>
          )}
          <SettingsPopover>
            <SettingsPopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </SettingsPopoverTrigger>
            <SettingsPopoverContent className="w-64" dir="rtl">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm mb-3">שדות להצגה בכרטיסי פגישות</h4>
                {availableFields.map((field) => {
                  const isChecked = visibleFields[field.id] ?? field.default;
                  return (
                    <div key={field.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setVisibleFields(prev => ({
                            ...prev,
                            [field.id]: checked === true
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`field-${field.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {field.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </SettingsPopoverContent>
          </SettingsPopover>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-sm"
          >
            היום
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-auto p-4">
          {viewMode === 'calendar' && (
            <div className="w-full">
            {/* Days of week header */}
            {calendarViewType !== 'day' && (
              <div className={cn(
                "grid gap-px bg-gray-200 border border-gray-200 rounded-t-lg",
                calendarViewType === 'month' && "grid-cols-7",
                calendarViewType === 'week' && "grid-cols-7"
              )}>
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-600 border-b border-gray-200"
                  >
                    {day}
                  </div>
                ))}
              </div>
            )}

            {/* Calendar days grid */}
            <div className={cn(
              "grid gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg",
              calendarViewType === 'month' && "grid-cols-7",
              calendarViewType === 'week' && "grid-cols-7",
              calendarViewType === 'day' && "grid-cols-1"
            )}>
              {calendarDays.map((date, index) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayMeetings = getMeetingsForDate(date);
                const hasMeetings = dayMeetings.length > 0;
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(date, today);
                const firstMeeting = dayMeetings[0];
                const firstMeetingTime = firstMeeting ? getMeetingTimeDisplayValue(firstMeeting) : null;
                
                // Create a key that includes visibleFields to force re-render
                const fieldsKey = Object.entries(visibleFields)
                  .filter(([_, visible]) => visible)
                  .map(([id]) => id)
                  .sort()
                  .join('-');

                return (
                  <Popover key={`${dateKey}-${index}-${fieldsKey}`}>
                    <PopoverTrigger asChild>
                      <DroppableDateCell 
                        date={date}
                        isCurrentMonth={isCurrentMonth}
                        isToday={isToday}
                      >
                        {/* Date number */}
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          isCurrentMonth ? "text-gray-900" : "text-gray-400",
                          isToday && "text-blue-600 font-bold"
                        )}>
                          {format(date, 'd')}
                        </div>

                        {/* Meeting content */}
                        <div className="flex-1 flex flex-col gap-1">
                          {hasMeetings ? (
                            <>
                              {dayMeetings.slice(0, 3).map((meeting) => (
                                <DraggableMeetingCard key={meeting.id} meeting={meeting} date={date} />
                              ))}
                              {dayMeetings.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{dayMeetings.length - 3} נוספות
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center justify-center flex-1">
                              <Plus className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                      </DroppableDateCell>
                    </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start" dir="rtl">
                          {hasMeetings ? (
                            <>
                              <div className="p-3 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {format(date, 'EEEE, d בMMMM yyyy', { locale: he })}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {dayMeetings.length} {dayMeetings.length === 1 ? 'פגישה' : 'פגישות'}
                                </p>
                              </div>
                              <div className="max-h-96 overflow-y-auto">
                                {dayMeetings.map((meeting) => {
                                  const customer = getMeetingCustomer(meeting);
                                  const time = getMeetingTimeDisplayValue(meeting);
                                  const status = getMeetingStatusValue(meeting);
                                  const type = getMeetingTypeValue(meeting);
                                  const phone = customer?.phone || '-';
                                  const email = customer?.email || '-';

                                  const getStatusColor = (status: string) => {
                                    if (status.includes('בוטל') || status.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
                                    if (status.includes('הושלם') || status.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
                                    if (status.includes('מתוכנן') || status.includes('תוכנן')) return 'bg-blue-50 text-blue-700 border-blue-200';
                                    return 'bg-gray-50 text-gray-700 border-gray-200';
                                  };

                                  return (
                                    <div
                                      key={meeting.id}
                                      className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                      onClick={() => {
                                        navigate(`/dashboard/meetings/${meeting.id}`);
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0 space-y-1">
                                          {visibleFields.customer_name && (
                                            <div className="font-medium text-gray-900 truncate">
                                              {customer?.full_name || '-'}
                                            </div>
                                          )}
                                          {visibleFields.time && time && (
                                            <div className="text-sm text-gray-600">
                                              {time}
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {visibleFields.status && (
                                              <Badge variant="outline" className={cn("text-xs", getStatusColor(status))}>
                                                {status}
                                              </Badge>
                                            )}
                                            {visibleFields.type && type && (
                                              <span className="text-xs text-gray-500">{type}</span>
                                            )}
                                            {visibleFields.phone && phone !== '-' && (
                                              <span className="text-xs text-gray-500">{phone}</span>
                                            )}
                                            {visibleFields.email && email !== '-' && (
                                              <span className="text-xs text-gray-500 truncate max-w-[150px]">{email}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Always show "Create Appointment" button */}
                              <div className="p-3 border-t border-gray-200">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => onAddMeeting?.(date)}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  צור פגישה חדשה
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="p-3 text-center space-y-3">
                              <p className="text-sm text-gray-500">אין פגישות בתאריך זה</p>
                              {onAddMeeting && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => onAddMeeting(date)}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  צור פגישה חדשה
                                </Button>
                              )}
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                );
              })}
            </div>
          </div>
        )}

        {/* Month Picker */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((monthName, index) => (
              <Button
                key={index}
                variant={currentMonth.getMonth() === index ? "default" : "outline"}
                className={cn(
                  "h-16 text-sm",
                  currentMonth.getMonth() === index && "bg-[#5B6FB9] text-white"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {monthName}
              </Button>
            ))}
          </div>
        )}

        {/* Year Picker */}
        {viewMode === 'year' && (
          <div className="grid grid-cols-4 gap-2">
            {years.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? "default" : "outline"}
                className={cn(
                  "h-16 text-sm",
                  selectedYear === year && "bg-[#5B6FB9] text-white"
                )}
                onClick={() => handleYearSelect(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedMeeting && (
            <div className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 shadow-lg flex items-center gap-1">
              <GripVertical className="h-3 w-3 text-gray-400" />
              {getMeetingTimeDisplayValue(draggedMeeting) && (
                <span>{getMeetingTimeDisplayValue(draggedMeeting)}</span>
              )}
              {getMeetingCustomer(draggedMeeting)?.full_name && (
                <span className="font-medium">{getMeetingCustomer(draggedMeeting)?.full_name}</span>
              )}
            </div>
          )}
        </DragOverlay>
        </div>
      </DndContext>

      {/* Footer with record count */}
      <div className="px-4 py-2 border-t border-gray-200 text-sm text-gray-600">
        {meetings.length} {meetings.length === 1 ? 'פגישה' : 'פגישות'}
      </div>
    </div>
  );
};
