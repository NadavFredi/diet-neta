/**
 * Advanced Date Range Picker Component
 * 
 * Supports: Specific Date, Range (Start-End), Before, After
 */

import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  mode: 'single' | 'range' | 'before' | 'after';
  date?: Date;
  dateRange?: { from?: Date; to?: Date };
  onDateChange: (date: Date | undefined) => void;
  onDateRangeChange: (range: { from?: Date; to?: Date } | undefined) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  mode,
  date,
  dateRange,
  onDateChange,
  onDateRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'single' | 'range' | 'before' | 'after'>(mode);

  const handleModeChange = (newMode: 'single' | 'range' | 'before' | 'after') => {
    setCurrentMode(newMode);
    if (newMode === 'single') {
      onDateRangeChange(undefined);
    } else if (newMode === 'range') {
      onDateChange(undefined);
    }
  };

  const getDisplayText = (): string => {
    if (currentMode === 'single' && date) {
      return format(date, 'dd/MM/yyyy', { locale: he });
    }
    if (currentMode === 'range' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: he })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: he })}`;
    }
    if (currentMode === 'before' && dateRange?.from) {
      return `לפני ${format(dateRange.from, 'dd/MM/yyyy', { locale: he })}`;
    }
    if (currentMode === 'after' && dateRange?.from) {
      return `אחרי ${format(dateRange.from, 'dd/MM/yyyy', { locale: he })}`;
    }
    return 'בחר תאריך';
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Mode Selector */}
      <Select value={currentMode} onValueChange={handleModeChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value="single">תאריך ספציפי</SelectItem>
          <SelectItem value="range">טווח תאריכים</SelectItem>
          <SelectItem value="before">לפני תאריך</SelectItem>
          <SelectItem value="after">אחרי תאריך</SelectItem>
        </SelectContent>
      </Select>

      {/* Calendar */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-right font-normal",
              !date && !dateRange?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" dir="rtl">
          {currentMode === 'single' && (
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                onDateChange(selectedDate);
                setIsOpen(false);
              }}
              locale={he}
              initialFocus
            />
          )}
          {currentMode === 'range' && (
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                onDateRangeChange(range);
                if (range?.from && range?.to) {
                  setIsOpen(false);
                }
              }}
              locale={he}
              initialFocus
              numberOfMonths={2}
            />
          )}
          {(currentMode === 'before' || currentMode === 'after') && (
            <Calendar
              mode="single"
              selected={dateRange?.from}
              onSelect={(selectedDate) => {
                onDateRangeChange({ from: selectedDate });
                if (selectedDate) {
                  setIsOpen(false);
                }
              }}
              locale={he}
              initialFocus
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};








