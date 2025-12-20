/**
 * SidebarToggleButton Component
 * 
 * Minimalist vertical button bar positioned to the right of the sidebar.
 * Buttons are always visible and never overlap with sidebar or main content.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { History, StickyNote } from 'lucide-react';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import { useAppSelector } from '@/store/hooks';
import { selectActiveSidebar } from '@/store/slices/leadViewSlice';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const SidebarToggleButton: React.FC = () => {
  const {
    isHistoryOpen,
    isNotesOpen,
    toggleHistory,
    toggleNotes,
  } = useLeadSidebar();

  const activeSidebar = useAppSelector(selectActiveSidebar);

  // Calculate position based on sidebar state
  // Position buttons to the left of the sidebar (between main content and sidebar)
  // Container has padding: px-4 (16px), so we account for that
  // In RTL: sidebar is on right, buttons positioned from right edge of container
  const getRightPosition = () => {
    if (activeSidebar === 'history') return 'calc(350px + 16px)'; // Sidebar width + container padding
    if (activeSidebar === 'notes') return 'calc(450px + 16px)'; // Sidebar width + container padding
    return '16px'; // Container padding when closed
  };

  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 py-3 px-2 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-lg rounded-r-lg transition-all duration-300 ease-in-out pointer-events-auto"
      style={{ 
        right: getRightPosition()
      }}
      dir="ltr"
    >
      {/* History Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHistory}
            className={cn(
              'h-9 w-9 rounded-lg transition-all hover:bg-gray-100',
              isHistoryOpen && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:bg-gradient-to-br'
            )}
          >
            <History className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" dir="rtl">
          <p>היסטוריית לידים</p>
        </TooltipContent>
      </Tooltip>

      {/* Notes Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleNotes}
            className={cn(
              'h-9 w-9 rounded-lg transition-all hover:bg-gray-100',
              isNotesOpen && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:bg-gradient-to-br'
            )}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" dir="rtl">
          <p>הערות</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
