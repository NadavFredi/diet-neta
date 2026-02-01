/**
 * MeetingsCalendarView Component
 * Displays meetings in a calendar format with one month view
 */

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO, isValid, addDays, setMonth, setYear, addWeeks, subWeeks, startOfWeek, endOfWeek, subMonths, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/hooks/useMeetings';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings, GripVertical } from 'lucide-react';
import {
  Popover as SettingsPopover,
  PopoverContent as SettingsPopoverContent,
  PopoverTrigger as SettingsPopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@dnd-kit/core';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

import { RootState } from '@/store/store';
import { 
  setCurrentDate, 
  setViewMode, 
  setCalendarViewType, 
  setSelectedYear, 
  toggleFieldVisibility,
  ViewMode,
  CalendarViewType
} from '@/store/slices/calendarSlice';
import { 
  availableFields, 
  getMeetingTimeDisplayValue, 
  getMeetingCustomer,
  getMeetingSchedulingData
} from './calendar/utils';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { MeetingDialog } from './dialogs/MeetingDialog';

interface MeetingsCalendarViewProps {
  meetings: Meeting[];
  onAddMeeting?: (date: Date) => void;
}

export const MeetingsCalendarView: React.FC<MeetingsCalendarViewProps> = ({ meetings, onAddMeeting }) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { 
    currentDate: currentDateStr, 
    viewMode, 
    calendarViewType, 
    selectedYear, 
    visibleFields 
  } = useSelector((state: RootState) => state.calendar);

  const currentDate = useMemo(() => new Date(currentDateStr), [currentDateStr]);
  const [draggedMeeting, setDraggedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setIsEditDialogOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const weekRange = useMemo(() => {
    if (calendarViewType === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start: weekStart, end: weekEnd };
    }
    return null;
  }, [currentDate, calendarViewType]);

  const updateMeetingDate = async (meetingId: string, newDate: Date, preserveTime: boolean = false) => {
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
      
      let newStartTime = new Date(newDate);
      let newEndTime = new Date(newDate);
      
      if (schedulingData?.eventStartTime) {
        const oldStart = new Date(schedulingData.eventStartTime);
        
        if (preserveTime) {
          // Keep the original time from the meeting
          newStartTime.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds());
          
          if (schedulingData?.eventEndTime) {
            const oldEnd = new Date(schedulingData.eventEndTime);
            newEndTime = new Date(newDate);
            newEndTime.setHours(oldEnd.getHours(), oldEnd.getMinutes(), oldEnd.getSeconds());
          }
        } else {
          // Use the time from newDate (which has the new hour) and preserve duration
          if (schedulingData?.eventEndTime) {
            const oldEnd = new Date(schedulingData.eventEndTime);
            const durationMs = oldEnd.getTime() - oldStart.getTime();
            newEndTime = new Date(newStartTime.getTime() + durationMs);
          } else {
            // Default 1 hour duration
            newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);
          }
        }
      } else if (!preserveTime) {
        // No existing scheduling data, use newDate time and 1 hour duration
        newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);
      }

      // Update meeting_data with new dates and times
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
        meeting_time_start: format(newStartTime, 'HH:mm'),
        meeting_time_end: format(newEndTime, 'HH:mm'),
        'שעת התחלה': format(newStartTime, 'HH:mm'),
        'שעת סיום': format(newEndTime, 'HH:mm'),
      };

      const { error: updateError } = await supabase
        .from('meetings')
        .update({ meeting_data: updatedMeetingData })
        .eq('id', meetingId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      
      toast({
        title: 'הצלחה',
        description: 'תאריך ושעת הפגישה עודכנו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן לעדכן את תאריך הפגישה',
        variant: 'destructive',
      });
    }
  };

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
    const targetId = over.id as string;

    // Handle dropping on specific time slot
    if (targetId.startsWith('slot:')) {
      // Format: slot:YYYY-MM-DD:HOUR
      const parts = targetId.split(':');
      if (parts.length === 3) {
        const dateStr = parts[1];
        const hourStr = parts[2];
        const targetDate = parseISO(dateStr);
        const hour = parseInt(hourStr, 10);
        
        if (isValid(targetDate) && !isNaN(hour)) {
          // Set the time to the specific hour dropped on
          targetDate.setHours(hour, 0, 0, 0);
          updateMeetingDate(meetingId, targetDate, false);
          return;
        }
      }
    }

    // Handle dropping on date (Month view)
    if (targetId.startsWith('date-')) {
      const dateStr = targetId.replace('date-', '');
      const targetDate = parseISO(dateStr);
      
      if (isValid(targetDate)) {
        updateMeetingDate(meetingId, targetDate, true);
      }
    }
  };

  const goToPrevious = () => {
    let newDate = new Date(currentDate);
    if (calendarViewType === 'month') {
      newDate = subMonths(newDate, 1);
    } else if (calendarViewType === 'week') {
      newDate = subWeeks(newDate, 1);
    } else if (calendarViewType === 'day') {
      newDate = addDays(newDate, -1);
    }
    dispatch(setCurrentDate(newDate.toISOString()));
  };

  const goToNext = () => {
    let newDate = new Date(currentDate);
    if (calendarViewType === 'month') {
      newDate = addMonths(newDate, 1);
    } else if (calendarViewType === 'week') {
      newDate = addWeeks(newDate, 1);
    } else if (calendarViewType === 'day') {
      newDate = addDays(newDate, 1);
    }
    dispatch(setCurrentDate(newDate.toISOString()));
  };

  const goToToday = () => {
    const today = new Date();
    dispatch(setCurrentDate(today.toISOString()));
    dispatch(setSelectedYear(today.getFullYear()));
    dispatch(setViewMode('calendar'));
  };

  const handleMonthClick = () => {
    dispatch(setViewMode('month'));
  };

  const handleYearClick = () => {
    dispatch(setSelectedYear(currentDate.getFullYear()));
    dispatch(setViewMode('year'));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(currentDate, monthIndex);
    dispatch(setCurrentDate(newDate.toISOString()));
    dispatch(setViewMode('calendar'));
  };

  const handleYearSelect = (year: number) => {
    dispatch(setSelectedYear(year));
    const newDate = setYear(currentDate, year);
    dispatch(setCurrentDate(newDate.toISOString()));
    dispatch(setViewMode('calendar'));
  };

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

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
              onClick={() => dispatch(setViewMode('year'))}
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
              onClick={() => dispatch(setViewMode('month'))}
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
                {calendarViewType === 'month' && format(currentDate, 'MMMM yyyy', { locale: he })}
                {calendarViewType === 'week' && weekRange && (
                  <>
                    {format(weekRange.start, 'd', { locale: he })} - {format(weekRange.end, 'd בMMMM yyyy', { locale: he })}
                  </>
                )}
                {calendarViewType === 'day' && format(currentDate, 'EEEE, d בMMMM yyyy', { locale: he })}
              </>
            )}
            {viewMode === 'month' && (
              <span 
                className="cursor-pointer hover:text-blue-600"
                onClick={handleYearClick}
              >
                {format(currentDate, 'yyyy', { locale: he })}
              </span>
            )}
            {viewMode === 'year' && 'בחר שנה'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'calendar' && (
            <Select 
              value={calendarViewType} 
              onValueChange={(value) => dispatch(setCalendarViewType(value as CalendarViewType))}
            >
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
                        onCheckedChange={() => dispatch(toggleFieldVisibility(field.id))}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-auto p-4 flex flex-col">
          {viewMode === 'calendar' && (
            <>
              {calendarViewType === 'month' && (
                <MonthView 
                  meetings={meetings} 
                  onAddMeeting={onAddMeeting} 
                  onEditMeeting={handleEditMeeting}
                />
              )}
              {calendarViewType === 'week' && (
                <WeekView 
                  meetings={meetings} 
                  onAddMeeting={onAddMeeting} 
                  onEditMeeting={handleEditMeeting}
                />
              )}
              {calendarViewType === 'day' && (
                <DayView 
                  meetings={meetings} 
                  onAddMeeting={onAddMeeting} 
                  onEditMeeting={handleEditMeeting}
                />
              )}
            </>
          )}

          {viewMode === 'month' && (
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((monthName, index) => (
                <Button
                  key={index}
                  variant={currentDate.getMonth() === index ? "default" : "outline"}
                  className={cn(
                    "h-16 text-sm",
                    currentDate.getMonth() === index && "bg-[#5B6FB9] text-white"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {monthName}
                </Button>
              ))}
            </div>
          )}

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
        </div>

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
      </DndContext>

      <div className="px-4 py-2 border-t border-gray-200 text-sm text-gray-600">
        {meetings.length} {meetings.length === 1 ? 'פגישה' : 'פגישות'}
      </div>

      {/* Edit Meeting Dialog */}
      <MeetingDialog
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingMeeting(null);
        }}
        meeting={editingMeeting}
      />
    </div>
  );
};