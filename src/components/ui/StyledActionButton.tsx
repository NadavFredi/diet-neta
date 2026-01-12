/**
 * StyledActionButton Component
 * 
 * Reusable button component based on the design from SidebarItem.tsx line 141
 * Features the same design and styling patterns
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StyledActionButtonProps {
  onClick?: () => void;
  icon?: LucideIcon;
  label?: string;
  active?: boolean;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'parent' | 'child';
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const StyledActionButton: React.FC<StyledActionButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  active = false,
  className,
  disabled = false,
  variant = 'default',
  fullWidth = true,
  children,
}) => {
  const isParent = variant === 'parent';
  const isChild = variant === 'child';

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex items-center gap-3 py-3.5 transition-all duration-300 relative',
          'text-base font-semibold',
          // Parent (Level 0) - Full-width rectangular
          isParent && [
            fullWidth ? 'w-full' : '',
            'px-4 rounded-lg',
            active
              ? 'text-gray-800 bg-white shadow-sm font-bold'
              : 'text-white hover:bg-white/10',
          ],
          // Child (Level 1+) - Same rectangular style as parent but with margins
          isChild && [
            'mx-5 px-4 rounded-lg',
            active
              ? 'text-gray-800 bg-white shadow-sm font-bold'
              : 'text-white hover:bg-white/10',
          ],
          // Default variant
          variant === 'default' && [
            fullWidth ? 'w-full' : '',
            'px-4 rounded-lg',
            active
              ? 'text-gray-800 bg-white shadow-sm font-bold'
              : 'text-gray-700 hover:bg-gray-100',
          ],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'h-6 w-6 flex-shrink-0 transition-colors',
              active ? 'text-gray-800' : variant === 'default' ? 'text-gray-700' : 'text-white',
              'group-hover:opacity-80'
            )}
          />
        )}
        {label && (
          <span className="flex-1 text-right">{label}</span>
        )}
        {children}
      </button>
    </div>
  );
};

