import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RootState } from '@/store/store';
import { Meeting } from '@/hooks/useMeetings';
import { 
  getMeetingDate, 
  getMeetingHour,
  getMeetingEndHour,
  generateHours
} from './utils';
import { DraggableMeetingCard, DroppableDateCell, DroppableTimeSlot } from './CalendarComponents';

interface DayViewProps {
  meetings: Meeting[];
  onAddMeeting?: (date: Date) => void;
}

export const DayView: React.FC<DayViewProps> = ({ meetings, onAddMeeting }) => {
  const navigate = useNavigate();
  const { currentDate } = useSelector((state: RootState) => state.calendar);
  const currentDay = useMemo(() => new Date(currentDate), [currentDate]);
  const today = new Date();
  
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto relative">
        {/* Day header */}
        <div className="flex border border-gray-200 sticky top-0 z-20 bg-white shadow-sm">
          <div className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-600 bg-white border-r border-gray-200 shrink-0"></div>
          <div
            className={cn(
              "flex-1 px-3 py-3 text-center bg-white border-r border-gray-200",
              isSameDay(currentDay, today) && "bg-blue-50"
            )}
          >
            <div className="text-xs text-gray-500 mb-1">{weekDays[currentDay.getDay()]}</div>
            <div className={cn(
              "text-base font-semibold",
              isSameDay(currentDay, today) ? "text-blue-600" : "text-gray-900"
            )}>
              {format(currentDay, 'd בMMMM yyyy', { locale: he })}
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div className="flex border-l border-r border-b border-gray-200">
          {/* Time column - way narrower */}
          <div className="w-16 bg-white border-r border-gray-200 shrink-0">
            {generateHours().map((hour, index) => (
              <div
                key={hour}
                className={cn(
                  "h-16 border-b border-gray-100 px-2 py-2 text-xs text-gray-500 text-center",
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                )}
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1">
              <div className="relative h-full min-h-[1152px] border-r border-gray-200">
                {/* Hour slots */}
                {generateHours().map((hour, index) => (
                  <DroppableTimeSlot
                    key={hour}
                    date={currentDay}
                    hour={hour}
                    isEven={index % 2 === 0}
                    onClick={() => {
                      const clickedDate = new Date(currentDay);
                      clickedDate.setHours(hour, 0, 0, 0);
                      onAddMeeting?.(clickedDate);
                    }}
                  />
                ))}

                {/* Meetings positioned by time */}
                {getMeetingsForDate(currentDay).map((meeting) => {
                  const meetingHour = getMeetingHour(meeting);
                  const meetingEndHour = getMeetingEndHour(meeting);
                  if (meetingHour === null) return null;

                  const duration = meetingEndHour ? (meetingEndHour - meetingHour) : 1; // Default to 1 hour
                  // Calculate position: each hour is 64px (h-16), starting from hour 6
                  const hoursFromStart = meetingHour - 6;
                  const topPosition = hoursFromStart * 64; // 64px per hour
                  const height = duration * 64; // Height based on duration

                  return (
                    <div
                      key={meeting.id}
                      className="absolute left-1 right-1 z-10 pointer-events-none"
                      style={{ 
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        minHeight: '48px'
                      }}
                    >
                      <div className="pointer-events-auto h-full">
                        <DraggableMeetingCard 
                          meeting={meeting} 
                          date={currentDay} 
                          isTimeBased={true}
                          onClick={() => navigate(`/dashboard/meetings/${meeting.id}`)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
