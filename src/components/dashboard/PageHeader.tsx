/**
 * PageHeader Component
 * 
 * Brand-Infused Gradient Header - The "Hero" Container.
 * Premium dashboard header with vibrant gradient, duotone icon watermark,
 * and integrated controls. Acts as the colored architectural crown of the content panel.
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectInterfaceIconPreference } from '@/store/slices/interfaceIconPreferencesSlice';
import { useInterfaceIconPreferences } from '@/hooks/useInterfaceIconPreferences';
import { getIconByName, getDefaultIconForResourceKey } from '@/utils/iconUtils';
import { EditInterfaceIconDialog } from './EditInterfaceIconDialog';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  icon?: LucideIcon; // Legacy prop - will be ignored if resourceKey is provided
  resourceKey?: string; // Interface resource key (e.g., 'leads', 'customers')
  className?: string;
  onIconEditSuccess?: () => void;
}

export const PageHeader = ({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions,
  filters,
  icon: LegacyIcon,
  resourceKey,
  className,
  onIconEditSuccess,
}: PageHeaderProps) => {
  // Sync preferences on mount
  useInterfaceIconPreferences();
  
  // Get icon preference from Redux (immediate reactivity across all components)
  const currentIconName = resourceKey 
    ? useAppSelector(selectInterfaceIconPreference(resourceKey))
    : null;
  
  const [editIconDialogOpen, setEditIconDialogOpen] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Determine which icon to use
  let Icon: LucideIcon;

  if (resourceKey) {
    // Use icon from Redux preferences, fallback to default
    Icon = currentIconName 
      ? getIconByName(currentIconName, resourceKey)
      : getDefaultIconForResourceKey(resourceKey);
  } else {
    // Fallback to legacy icon prop
    Icon = LegacyIcon || getDefaultIconForResourceKey('leads');
  }

  const handleIconClick = (e: React.MouseEvent) => {
    if (!resourceKey) return; // Only allow editing if resourceKey is provided
    
    e.stopPropagation();
    e.preventDefault();
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime;

    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      // Double click detected (two clicks within 300ms)
      setEditIconDialogOpen(true);
      setLastClickTime(0);
    } else {
      setLastClickTime(currentTime);
      // Clear after timeout to reset the double-click detection
      setTimeout(() => setLastClickTime(0), 300);
    }
  };

  const handleIconEditSuccess = () => {
    setEditIconDialogOpen(false);
    onIconEditSuccess?.();
  };

  return (
    <>
    <div 
      className={cn(
        'relative',
        'border-b border-gray-200',
        'px-6 py-5',
        'bg-white',
        className
      )}
      dir="rtl"
    >
      {/* Content Container */}
      <div className="relative">
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-slate-300">/</span>
                  )}
                  <span className={cn(
                    'font-medium',
                    index === breadcrumbs.length - 1 
                      ? 'text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  )}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Top Row: Title and Primary Actions */}
        <div className="flex items-center justify-between gap-6 mb-4">
          {/* Title Section (Right side in RTL) */}
          <div className="flex-1 min-w-0 flex items-center gap-3">
            {Icon && (
              <button
                type="button"
                className={cn(
                  "flex-shrink-0 flex items-center p-1 rounded-md transition-colors",
                  resourceKey && "cursor-pointer hover:bg-gray-100 group/icon"
                )}
                onClick={handleIconClick}
                title={resourceKey ? "לחץ פעמיים לערוך אייקון" : undefined}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (resourceKey) {
                    setEditIconDialogOpen(true);
                  }
                }}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 text-gray-600 transition-opacity",
                    resourceKey && "group-hover/icon:opacity-70"
                  )} 
                  strokeWidth={1.5}
                />
              </button>
            )}
            <div className="flex-1 min-w-0 flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 font-normal ml-3">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Actions Section (Left side in RTL) */}
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Bottom Row: Filters / Search (Optional) */}
        {filters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {filters}
          </div>
        )}
      </div>
    </div>

    {/* Edit Icon Dialog */}
    {resourceKey && (
      <EditInterfaceIconDialog
        isOpen={editIconDialogOpen}
        onOpenChange={setEditIconDialogOpen}
        interfaceKey={resourceKey}
        interfaceLabel={title}
        currentIconName={currentIconName}
        onSuccess={handleIconEditSuccess}
      />
    )}
    </>
  );
};
