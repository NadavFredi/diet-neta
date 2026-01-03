/**
 * SidebarItem Component
 * 
 * Premium sidebar navigation item with tooltip support for collapsed mode
 * and popover for sub-menus in collapsed state.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Plus, Edit2, X } from 'lucide-react';
import { useSavedViews, type SavedView } from '@/hooks/useSavedViews';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useToast } from '@/hooks/use-toast';
import { DeleteViewDialog } from './DeleteViewDialog';

interface NavItem {
  id: string;
  resourceKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  activeViewId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onResourceClick: () => void;
  onViewClick: (view: SavedView, resourcePath?: string) => void;
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: SavedView) => void;
  onEditIconClick?: (interfaceKey: string, interfaceLabel: string, currentIconName?: string | null) => void;
  customIcon?: React.ComponentType<{ className?: string }>;
  isCollapsed: boolean;
  level?: number; // Nesting level: 0 = parent, 1+ = child
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  active,
  activeViewId,
  isExpanded,
  onToggle,
  onResourceClick,
  onViewClick,
  onSaveViewClick,
  onEditViewClick,
  onEditIconClick,
  customIcon,
  isCollapsed,
  level = 0, // Default to parent level
}) => {
  const Icon = customIcon || item.icon;
  const [lastClickTime, setLastClickTime] = useState(0);

  const location = useLocation();
  const supportsViews = item.resourceKey === 'leads' || 
    item.resourceKey === 'customers' || 
    item.resourceKey === 'templates' || 
    item.resourceKey === 'nutrition_templates' ||
    item.resourceKey === 'budgets' ||
    item.resourceKey === 'meetings';
  
  const { defaultView } = useDefaultView(item.resourceKey);
  const savedViewsQuery = useSavedViews(item.resourceKey);
  // Combine saved views with default view if it exists and isn't already in the list
  const allSavedViews = supportsViews ? (savedViewsQuery?.data || []) : [];
  const savedViews = useMemo(() => {
    if (!supportsViews || !defaultView) return allSavedViews;
    // Check if default view is already in the list
    const hasDefaultView = allSavedViews.some(view => view.id === defaultView.id);
    if (hasDefaultView) return allSavedViews;
    // Add default view at the beginning if it's not in the list yet
    return [defaultView, ...allSavedViews];
  }, [allSavedViews, defaultView, supportsViews]);
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<{ id: string; name: string } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Check if we're on a profile route for THIS specific resource type
  let isProfileRoute = false;
  if (item.resourceKey === 'leads') {
    // For leads: check if we're on a lead profile route
    // Routes: /leads/:id, /profile/lead/:leadId, /profile/:customerId (when it's a lead)
    isProfileRoute = location.pathname.startsWith('/leads/') || 
                     location.pathname.startsWith('/profile/lead/') ||
                     (location.pathname.startsWith('/profile/') && 
                      !location.pathname.startsWith('/profile/lead/') && 
                      location.pathname.split('/').length === 3); // /profile/:customerId
  } else if (item.resourceKey === 'customers') {
    // For customers: check if we're on a customer profile route ONLY
    // Route: /dashboard/customers/:id (not /profile routes which are for leads)
    isProfileRoute = location.pathname.startsWith('/dashboard/customers/') && 
                     location.pathname.split('/').length === 4; // /dashboard/customers/:id
  }
  
  // If on profile route for THIS resource and no view_id, consider default view as active
  const shouldHighlightDefaultView = isProfileRoute && !activeViewId && defaultView;

  const hasActiveView = supportsViews && activeViewId && 
    savedViews.some(view => view.id === activeViewId);
  // Main interface is active if: active route AND (has specific view OR no view_id specified)
  const isMainInterfaceActive = active && (hasActiveView || !activeViewId);

  const handleDeleteClick = (e: React.MouseEvent, view: SavedView) => {
    e.stopPropagation();
    if (view.is_default) {
      toast({
        title: 'לא ניתן למחוק',
        description: 'לא ניתן למחוק את התצוגה הראשית.',
        variant: 'destructive',
      });
      return;
    }
    setViewToDelete({ id: view.id, name: view.view_name });
    setDeleteDialogOpen(true);
  };

  const handleResourceClick = (e: React.MouseEvent) => {
    if (!supportsViews) {
      e.stopPropagation();
      onResourceClick();
    } else if (isCollapsed) {
      // In collapsed mode, open popover for resources with views
      setPopoverOpen(true);
    } else {
      // If we have a default view but section is not expanded, expand it
      if (defaultView && !isExpanded) {
        onToggle();
      } else {
        onToggle();
      }
    }
  };

  // Determine if this is a parent (level 0) or child (level 1+)
  const isParent = level === 0;
  const isChild = level > 0;

  // Main button content
  const buttonContent = (
    <div className="group relative">
      <button
        onClick={handleResourceClick}
        className={cn(
          'flex items-center gap-3 py-3.5 transition-all duration-300 relative',
          'text-base font-semibold',
          // Parent (Level 0) - Full-width rectangular
          isParent && [
            'w-full px-4 rounded-lg',
            isMainInterfaceActive
              ? 'text-gray-800 bg-white shadow-sm font-bold'
              : 'text-white hover:bg-white/10',
          ],
          // Child (Level 1+) - Same rectangular style as parent but with margins (shorter width to show nesting)
          isChild && [
            'mx-5 px-4 rounded-lg',
            isMainInterfaceActive
              ? 'text-gray-800 bg-white shadow-sm font-bold'
              : 'text-white hover:bg-white/10',
          ],
          isCollapsed && 'justify-center px-2 w-full mx-0'
        )}
        aria-label={item.label}
        aria-expanded={supportsViews ? isExpanded : undefined}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - lastClickTime;
            if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
              // Double click detected
              onEditIconClick?.(item.resourceKey, item.label, undefined);
              setLastClickTime(0);
            } else {
              setLastClickTime(currentTime);
              setTimeout(() => setLastClickTime(0), 300);
            }
          }}
          className="relative cursor-pointer group/icon"
          title="לחץ פעמיים לערוך אייקון"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEditIconClick?.(item.resourceKey, item.label, undefined);
            }
          }}
        >
          <Icon
            className={cn(
              'h-6 w-6 flex-shrink-0 transition-colors',
              isMainInterfaceActive ? 'text-gray-800' : 'text-white',
              'group-hover/icon:opacity-80'
            )}
          />
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-right">{item.label}</span>
            {supportsViews && onSaveViewClick && (
              <div
                className={cn(
                  'p-1.5 rounded-md transition-all duration-200 flex-shrink-0 cursor-pointer',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none',
                  isMainInterfaceActive
                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveViewClick(item.resourceKey);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSaveViewClick(item.resourceKey);
                  }
                }}
                title="הוסף דף חדש"
                role="button"
                tabIndex={0}
              >
                <Plus className="h-4 w-4" />
              </div>
            )}
            {supportsViews && (
              <ChevronDown
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                  isExpanded ? 'rotate-0' : '-rotate-90',
                  isMainInterfaceActive ? 'text-gray-700' : 'text-white/60'
                )}
              />
            )}
          </>
        )}
      </button>
    </div>
  );

  // Sub-views list - show if we have any views (from savedViews or defaultView)
  const hasViews = supportsViews && (savedViews.length > 0 || defaultView);
  // Ensure defaultView is always included in the list to display
  const viewsToDisplay = useMemo(() => {
    if (!supportsViews) return [];
    
    // Always include defaultView if it exists and isn't already in savedViews
    if (defaultView) {
      const hasDefaultInList = savedViews.some(view => view.id === defaultView.id);
      if (!hasDefaultInList) {
        // Default view not in list yet, add it at the beginning
        return [defaultView, ...savedViews];
      }
    }
    
    // Return savedViews (which should already include defaultView if it was fetched)
    return savedViews;
  }, [savedViews, defaultView, supportsViews]);
  
  const subViewsList = hasViews && (
    <div className="space-y-1 mt-2">
      {viewsToDisplay.map((view) => {
        // View is active if: it matches activeViewId OR it's the default view and we're on a profile route
        const isViewActive = activeViewId === view.id || 
                            (shouldHighlightDefaultView && view.id === defaultView?.id);
        const isDefaultView = view.is_default;
        return (
          <div
            key={view.id}
            className={cn(
              'group/view-item relative flex items-center',
              // Child items use rounded pill with margins (nested look)
              'mx-5'
            )}
          >
            <button
              onClick={() => {
                onViewClick(view, item.path);
                setPopoverOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm transition-all duration-300 ease-in-out',
                'text-right w-full',
                // Child (Level 1+) - Same rectangular style as parent but with margins
                'rounded-lg',
                isViewActive
                  ? 'text-gray-800 bg-white shadow-sm font-bold'
                  : 'text-gray-700 hover:bg-white/10'
              )}
            >
              <span className="flex-1 truncate">{view.view_name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover/view-item:opacity-100 transition-opacity">
                {onEditViewClick && !isDefaultView && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditViewClick(view);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onEditViewClick(view);
                      }
                    }}
                    className="p-1 rounded hover:bg-gray-200 text-gray-600 cursor-pointer"
                    title="ערוך"
                    role="button"
                    tabIndex={0}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </div>
                )}
                {!isDefaultView && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(e, view);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(e as any, view);
                      }
                    }}
                    className="p-1 rounded hover:bg-red-100 text-red-600 cursor-pointer"
                    title="מחק"
                    role="button"
                    tabIndex={0}
                  >
                    <X className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );

  // Wrapper with tooltip for collapsed mode
  if (isCollapsed) {
    if (hasViews) {
      // Use Popover for resources with views in collapsed mode
      return (
        <>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  {buttonContent}
                </TooltipTrigger>
                <TooltipContent side="left" align="center" dir="rtl">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="start"
              className="w-64 p-3"
              dir="rtl"
            >
              <div className="space-y-2">
                <div className="font-semibold text-sm text-gray-900 mb-2">
                  {item.label}
                </div>
                {subViewsList}
                {onSaveViewClick && (
                  <button
                    onClick={() => {
                      onSaveViewClick(item.resourceKey);
                      setPopoverOpen(false);
                    }}
                    className="w-full mt-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2 justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    הוסף דף חדש
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </>
      );
    } else {
      // Simple tooltip for items without views
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="left" align="center" dir="rtl">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
  }

  // Expanded mode - render normally
  return (
    <>
      <li className="w-full group">
        {buttonContent}
        {supportsViews && isExpanded && hasViews && (
          <div className="mt-1 space-y-1">
            {viewsToDisplay.map((view) => {
              // View is active if: it matches activeViewId OR it's the default view and we're on a profile route
              const isViewActive = activeViewId === view.id || 
                                  (shouldHighlightDefaultView && view.id === defaultView?.id);
              const isDefaultView = view.is_default;
              return (
                <div
                  key={view.id}
                  className={cn(
                    'group/view-item relative flex items-center',
                    // Child items use same rectangular style as parent but with margins (shorter width to show nesting)
                    'mx-5'
                  )}
                >
                  <button
                    onClick={() => onViewClick(view, item.path)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-300 ease-in-out',
                      'relative w-full',
                      // Child (Level 1+) - Same rectangular style as parent but with margins
                      'rounded-lg',
                      isViewActive
                        ? 'text-gray-800 bg-white shadow-sm font-bold'
                        : 'text-white/80 hover:bg-white/10'
                    )}
                  >
                    <span className="flex-1 text-right truncate">{view.view_name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/view-item:opacity-100 transition-opacity flex-shrink-0">
                      {onEditViewClick && !isDefaultView && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditViewClick(view);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onEditViewClick(view);
                            }
                          }}
                          className={cn(
                            'p-1.5 rounded-md transition-colors cursor-pointer',
                            isViewActive
                              ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                              : 'text-white/60 hover:text-white hover:bg-white/20'
                          )}
                          title="ערוך"
                          role="button"
                          tabIndex={0}
                        >
                          <Edit2 className="h-4 w-4" />
                        </div>
                      )}
                      {!isDefaultView && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(e, view);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteClick(e as any, view);
                            }
                          }}
                          className={cn(
                            'p-1.5 rounded-md transition-colors cursor-pointer',
                            isViewActive
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              : 'text-white/60 hover:text-white hover:bg-white/20'
                          )}
                          title="מחק"
                          role="button"
                          tabIndex={0}
                        >
                          <X className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </li>
      <DeleteViewDialog
        isOpen={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setViewToDelete(null);
        }}
        viewToDelete={viewToDelete}
        resourceKey={item.resourceKey}
      />
    </>
  );
};

