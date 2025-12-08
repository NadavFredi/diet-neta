import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColumnSettings } from './ColumnSettings';
import type { ColumnVisibility } from '@/utils/dashboard';

interface DashboardHeaderProps {
  searchQuery: string;
  columnVisibility: ColumnVisibility;
  userEmail: string | undefined;
  isSettingsOpen: boolean;
  onSearchChange: (value: string) => void;
  onToggleColumn: (key: keyof ColumnVisibility) => void;
  onLogout: () => void;
  onSettingsOpenChange: (open: boolean) => void;
}

export const DashboardHeader = ({
  searchQuery,
  columnVisibility,
  userEmail,
  isSettingsOpen,
  onSearchChange,
  onToggleColumn,
  onLogout,
  onSettingsOpenChange,
}: DashboardHeaderProps) => {
  return (
    <header className="bg-white text-gray-900 px-6 py-4 flex items-center justify-between gap-4 shadow-sm border-b border-gray-200">
      {/* Left side - Logo (appears on right in RTL) */}
      <div className="flex items-center flex-shrink-0 pr-2">
        <img
          src="/logo.svg"
          alt="Easy Flow logo"
          className="h-10 w-auto"
        />
      </div>

      {/* Center - Search */}
      <div className="flex-1 flex items-center gap-3 justify-center">
        <Input
          placeholder="חיפוש לפי שם..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:bg-white focus:bg-white focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Right side - Settings, User info and logout */}
      <div className="flex items-center gap-3">
        <Popover open={isSettingsOpen} onOpenChange={onSettingsOpenChange}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-700 hover:bg-gray-100 transition-all rounded-lg"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 shadow-xl" align="end" dir="rtl">
            <ColumnSettings
              columnVisibility={columnVisibility}
              onToggleColumn={onToggleColumn}
            />
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
          <span className="text-sm font-medium text-gray-700">{userEmail}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onLogout} 
          className="text-gray-700 hover:bg-gray-100 transition-all rounded-lg"
        >
          התנתק
        </Button>
      </div>
    </header>
  );
};

