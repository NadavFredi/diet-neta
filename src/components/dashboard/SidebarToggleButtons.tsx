/**
 * SidebarToggleButtons Component
 * 
 * Premium "Floating Handle" buttons anchored to the sidebar container.
 * Positioned absolutely relative to parent sidebar container.
 * Designed to look like "Side Tabs" growing out of the sidebar.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { History, StickyNote } from 'lucide-react';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarToggleButtonsProps {
  sidebarOpen: boolean;
}

export const SidebarToggleButtons: React.FC<SidebarToggleButtonsProps> = ({ sidebarOpen }) => {
  const {
    isHistoryOpen,
    isNotesOpen,
    toggleHistory,
    toggleNotes,
  } = useLeadSidebar();

  return (
    <div
      className="absolute top-1/2 z-50 pointer-events-none transition-all duration-300 ease-in-out"
      style={{
        // When closed: position at left: 0 (inside the minimal sidebar space)
        // When open: position at left: 100% (attached to sidebar's edge, growing out)
        left: sidebarOpen ? '100%' : '8px', // Small offset from edge when inside
        transform: 'translateY(-50%)',
      }}
      dir="ltr"
    >
      {/* Premium Side Tabs Container */}
      {/* When closed: Fully rounded (inside sidebar) */}
      {/* When open: Rounded only on outer edges, flat on left where it touches sidebar */}
      <div className={cn(
        'pointer-events-auto flex flex-col items-center gap-1.5 py-2 px-1 bg-white/85 backdrop-blur-md border-t border-b border-r border-gray-200/60 shadow-[4px_0_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.9)_inset] transition-all duration-300 ease-in-out',
        sidebarOpen 
          ? 'rounded-tr-2xl rounded-br-2xl rounded-tl-none rounded-bl-none' // Flat on left when attached to sidebar
          : 'rounded-2xl' // Fully rounded when inside closed sidebar
      )}>
        {/* History Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHistory}
              className={cn(
                'h-11 w-11 rounded-lg transition-all duration-200 ease-in-out relative',
                'hover:bg-white/70 backdrop-blur-sm',
                isHistoryOpen
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20 hover:from-purple-600 hover:to-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              )}
            >
              <History className={cn(
                'h-4 w-4 transition-all duration-200',
                isHistoryOpen && 'scale-110'
              )} />
              {/* Active indicator - subtle glow */}
              {isHistoryOpen && (
                <div className="absolute inset-0 rounded-lg bg-purple-500/20 blur-sm -z-10" />
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
                'h-11 w-11 rounded-lg transition-all duration-200 ease-in-out relative',
                'hover:bg-white/70 backdrop-blur-sm',
                isNotesOpen
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20 hover:from-purple-600 hover:to-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              )}
            >
              <StickyNote className={cn(
                'h-4 w-4 transition-all duration-200',
                isNotesOpen && 'scale-110'
              )} />
              {/* Active indicator - subtle glow */}
              {isNotesOpen && (
                <div className="absolute inset-0 rounded-lg bg-purple-500/20 blur-sm -z-10" />
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


