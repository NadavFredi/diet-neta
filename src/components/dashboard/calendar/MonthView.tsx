import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RootState } from '@/store/store';
import { Meeting } from '@/hooks/useMeetings';
import { 
  getMeetingDate, 
  getMeetingTimeDisplayValue, 
  getMeetingCustomer, 
  getMeetingStatusValue, 
  getMeetingTypeValue 
} from './utils';
import { DraggableMeetingCard, DroppableDateCell } from './CalendarComponents';

interface MonthViewProps {
  meetings: Meeting[];
  onAddMeeting?: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ meetings, onAddMeeting }) => {
  const navigate = useNavigate();
  const { currentDate, visibleFields } = useSelector((state: RootState) => state.calendar);
  const currentMonth = useMemo(() => new Date(currentDate), [currentDate]);
  const today = new Date();
  
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Group meetings by date (memoized for performance)
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

  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return meetingsByDate[dateKey] || [];
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const weeksCount = Math.ceil(calendarDays.length / 7);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-600 border-b border-gray-200"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days grid */}
      <div 
        className="flex-1 grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
      >
        {calendarDays.map((date, index) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayMeetings = getMeetingsForDate(date);
          const hasMeetings = dayMeetings.length > 0;
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = isSameDay(date, today);

          // Create a key that includes visibleFields to force re-render if needed
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
                  className="p-1"
                >
                  <div className="h-full flex flex-col">
                      {/* Date number */}
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isCurrentMonth ? "text-gray-900" : "text-gray-400",
                        isToday && "text-blue-600 font-bold"
                      )}>
                        {format(date, 'd')}
                      </div>

                      {/* Meeting content */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
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
                          <div className="flex items-center justify-center flex-1 opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-gray-300 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                onAddMeeting?.(date);
                            }} />
                          </div>
                        )}
                      </div>
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
                          if (status.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
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
  );
};
