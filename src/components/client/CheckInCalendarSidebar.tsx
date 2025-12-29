/**
 * CheckInCalendarSidebar Component
 * 
 * Right sidebar (30% width) containing:
 * - Interactive calendar for date selection
 * - History table showing recent dates with status icons
 */

import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedDate } from '@/store/slices/clientSlice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DailyCheckIn } from '@/store/slices/clientSlice';
import { DayPicker } from 'react-day-picker';

interface CheckInCalendarSidebarProps {
  checkIns: DailyCheckIn[];
}

// Helper function to format date as YYYY-MM-DD in local timezone (avoiding timezone issues)
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to create date from YYYY-MM-DD string in local timezone
const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const CheckInCalendarSidebar: React.FC<CheckInCalendarSidebarProps> = ({ checkIns }) => {
  const dispatch = useAppDispatch();
  const { selectedDate } = useAppSelector((state) => state.client);
  
  // Default to today if no date selected
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateObj = selectedDate ? parseDateLocal(selectedDate) : today;
  
  // State for the month being viewed (for navigation)
  const [viewMonth, setViewMonth] = useState(() => {
    const currentDate = selectedDateObj;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1);
  });

  // Create a map of dates that have check-ins
  const checkInDates = useMemo(() => {
    const dates = new Set<string>();
    checkIns.forEach((ci) => {
      dates.add(ci.check_in_date);
    });
    return dates;
  }, [checkIns]);

  // Get recent check-ins (last 7 days) for history table
  const recentCheckIns = useMemo(() => {
    const last7Days: Array<{ date: string; hasCheckIn: boolean }> = [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateLocal(date);
      last7Days.push({
        date: dateStr,
        hasCheckIn: checkInDates.has(dateStr),
      });
    }
    
    return last7Days;
  }, [checkInDates]);


  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Normalize date to local timezone (set to midnight)
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      const dateStr = formatDateLocal(normalizedDate);
      dispatch(setSelectedDate(dateStr));
    }
  };

  // Custom day renderer to show check-in status
  const modifiers = {
    hasCheckIn: (date: Date) => {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      const dateStr = formatDateLocal(normalizedDate);
      return checkInDates.has(dateStr);
    },
  };

  const modifiersClassNames = {
    hasCheckIn: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-[#5B6FB9] after:rounded-full',
  };

  // Initialize viewMonth only once on mount, don't update when selectedDate changes
  // This prevents the month from changing when user clicks a date
  useEffect(() => {
    const currentDate = selectedDateObj;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    setViewMonth(monthStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only initialize once on mount

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      {/* Calendar - Fixed Size */}
      <div className="bg-white overflow-hidden flex-shrink-0 p-3 pt-2 pb-3">
        <h3 className="text-sm uppercase tracking-widest text-black font-bold mb-2">לוח שנה</h3>
        <div className="overflow-hidden w-full">
          <DayPicker
            key={`calendar-${viewMonth.getFullYear()}-${viewMonth.getMonth()}`}
            mode="single"
            selected={selectedDateObj}
            onSelect={handleDateSelect}
            locale={he}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            showOutsideDays={true}
            fixedWeeks={true}
            month={viewMonth}
            numberOfMonths={1}
            className="rounded-md border-0 w-full p-0"
            classNames={{
              months: "flex flex-col space-y-1 w-full",
              month: "space-y-1 w-full",
              caption: "flex justify-center pt-0 pb-1 relative items-center mb-1",
              caption_label: "text-sm font-medium text-black",
              nav: "space-x-1 flex items-center",
              nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border border-slate-200 hover:border-[#5B6FB9] rounded",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-slate-500 rounded-md font-normal text-[0.7rem] flex-1 text-center min-w-0",
              row: "flex w-full mt-0.5",
              cell: "h-7 w-7 text-center text-xs p-0 relative flex-1 min-w-0 flex items-center justify-center",
              day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-md text-xs flex items-center justify-center w-full h-full text-black [&>span]:text-black",
              day_selected: "bg-[#5B6FB9] hover:bg-[#5B6FB9] focus:bg-[#5B6FB9] text-white !text-white font-semibold [&>span]:!text-white [&>span]:!font-semibold [&_*]:!text-white",
              day_today: "bg-slate-100 text-black font-semibold",
              day_outside: "text-slate-400 opacity-50",
              day_disabled: "text-slate-300 opacity-50",
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
              Caption: ({ displayMonth: _displayMonth }) => {
                // Show the viewMonth name instead of the display month
                return (
                  <div className="flex justify-center pt-0 pb-1 relative items-center mb-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const prevMonth = new Date(viewMonth);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setViewMonth(prevMonth);
                      }}
                      className="absolute left-1 h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border border-slate-200 hover:border-[#5B6FB9] rounded flex items-center justify-center transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-medium text-black">
                      {format(viewMonth, 'MMMM yyyy', { locale: he })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const nextMonth = new Date(viewMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setViewMonth(nextMonth);
                      }}
                      className="absolute right-1 h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border border-slate-200 hover:border-[#5B6FB9] rounded flex items-center justify-center transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              },
            }}
          />
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-3 pb-4 flex flex-col h-full">
          {/* Header */}
          <h3 className="text-sm uppercase tracking-widest text-black font-bold mb-2">היסטוריה</h3>
          
          {/* History List */}
          <div className="space-y-2">
            {recentCheckIns.map((item) => {
              const dateObj = parseDateLocal(item.date);
              const isSelected = selectedDate === item.date;
              const todayStr = formatDateLocal(today);
              const isToday = item.date === todayStr;
              
              return (
                <button
                  key={item.date}
                  onClick={() => dispatch(setSelectedDate(item.date))}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-md border transition-colors text-right",
                    isSelected
                      ? "bg-[#5B6FB9] text-white border-[#5B6FB9]"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-black"
                  )}
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    {item.hasCheckIn ? (
                      <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-white" : "text-[#5B6FB9]")} />
                    ) : (
                      <Circle className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-white/50" : "text-slate-300")} />
                    )}
                    <span className={cn("text-sm font-medium", isToday && !isSelected && "font-bold")}>
                      {format(dateObj, 'd בMMMM', { locale: he })}
                      {isToday && ' (היום)'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

