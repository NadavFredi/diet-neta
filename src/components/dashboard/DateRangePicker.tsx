/**
 * Advanced Date Range Picker Component
 * 
 * Supports: Specific Date, Range (Start-End), Before, After
 */

import React, { useState, useEffect } from 'react';
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

export type FilterOperator = 'is' | 'isNot' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'before' | 'after' | 'between';

interface DateRangePickerProps {
  mode: 'single' | 'range' | 'before' | 'after';
  date?: Date;
  dateRange?: { from?: Date; to?: Date };
  onDateChange: (date: Date | undefined) => void;
  onDateRangeChange: (range: { from?: Date; to?: Date } | undefined) => void;
  operator?: FilterOperator; // Optional operator to control mode selector visibility
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  mode,
  date,
  dateRange,
  onDateChange,
  onDateRangeChange,
  operator,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'single' | 'range' | 'before' | 'after'>(mode);

  // Update current mode when mode prop changes
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Determine if mode selector should be shown
  // Hide it when operator is specified (controlled by parent filter)
  const showModeSelector = !operator;

  const handleModeChange = (newMode: 'single' | 'range' | 'before' | 'after') => {
    setCurrentMode(newMode);
    if (newMode === 'single') {
      onDateRangeChange(undefined);
    } else if (newMode === 'range') {
      onDateChange(undefined);
    }
  };

  const getDisplayText = (): string => {
    // Handle operator-based display
    if (operator === 'between') {
      return dateRange?.from && dateRange?.to 
        ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: he })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: he })}`
        : 'בחר טווח תאריכים';
    }
    if (operator === 'before' || operator === 'after') {
      return dateRange?.from 
        ? format(dateRange.from, 'dd/MM/yyyy', { locale: he })
        : 'בחר תאריך';
    }
    if (operator === 'equals') {
      return date 
        ? format(date, 'dd/MM/yyyy', { locale: he })
        : 'בחר תאריך';
    }
    
    // Handle mode-based display (when operator is not specified)
    if (currentMode === 'single' && date) {
      return format(date, 'dd/MM/yyyy', { locale: he });
    }
    if (currentMode === 'range' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: he })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: he })}`;
    }
    if ((currentMode === 'before' || currentMode === 'after') && dateRange?.from) {
      return format(dateRange.from, 'dd/MM/yyyy', { locale: he });
    }
    
    return 'בחר תאריך';
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Mode Selector - Only show when operator is not specified */}
      {showModeSelector && (
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
      )}

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
          {/* Range mode - for 'between' operator */}
          {(operator === 'between' || (currentMode === 'range' && !operator)) && (
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
          
          {/* Single date mode - for 'equals', 'before', 'after' operators or single mode */}
          {((operator === 'equals' || operator === 'before' || operator === 'after') || 
            (currentMode === 'single' && !operator) ||
            (currentMode === 'before' && !operator) ||
            (currentMode === 'after' && !operator)) && (
            <Calendar
              mode="single"
              selected={operator === 'equals' ? date : dateRange?.from}
              onSelect={(selectedDate) => {
                if (operator === 'before' || operator === 'after') {
                  onDateRangeChange({ from: selectedDate });
                } else {
                  onDateChange(selectedDate);
                }
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















