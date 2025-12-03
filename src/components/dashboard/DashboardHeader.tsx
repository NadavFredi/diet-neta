import { Settings, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { he } from 'date-fns/locale';
import { ColumnSettings } from './ColumnSettings';
import { formatDate, STATUS_OPTIONS } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface DashboardHeaderProps {
  searchQuery: string;
  selectedDate: string | null;
  selectedStatus: string | null;
  columnVisibility: ColumnVisibility;
  userEmail: string | undefined;
  isSettingsOpen: boolean;
  datePickerOpen: boolean;
  onSearchChange: (value: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onStatusChange: (value: string) => void;
  onToggleColumn: (key: keyof ColumnVisibility) => void;
  onLogout: () => void;
  onSettingsOpenChange: (open: boolean) => void;
  onDatePickerOpenChange: (open: boolean) => void;
}

export const DashboardHeader = ({
  searchQuery,
  selectedDate,
  selectedStatus,
  columnVisibility,
  userEmail,
  isSettingsOpen,
  datePickerOpen,
  onSearchChange,
  onDateSelect,
  onStatusChange,
  onToggleColumn,
  onLogout,
  onSettingsOpenChange,
  onDatePickerOpenChange,
}: DashboardHeaderProps) => {
  return (
    <header className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between gap-4">
      {/* Left side - Settings icon */}
      <Popover open={isSettingsOpen} onOpenChange={onSettingsOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700">
            <Settings className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start" dir="rtl">
          <ColumnSettings
            columnVisibility={columnVisibility}
            onToggleColumn={onToggleColumn}
          />
        </PopoverContent>
      </Popover>

      {/* Center - Filters */}
      <div className="flex-1 flex items-center gap-4 justify-center">
        <Select
          value={selectedStatus || 'all'}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-[180px] bg-white text-gray-900">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">הכל</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {selectedDate ? formatDate(selectedDate) : 'תאריך יצירה'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" dir="rtl">
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate) : undefined}
              onSelect={onDateSelect}
              locale={he}
            />
          </PopoverContent>
        </Popover>
        <Input
          placeholder="חיפוש לפי שם..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs bg-white text-gray-900"
        />
      </div>

      {/* Right side - User info and logout */}
      <div className="flex items-center gap-2">
        <span className="text-sm">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-white hover:bg-blue-700">
          התנתק
        </Button>
      </div>
    </header>
  );
};

