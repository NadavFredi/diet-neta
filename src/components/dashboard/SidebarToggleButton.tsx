/**
 * SidebarToggleButton Component
 * 
 * Premium "Floating Side-Tabs" frozen/attached to the left edge of the History/Notes sidebar.
 * Glassmorphism design with pill-shaped vertical container.
 * Positioned to never overlap content - sits in the gutter between content and sidebar.
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

  // Calculate position relative to viewport
  // Main content starts 256px from right (DashboardSidebar width)
  // History/Notes sidebars extend from the right edge of main content
  // Buttons attach to the LEFT edge of the History/Notes sidebar
  const DASHBOARD_SIDEBAR_WIDTH = 256;
  
  const getRightPosition = () => {
    if (activeSidebar === 'history') {
      // Main content margin (256px) + History sidebar width (350px) = 606px from viewport right
      return `${DASHBOARD_SIDEBAR_WIDTH + 350}px`;
    }
    if (activeSidebar === 'notes') {
      // Main content margin (256px) + Notes sidebar width (450px) = 706px from viewport right
      return `${DASHBOARD_SIDEBAR_WIDTH + 450}px`;
    }
    // When closed: buttons at right edge of main content (256px from viewport right)
    return `${DASHBOARD_SIDEBAR_WIDTH}px`;
  };

  return (
    <div 
      className="fixed top-1/2 z-50 pointer-events-none transition-all duration-300 ease-in-out"
      style={{ 
        right: getRightPosition(),
        transform: 'translateX(-100%) translateY(-50%)', // Move buttons to the left of anchor point
      }}
      dir="ltr"
    >
      {/* Premium Glassmorphism Handle Container - Pill-shaped with semi-circular left edge */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 py-2 px-1 bg-white/80 backdrop-blur-md border-l-2 border-t border-b border-gray-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.8)_inset] rounded-l-2xl">
        {/* History Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHistory}
              className={cn(
                'h-10 w-10 rounded-xl transition-all duration-200 ease-in-out relative',
                'hover:bg-white/60 backdrop-blur-sm',
                isHistoryOpen 
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 hover:from-purple-600 hover:to-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              )}
            >
              <History className={cn(
                'h-4 w-4 transition-all duration-200',
                isHistoryOpen && 'scale-110'
              )} />
              {/* Active indicator dot */}
              {isHistoryOpen && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" dir="rtl" className="z-[60]">
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
                'h-10 w-10 rounded-xl transition-all duration-200 ease-in-out relative',
                'hover:bg-white/60 backdrop-blur-sm',
                isNotesOpen 
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 hover:from-purple-600 hover:to-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              )}
            >
              <StickyNote className={cn(
                'h-4 w-4 transition-all duration-200',
                isNotesOpen && 'scale-110'
              )} />
              {/* Active indicator dot */}
              {isNotesOpen && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" dir="rtl" className="z-[60]">
            <p>הערות</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};


