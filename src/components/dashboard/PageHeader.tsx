/**
 * PageHeader Component
 * 
 * Brand-Infused Gradient Header - The "Hero" Container.
 * Premium dashboard header with vibrant gradient, duotone icon watermark,
 * and integrated controls. Acts as the colored architectural crown of the content panel.
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectInterfaceIconPreference } from '@/store/slices/interfaceIconPreferencesSlice';
import { useInterfaceIconPreferences } from '@/hooks/useInterfaceIconPreferences';
import { getIconByName, getDefaultIconForResourceKey } from '@/utils/iconUtils';
import { EditInterfaceIconDialog } from './EditInterfaceIconDialog';
import { Button } from '@/components/ui/button';

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
  filtersDirty?: boolean; // Whether filters have been modified
  onSaveFilters?: () => void; // Callback to save filters
  dataCount?: number; // Total number of results
  singularLabel?: string; // e.g., "ליד"
  pluralLabel?: string; // e.g., "לידים"
  hasActiveFilters?: boolean; // Whether filters are currently applied
  filtersExpanded?: boolean; // Controlled state for filters expansion
  onFiltersExpandedChange?: (expanded: boolean) => void; // Callback for filters expansion toggle
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
  filtersDirty = false,
  onSaveFilters,
  dataCount,
  singularLabel,
  pluralLabel,
  hasActiveFilters = false,
  filtersExpanded: controlledFiltersExpanded,
  onFiltersExpandedChange,
}: PageHeaderProps) => {
  // Sync preferences on mount
  useInterfaceIconPreferences();

  // Get icon preference from Redux (immediate reactivity across all components)
  const currentIconName = resourceKey
    ? useAppSelector(selectInterfaceIconPreference(resourceKey))
    : null;

  const [editIconDialogOpen, setEditIconDialogOpen] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Use controlled state if provided, otherwise use internal state
  const [internalFiltersExpanded, setInternalFiltersExpanded] = useState(false);
  const filtersExpanded = controlledFiltersExpanded !== undefined
    ? controlledFiltersExpanded
    : internalFiltersExpanded;
  const setFiltersExpanded = onFiltersExpandedChange || setInternalFiltersExpanded;

  // Reset filtersExpanded when navigating to a page without active filters
  useEffect(() => {
    if (!hasActiveFilters && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, [hasActiveFilters, filtersExpanded, setFiltersExpanded]);

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
          'px-3 sm:px-4 md:px-6 pt-3',
          'bg-white',
          className
        )}
        dir="rtl"
        style={{ marginTop: 0 }}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 mb-3 sm:mb-4">
            {/* Title Section (Right side in RTL) */}
            <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex-1 min-w-0 flex items-center">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight truncate">
                  {title}
                  {dataCount !== undefined && (
                    <span className="text-gray-500 font-normal ml-1">
                      ({dataCount})
                    </span>
                  )}
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
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                {actions}
              </div>
            )}
          </div>

          {/* Bottom Row: Filters / Search (Optional) */}
          {filters && hasActiveFilters && filtersExpanded && (
            <div className="py-4 border-t border-gray-200">
              <div className="flex-1">
                {filters}
              </div>
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
