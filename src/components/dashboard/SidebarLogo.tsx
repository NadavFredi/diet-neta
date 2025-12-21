/**
 * SidebarLogo Component
 * 
 * Displays the Diet Neta logo with smooth transition between full and collapsed states.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SidebarLogoProps {
  isCollapsed: boolean;
  className?: string;
}

export const SidebarLogo: React.FC<SidebarLogoProps> = ({
  isCollapsed,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center transition-all duration-300 ease-in-out',
        'overflow-hidden',
        isCollapsed ? 'w-10 h-10' : 'w-full',
        className
      )}
    >
      {isCollapsed ? (
        // Collapsed: Show compact "D" logo or icon
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-lg">D</span>
        </div>
      ) : (
        // Expanded: Show full logo in pink (original colors)
        <img
          src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg"
          alt="Diet Neta Logo"
          className="h-9 w-auto max-w-[224px] object-contain transition-opacity duration-300"
          style={{ filter: 'none' }}
        />
      )}
    </div>
  );
};
