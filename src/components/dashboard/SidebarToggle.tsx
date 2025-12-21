/**
 * SidebarToggle Component
 * 
 * Premium toggle button for collapsing/expanding the sidebar.
 * Positioned at the top edge of the sidebar.
 */

import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isCollapsed,
  onToggle,
  className,
}) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'absolute z-50 h-8 w-8',
        'flex items-center justify-center',
        'rounded-full bg-white shadow-lg border border-gray-200',
        'hover:bg-gray-50 hover:shadow-xl',
        'transition-all duration-300 ease-in-out',
        'text-gray-700 hover:text-gray-900',
        // Position on the left edge of sidebar (RTL: left is the content side)
        'left-0 -translate-x-1/2',
        'top-[108px]', // Position below logo (88px header + 20px spacing)
        className
      )}
      title={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
      aria-label={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
    >
      {isCollapsed ? (
        <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
      ) : (
        <ChevronRight className="h-4 w-4 transition-transform duration-300" />
      )}
    </button>
  );
};
