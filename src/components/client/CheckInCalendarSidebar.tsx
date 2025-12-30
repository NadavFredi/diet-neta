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


  const handleDateSelect = (date: Date) => {
    // Normalize date to local timezone (set to midnight)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = formatDateLocal(normalizedDate);
    dispatch(setSelectedDate(dateStr));
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

  // Calculate days in month for custom calendar rendering with one week before and after
  const daysInMonth = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday (א), 6 = Saturday (ש)
    
    const days: Date[] = [];
    
    // Add one week before the month starts (exactly 7 days from previous month)
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    // Calculate how many days we need from previous month to fill the first week
    const daysNeededBefore = startingDayOfWeek;
    
    // Add days from previous month (exactly the days needed, up to 7)
    for (let i = daysNeededBefore - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      days.push(new Date(prevYear, prevMonth, day));
    }
    
    // Add all days in the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add one week after the month ends (exactly 7 days from next month)
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const totalDays = days.length;
    const daysNeededAfter = 7 - (totalDays % 7);
    
    // Add exactly the days needed to complete the last week (max 7 days)
    for (let day = 1; day <= Math.min(daysNeededAfter, 7); day++) {
      days.push(new Date(nextYear, nextMonth, day));
    }
    
    return days;
  }, [viewMonth]);

  // Hebrew day labels (א-ש)
  const hebrewDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      {/* Calendar - Professional Grid */}
      <div className="bg-white overflow-hidden flex-shrink-0 p-3 pt-2 pb-2">
        <h3 className="text-xs uppercase tracking-wide text-black font-bold mb-2 text-center">לוח שנה</h3>
        
        {/* Month Header */}
        <div className="flex justify-center items-center relative mb-1.5 pb-1.5 border-b border-slate-200">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const prevMonth = new Date(viewMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setViewMonth(prevMonth);
            }}
            className="absolute left-0 h-5 w-5 bg-transparent p-0 opacity-60 hover:opacity-100 border border-slate-200 hover:border-[#5B6FB9] rounded flex items-center justify-center transition-all"
          >
            <ChevronLeft className="h-2.5 w-2.5" />
          </button>
          <div className="text-xs font-medium text-black">
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
            className="absolute right-0 h-5 w-5 bg-transparent p-0 opacity-60 hover:opacity-100 border border-slate-200 hover:border-[#5B6FB9] rounded flex items-center justify-center transition-all"
          >
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Day Headers - 7 Column Grid */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {hebrewDays.map((day) => (
            <div
              key={day}
              className="aspect-square flex items-center justify-center"
            >
              <span className="text-[9px] font-bold text-slate-600">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid - 7 Columns, Shows one week before and after */}
        <div className="grid grid-cols-7 gap-0.5">
          {daysInMonth.map((date, index) => {
            const dateStr = formatDateLocal(date);
            const isSelected = selectedDate === dateStr;
            const todayStr = formatDateLocal(today);
            const isToday = dateStr === todayStr;
            const hasCheckIn = checkInDates.has(dateStr);
            const isOutsideMonth = date.getMonth() !== viewMonth.getMonth();
            
            return (
              <button
                key={`${dateStr}-${index}`}
                type="button"
                onClick={() => handleDateSelect(date)}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-full transition-all",
                  "text-[10px] font-medium",
                  isSelected
                    ? "bg-[#5B6FB9] text-white shadow-md ring-2 ring-[#5B6FB9]/30"
                    : isToday
                    ? "bg-slate-100 text-black font-semibold hover:bg-slate-200"
                    : isOutsideMonth
                    ? "text-slate-400 hover:bg-slate-50 opacity-60"
                    : "text-slate-700 hover:bg-slate-50",
                  hasCheckIn && !isSelected && "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#5B6FB9] after:rounded-full"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white flex-1 flex flex-col overflow-hidden border-t border-slate-200">
        <div className="px-3 pt-2 pb-3 flex flex-col h-full">
          {/* Header - Aligned with calendar grid */}
          <h3 className="text-xs uppercase tracking-wide text-black font-bold mb-2 text-center">היסטוריה</h3>
          
          {/* History List */}
          <div className="space-y-1.5">
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
                    "w-full flex items-center justify-between p-1.5 rounded-md border transition-colors text-right",
                    isSelected
                      ? "bg-[#5B6FB9] text-white border-[#5B6FB9]"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-black"
                  )}
                  dir="rtl"
                >
                  <div className="flex items-center gap-1.5">
                    {item.hasCheckIn ? (
                      <CheckCircle2 className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-white" : "text-[#5B6FB9]")} />
                    ) : (
                      <Circle className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-white/50" : "text-slate-300")} />
                    )}
                    <span className={cn("text-xs font-medium", isToday && !isSelected && "font-bold")}>
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
