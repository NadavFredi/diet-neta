/**
 * InlineEditableField Component
 * 
 * User-friendly inline editing component with hover-to-edit UX.
 * Shows edit icon on hover, click to edit, with save/cancel buttons.
 */

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Edit, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { he } from 'date-fns/locale';

export interface InlineEditableFieldRef {
  save: () => Promise<void>;
  cancel: () => void;
  isEditing: boolean;
}

interface InlineEditableFieldProps {
  label: string;
  value: string | number;
  onSave: (newValue: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel';
  formatValue?: (value: string | number) => string;
  className?: string;
  valueClassName?: string;
  disabled?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

export const InlineEditableField = forwardRef<InlineEditableFieldRef, InlineEditableFieldProps>(({
  label,
  value,
  onSave,
  type = 'text',
  formatValue,
  className,
  valueClassName,
  disabled = false,
  onEditingChange,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTypingMode, setIsTypingMode] = useState(false);
  const lastPointerDownInsideRef = useRef(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'day' | 'month' | 'year'>('day');
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (type === 'date' && value) {
      const date = new Date(String(value));
      return isValid(date) ? new Date(date.getFullYear(), date.getMonth(), 1) : new Date();
    }
    return new Date();
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert string date to Date object for calendar
  const dateValue = useMemo(() => {
    if (type === 'date' && editValue) {
      // Try parsing with common formats
      const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'];
      for (const fmt of formats) {
        try {
          const parsed = parse(editValue, fmt, new Date());
          if (isValid(parsed)) {
            return parsed;
          }
        } catch {
          continue;
        }
      }
      // Fallback to Date constructor
      const date = new Date(editValue);
      return isValid(date) ? date : undefined;
    }
    return undefined;
  }, [editValue, type]);

  // Update viewMonth when calendar opens and reset view
  useEffect(() => {
    if (isCalendarOpen) {
      setCalendarView('day');
      if (dateValue) {
        setViewMonth(new Date(dateValue.getFullYear(), dateValue.getMonth(), 1));
      }
    }
  }, [isCalendarOpen, dateValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    // Only update editValue if we're not currently editing or saving
    // This prevents the value from reverting while saving
    if (!isEditing && !isSaving) {
      console.log('[InlineEditableField] Value changed from external source:', { oldValue: editValue, newValue: value, type });
      setEditValue(String(value));
    }
  }, [value, isEditing, isSaving, editValue, type]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(String(value));
  }, [value]);

  const handleSave = useCallback(async () => {
    console.log('[InlineEditableField] handleSave called', {
      editValue,
      value,
      type,
      isTypingMode,
      editValueType: typeof editValue
    });

    if (editValue === String(value)) {
      console.log('[InlineEditableField] No change detected, skipping save');
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      let finalValue: string | number = editValue;

      if (type === 'number') {
        finalValue = Number(editValue);
        if (isNaN(finalValue)) {
          throw new Error('מספר לא תקין');
        }
        // Additional validation for very large numbers that might cause overflow
        if (Math.abs(finalValue) > 1000000) {
          throw new Error('המספר גדול מדי');
        }
      } else if (type === 'date') {
        console.log('[InlineEditableField] Processing date type', { editValue, editValueLength: editValue?.length });

        // Parse the date value before saving
        if (editValue && editValue.trim()) {
          const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'dd.MM.yyyy', 'd.M.yyyy', 'yyyy-MM-dd', 'd/M/yy', 'dd/MM/yy'];
          let parsed: Date | null = null;

          console.log('[InlineEditableField] Trying to parse date with formats:', formats);

          for (const fmt of formats) {
            try {
              const attempt = parse(editValue, fmt, new Date());
              console.log('[InlineEditableField] Parse attempt', { format: fmt, result: attempt, isValid: isValid(attempt) });
              if (isValid(attempt)) {
                parsed = attempt;
                console.log('[InlineEditableField] Successfully parsed date:', parsed);
                break;
              }
            } catch (err) {
              console.log('[InlineEditableField] Parse failed for format', fmt, err);
              continue;
            }
          }

          // If parsed successfully, format it as YYYY-MM-DD for storage
          if (parsed && isValid(parsed)) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            finalValue = `${year}-${month}-${day}`;
            console.log('[InlineEditableField] Formatted date for storage:', finalValue);
          } else {
            console.log('[InlineEditableField] Date parsing failed, trying YYYY-MM-DD format');
            // Invalid date - try to parse as YYYY-MM-DD directly
            if (/^\d{4}-\d{2}-\d{2}$/.test(editValue)) {
              const date = new Date(editValue);
              console.log('[InlineEditableField] Direct Date constructor result:', date, 'isValid:', isValid(date));
              if (isValid(date)) {
                finalValue = editValue;
                console.log('[InlineEditableField] Using direct YYYY-MM-DD format:', finalValue);
              } else {
                console.error('[InlineEditableField] Invalid date format');
                throw new Error('תאריך לא תקין');
              }
            } else {
              console.error('[InlineEditableField] No valid date format found for:', editValue);
              throw new Error('תאריך לא תקין');
            }
          }
        } else {
          // Empty date - allow it
          console.log('[InlineEditableField] Empty date value, allowing');
          finalValue = '';
        }
      }

      console.log('[InlineEditableField] Final value to save:', finalValue);

      // Update local state optimistically
      setEditValue(String(finalValue));
      setIsEditing(false);
      setIsTypingMode(false);

      // Await the save to ensure it completes
      try {
        console.log('[InlineEditableField] Calling onSave with:', finalValue);
        await onSave(finalValue);
        console.log('[InlineEditableField] onSave completed successfully');
      } catch (error) {
        console.error('[InlineEditableField] onSave failed:', error);
        // On error, revert to original value
        setEditValue(String(value));
        setIsEditing(true);
        throw error;
      }
    } catch (error) {
      console.error('[InlineEditableField] Save error:', error);
      setEditValue(String(value));
      setIsSaving(false);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, type, onSave, isTypingMode]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    cancel: handleCancel,
    isEditing,
  }), [handleSave, handleCancel, isEditing]);

  // Store callback in ref to avoid dependency issues
  const onEditingChangeRef = useRef(onEditingChange);

  // Update ref when callback changes
  useEffect(() => {
    onEditingChangeRef.current = onEditingChange;
  }, [onEditingChange]);

  // Track previous editing state to avoid unnecessary calls
  const prevIsEditingRef = useRef(isEditing);

  // Notify parent of editing state changes (only when state actually changes)
  useEffect(() => {
    if (prevIsEditingRef.current !== isEditing) {
      prevIsEditingRef.current = isEditing;
      onEditingChangeRef.current?.(isEditing);
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(String(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatValue ? formatValue(value) : String(value);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD for storage
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setEditValue(formattedDate);
      setIsCalendarOpen(false);
      setCalendarView('day');
    }
  }, []);

  const handleSelectMonth = useCallback((month: number, year: number) => {
    const currentDate = dateValue || new Date();
    const newDate = new Date(year, month, currentDate.getDate() || 1);
    // Handle month length issues
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    if (currentDate.getDate() > lastDayOfMonth) {
      newDate.setDate(lastDayOfMonth);
    }
    handleDateSelect(newDate);
  }, [dateValue, handleDateSelect]);

  const handleSelectYear = useCallback((year: number) => {
    const currentDate = dateValue || new Date();
    const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate() || 1);
    // Handle leap year and month length issues
    const lastDayOfMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    if (currentDate.getDate() > lastDayOfMonth) {
      newDate.setDate(lastDayOfMonth);
    }
    handleDateSelect(newDate);
  }, [dateValue, handleDateSelect]);

  // Format date value for display in input (dd/mm/yyyy)
  // When typing, show raw input; when not typing, show formatted date
  const displayDateValue = useMemo(() => {
    if (type === 'date') {
      // If user is actively typing, show the raw input value
      if (isTypingMode) {
        return editValue;
      }

      // Otherwise, format the date for display
      if (editValue) {
        // Try to parse and format
        const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'd/M/yy', 'dd/MM/yy'];
        for (const fmt of formats) {
          try {
            const parsed = parse(editValue, fmt, new Date());
            if (isValid(parsed)) {
              return format(parsed, 'dd/MM/yyyy');
            }
          } catch {
            continue;
          }
        }
        // If it's already in YYYY-MM-DD format, convert it
        if (/^\d{4}-\d{2}-\d{2}$/.test(editValue)) {
          const date = new Date(editValue);
          if (isValid(date)) {
            return format(date, 'dd/MM/yyyy');
          }
        }
        // If it looks like a partial date being typed, return as-is
        return editValue;
      }
    }
    return editValue;
  }, [editValue, type, isTypingMode]);

  if (isEditing) {
    return (
      <div className={cn('flex flex-col gap-1.5 py-0.5 min-w-0 w-full text-right', className)}>
        <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}:</span>
        <div className="relative flex-1 min-w-0">
          {type === 'date' ? (
            <div className="relative flex-1 min-w-0">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="relative w-full">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={displayDateValue}
                      onChange={(e) => {
                        // Mark that user is actively typing
                        setIsTypingMode(true);
                        // Close calendar when user starts typing
                        if (isCalendarOpen) {
                          setIsCalendarOpen(false);
                        }
                        // Allow free typing - don't restrict or format while typing
                        const rawValue = e.target.value;
                        // Only allow digits, slashes, dashes, and dots
                        const sanitized = rawValue.replace(/[^\d./-]/g, '');
                        setEditValue(sanitized);
                      }}
                      onKeyDown={(e) => {
                        // Enter typing mode on any printable key
                        const isPrintableKey = e.key.length === 1 || ['Backspace', 'Delete'].includes(e.key);
                        const isNavigationKey = ['Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key);

                        if (!isTypingMode && isPrintableKey && !isNavigationKey) {
                          setIsTypingMode(true);
                          setIsCalendarOpen(false);
                          requestAnimationFrame(() => {
                            inputRef.current?.select();
                          });
                        } else if (e.key === 'Enter') {
                          handleSave();
                        } else if (e.key === 'Escape') {
                          handleCancel();
                        }
                      }}
                      onFocus={(e) => {
                        if (!isSaving && !isTypingMode) {
                          setIsCalendarOpen(true);
                        }
                        // Reset typing mode on focus if not actively typing
                        if (!isTypingMode) {
                          setIsTypingMode(false);
                        }
                      }}
                      onBlur={(e) => {
                        console.log('[InlineEditableField] onBlur triggered', {
                          isTypingMode,
                          editValue,
                          relatedTarget: e.relatedTarget
                        });

                        // Don't close calendar if clicking inside it
                        const relatedTarget = e.relatedTarget as HTMLElement | null;
                        if (relatedTarget && relatedTarget.closest('[data-date-picker-portal]')) {
                          console.log('[InlineEditableField] Blur caused by calendar click, ignoring');
                          return;
                        }
                        // If in typing mode, parse and validate the date
                        if (isTypingMode && editValue) {
                          console.log('[InlineEditableField] Processing blur in typing mode');
                          // Try to parse the typed value
                          const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'dd.MM.yyyy', 'd.M.yyyy', 'yyyy-MM-dd', 'd/M/yy', 'dd/MM/yy'];
                          let parsed: Date | null = null;

                          for (const fmt of formats) {
                            try {
                              const attempt = parse(editValue, fmt, new Date());
                              if (isValid(attempt)) {
                                parsed = attempt;
                                console.log('[InlineEditableField] Parsed date in blur:', parsed);
                                break;
                              }
                            } catch {
                              continue;
                            }
                          }

                          // If parsed successfully, format it properly
                          if (parsed && isValid(parsed)) {
                            const year = parsed.getFullYear();
                            const month = String(parsed.getMonth() + 1).padStart(2, '0');
                            const day = String(parsed.getDate()).padStart(2, '0');
                            const formatted = `${year}-${month}-${day}`;
                            console.log('[InlineEditableField] Formatted date in blur:', formatted);
                            setEditValue(formatted);
                          } else {
                            // Invalid date - restore to last valid value
                            console.log('[InlineEditableField] Invalid date in blur, restoring to:', value);
                            if (value) {
                              setEditValue(String(value));
                            }
                          }
                          setIsTypingMode(false);
                        }
                        setIsCalendarOpen(false);
                      }}
                      placeholder="dd/mm/yyyy"
                      className={cn(
                        "w-full h-8 text-sm pr-10 pl-3",
                        "border-2 border-[#5B6FB9] focus:border-[#5B6FB9] focus-visible:ring-2 focus-visible:ring-[#5B6FB9]/20",
                        "transition-all duration-200",
                        "bg-white"
                      )}
                      disabled={isSaving}
                      dir="rtl"
                      onClick={() => {
                        if (!isSaving && !isTypingMode) {
                          setIsCalendarOpen(true);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute right-0 top-0 h-8 w-10 flex items-center justify-center",
                        "border-0 bg-transparent hover:bg-[#5B6FB9]/10 rounded-l-md",
                        "focus:outline-none focus:ring-2 focus:ring-[#5B6FB9]/20",
                        "transition-colors duration-200",
                        "border-r-2 border-r-[#5B6FB9] pointer-events-none"
                      )}
                      disabled={isSaving}
                    >
                      <CalendarIcon className="h-4 w-4 text-[#5B6FB9]" />
                    </button>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="end"
                  dir="rtl"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => {
                    // Don't close if clicking on the input or inside the calendar
                    const target = e.target as HTMLElement;
                    if (target === inputRef.current || target.closest('[data-date-picker-portal]')) {
                      e.preventDefault();
                    }
                  }}
                  onClick={(e) => {
                    // Prevent clicks inside calendar from closing it
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    // Prevent mousedown from causing blur on input
                    e.preventDefault();
                  }}
                  data-date-picker-portal
                >
                  {calendarView === 'day' && (
                    <div>
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-2 z-10">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                            }}
                            aria-label="חודש קודם"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCalendarView('month');
                            }}
                          >
                            {format(viewMonth, 'MMMM yyyy', { locale: he })}
                          </button>
                          <button
                            type="button"
                            className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                            }}
                            aria-label="חודש הבא"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const today = new Date();
                            handleDateSelect(today);
                          }}
                        >
                          היום
                        </button>
                      </div>
                      <Calendar
                        key={viewMonth.toISOString()}
                        mode="single"
                        selected={dateValue ?? undefined}
                        onSelect={handleDateSelect}
                        month={viewMonth}
                        onMonthChange={setViewMonth}
                        initialFocus
                        locale={he}
                        classNames={{
                          caption: "hidden",
                        }}
                        components={{
                          Caption: () => null,
                        }}
                      />
                    </div>
                  )}

                  {calendarView === 'month' && (
                    <div>
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between z-10">
                        <button
                          type="button"
                          className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setCalendarView('year')}
                        >
                          {viewMonth.getFullYear()}
                        </button>
                        <button
                          type="button"
                          className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setCalendarView('day')}
                        >
                          ← חזור
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 12 }, (_, i) => {
                            const monthDate = new Date(viewMonth.getFullYear(), i, 1);
                            const monthName = format(monthDate, 'MMM', { locale: he });
                            const isSelected = viewMonth.getMonth() === i;
                            const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === viewMonth.getFullYear();
                            return (
                              <button
                                key={i}
                                type="button"
                                className={cn(
                                  "px-3 py-2 text-sm rounded hover:bg-gray-100 text-right",
                                  isSelected && "bg-[#5B6FB9]/20 font-medium text-[#5B6FB9]",
                                  isCurrentMonth && !isSelected && "bg-gray-50"
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectMonth(i, viewMonth.getFullYear());
                                }}
                              >
                                {monthName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {calendarView === 'year' && (
                    <div>
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between z-10">
                        <span className="text-sm font-medium text-gray-900">
                          {viewMonth.getFullYear() - 15} - {viewMonth.getFullYear() + 5}
                        </span>
                        <button
                          type="button"
                          className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setCalendarView('month')}
                        >
                          ← חזור
                        </button>
                      </div>
                      <div className="p-3 max-h-[300px] overflow-y-auto">
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 21 }, (_, i) => {
                            const yearValue = viewMonth.getFullYear() - 15 + i;
                            const isSelected = viewMonth.getFullYear() === yearValue;
                            const isCurrentYear = new Date().getFullYear() === yearValue;
                            return (
                              <button
                                key={yearValue}
                                type="button"
                                className={cn(
                                  "px-3 py-2 text-sm rounded hover:bg-gray-100 text-right",
                                  isSelected && "bg-[#5B6FB9]/20 font-medium text-[#5B6FB9]",
                                  isCurrentYear && !isSelected && "bg-gray-50"
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectYear(yearValue);
                                }}
                              >
                                {yearValue}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <Input
              ref={inputRef}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full h-8 text-sm px-3 pr-3",
                "border-2 border-[#5B6FB9] focus:border-[#5B6FB9] focus-visible:ring-2 focus-visible:ring-[#5B6FB9]/20",
                "transition-all duration-200",
                "bg-white"
              )}
              disabled={isSaving}
              dir="rtl"
            />
          )}
        </div>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    handleEdit();
  };

  return (
    <div
      className={cn('flex flex-col gap-1.5 py-0.5 group min-w-0 w-full text-right transition-all duration-200', className)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <span className="text-xs text-gray-500 font-medium flex-shrink-0" style={{ fontSize: '12px', fontWeight: 500 }}>{label}:</span>
      <div className="flex items-center gap-2 min-w-0 w-full relative">
        <span
          className={cn(
            'text-sm font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors',
            'flex-1 min-w-0 truncate',
            valueClassName
          )}
          style={{
            fontSize: '14px',
            fontWeight: 600
          }}
          onClick={handleClick}
          title={displayValue || (!disabled ? 'לחץ לעריכה' : undefined)}
        >
          {displayValue || '-'}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0',
              isHovered && 'opacity-100'
            )}
            title="ערוך"
          >
            <Edit className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
});

InlineEditableField.displayName = 'InlineEditableField';
