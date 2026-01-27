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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ChevronDown, Plus, Edit2, X, GripVertical, Copy, Folder, ArrowUpDown, ArrowUp, ArrowDown, FolderPlus, MoreVertical, Check } from 'lucide-react';
import { useSavedViews, type SavedView, useCreateSavedView, useUpdateSavedView } from '@/hooks/useSavedViews';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useToast } from '@/hooks/use-toast';
import { DeleteViewDialog } from './DeleteViewDialog';
import { getResourceKeyFromPath } from '@/utils/resourceUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableViewItem } from './SortableViewItem';
import { SortableFolderItem } from './SortableFolderItem';
import { useUpdatePageOrders } from '@/hooks/usePageOrder';
import { useFolders, useUpdateFolderOrders, useDeleteFolder, type InterfaceFolder } from '@/hooks/useFolders';
import { CreateFolderDialog } from './CreateFolderDialog';
import { AssignPageToFolderDialog } from './AssignPageToFolderDialog';
import { Input } from '@/components/ui/input';

interface NavItem {
  id: string;
  resourceKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export interface SidebarItemProps {
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
  dragHandleProps?: {
    attributes: any;
    listeners: any;
  };
  isSortable?: boolean;
  searchQuery?: string;
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
  dragHandleProps,
  isSortable = false,
  searchQuery = '',
}) => {
  const Icon = customIcon || item.icon;
  const [lastClickTime, setLastClickTime] = useState(0);

  const location = useLocation();
  const currentResourceKey = getResourceKeyFromPath(location.pathname);

  const supportsViews = item.resourceKey === 'leads' ||
    item.resourceKey === 'customers' ||
    item.resourceKey === 'templates' ||
    item.resourceKey === 'exercises' ||
    item.resourceKey === 'nutrition_templates' ||
    item.resourceKey === 'budgets' ||
    item.resourceKey === 'payments' ||
    item.resourceKey === 'collections' ||
    item.resourceKey === 'meetings' ||
    item.resourceKey === 'subscription_types' ||
    item.resourceKey === 'whatsapp_automations' ||
    item.resourceKey === 'supplement_templates';

  // Only fetch saved views and default view for:
  // 1. The current resource (when on that page) - always fetch
  // 2. The expanded item (when sidebar section is expanded) - fetch to show sub-views
  // This prevents fetching saved views for all 7 resources when only on "leads" page
  const shouldFetchData = supportsViews && (
    item.resourceKey === currentResourceKey ||
    (isExpanded && item.resourceKey !== currentResourceKey)
  );

  const { defaultView } = useDefaultView(shouldFetchData ? item.resourceKey : null);
  const savedViewsQuery = useSavedViews(shouldFetchData ? item.resourceKey : null);
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
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [assignPageDialogOpen, setAssignPageDialogOpen] = useState(false);
  const [pageToAssign, setPageToAssign] = useState<SavedView | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null); // null = use display_order, 'asc'/'desc' = sort by name
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState<string>('');
  const updatePageOrders = useUpdatePageOrders();
  const createSavedView = useCreateSavedView();
  const updateSavedView = useUpdateSavedView();

  // Fetch folders for this interface
  const { data: folders = [] } = useFolders(shouldFetchData ? item.resourceKey : null);
  const updateFolderOrders = useUpdateFolderOrders();
  const deleteFolder = useDeleteFolder();

  // Drag and drop sensors for views
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for folders
  const handleFolderDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = typeof active.id === 'string' && active.id.startsWith('folder-')
      ? active.id.replace('folder-', '')
      : null;
    const overId = typeof over.id === 'string' && over.id.startsWith('folder-')
      ? over.id.replace('folder-', '')
      : null;

    if (!activeId || !overId) return;

    const oldIndex = sortedFolders.findIndex((folder) => folder.id === activeId);
    const newIndex = sortedFolders.findIndex((folder) => folder.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the folders
    const reorderedFolders = arrayMove(sortedFolders, oldIndex, newIndex);

    // Update orders in database
    try {
      const orders = reorderedFolders.map((folder, index) => ({
        folder_id: folder.id,
        display_order: index + 1,
      }));

      if (orders.length > 0) {
        await updateFolderOrders.mutateAsync(orders);

        toast({
          title: 'סדר התיקיות עודכן',
          description: 'הסדר החדש נשמר בהצלחה.',
        });
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את הסדר. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  // Handle drag end for views/pages (only within same folder/root level)
  const handleViewDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Get pages in the same context (same folder or root level)
    const activeView = allViews.find((view) => view.id === active.id);
    const overView = allViews.find((view) => view.id === over.id);

    if (!activeView || !overView) return;

    // Only allow reordering within the same folder context
    if (activeView.folder_id !== overView.folder_id) {
      return;
    }

    const contextPages = allViews.filter(
      (view) => view.folder_id === activeView.folder_id && !view.is_default
    );

    const oldIndex = contextPages.findIndex((view) => view.id === active.id);
    const newIndex = contextPages.findIndex((view) => view.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the views
    const reorderedViews = arrayMove(contextPages, oldIndex, newIndex);

    // Update orders in database
    try {
      const orders = reorderedViews.map((view, index) => ({
        view_id: view.id,
        display_order: index + 1,
      }));

      if (orders.length > 0) {
        await updatePageOrders.mutateAsync(orders);

        toast({
          title: 'סדר הדפים עודכן',
          description: 'הסדר החדש נשמר בהצלחה.',
        });
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את הסדר. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

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
  } else if (item.resourceKey === 'meetings') {
    // For meetings: check if we're on a meeting detail route
    // Route: /dashboard/meetings/:id
    isProfileRoute = location.pathname.startsWith('/dashboard/meetings/') &&
      location.pathname.split('/').length === 4; // /dashboard/meetings/:id
  }

  // If on profile route for THIS resource and no view_id, consider default view as active
  const shouldHighlightDefaultView = isProfileRoute && !activeViewId && defaultView;

  const hasActiveView = supportsViews && activeViewId &&
    savedViews.some(view => view.id === activeViewId);
  // Main interface is active if: active route AND (has specific view OR no view_id specified)
  const isMainInterfaceActive = active && (hasActiveView || !activeViewId);

  const handleDeleteClick = (view: SavedView, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleDuplicateClick = async (view: SavedView, e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      // Create a new view with the same filter config but with a modified name
      const newViewName = `${view.view_name} (עותק)`;

      await createSavedView.mutateAsync({
        resourceKey: view.resource_key,
        viewName: newViewName,
        filterConfig: view.filter_config as any,
        isDefault: false, // Duplicated views are never default
      });

      toast({
        title: 'דף הוכפל בהצלחה',
        description: `נוצר דף חדש: ${newViewName}`,
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן לשכפל את הדף. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (view: SavedView, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingViewId(view.id);
    setEditingViewName(view.view_name);
  };

  const handleCancelEdit = () => {
    setEditingViewId(null);
    setEditingViewName('');
  };

  const handleSaveEdit = async (viewId: string) => {
    if (!editingViewName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן שם לתצוגה',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSavedView.mutateAsync({
        viewId,
        viewName: editingViewName.trim(),
      });

      toast({
        title: 'הצלחה',
        description: 'שם התצוגה עודכן בהצלחה',
      });

      setEditingViewId(null);
      setEditingViewName('');
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון שם התצוגה. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleResourceClick = (e: React.MouseEvent) => {
    if (!supportsViews) {
      e.stopPropagation();
      onResourceClick();
    } else if (isCollapsed) {
      // In collapsed mode, open popover for resources with views
      setPopoverOpen(true);
      // Also navigate to make it active on first click
      onResourceClick();
    } else {
      // Navigate to resource to make it active on first click
      onResourceClick();
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative">
          <button
            onClick={handleResourceClick}
            className={cn(
              'flex items-center gap-2.5 py-2.5 transition-all duration-300 relative',
              'text-sm font-medium',
              // Parent (Level 0) - Full-width rectangular
              isParent && [
                'w-full px-3 rounded-lg',
                isMainInterfaceActive
                  ? 'text-gray-800 bg-white shadow-sm font-semibold'
                  : 'text-white hover:bg-white/10',
              ],
              // Child (Level 1+) - Same rectangular style as parent but with margins (shorter width to show nesting)
              isChild && [
                'mx-5 px-3 rounded-lg',
                isMainInterfaceActive
                  ? 'text-gray-800 bg-white shadow-sm font-semibold'
                  : 'text-white hover:bg-white/10',
              ],
              isCollapsed && 'justify-center px-2 w-full mx-0'
            )}
            aria-label={item.label}
            aria-expanded={supportsViews ? isExpanded : undefined}
          >
            {/* Drag handle inside button - positioned relative to button container */}
            {isSortable && dragHandleProps && !isCollapsed && (
              <div
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
                className={cn(
                  'absolute right-0 cursor-grab active:cursor-grabbing',
                  'p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity',
                  'flex items-center justify-center z-10'
                )}
                style={{ marginLeft: '8px' }}
                title="גרור לשינוי סדר"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className={cn(
                  'h-4 w-4',
                  isMainInterfaceActive ? 'text-gray-600' : 'text-white/60'
                )} />
              </div>
            )}
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
              className="relative cursor-pointer group/icon pr-4"
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
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  isMainInterfaceActive ? 'text-gray-800' : 'text-white',
                  'group-hover/icon:opacity-80'
                )}
              />
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-right">{item.label}</span>
                {supportsViews && (
                  <div className="flex items-center gap-1 relative">
                    {/* 3-dots menu for parent item actions */}
                    <div className="w-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 opacity-0 transition-all duration-200 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              'p-1 rounded-md transition-colors cursor-pointer',
                              isMainInterfaceActive
                                ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            )}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" dir="rtl" onClick={(e) => e.stopPropagation()}>

                          {onSaveViewClick && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveViewClick(item.resourceKey);
                              }}
                            >
                              <Plus className="h-4 w-4 ml-2" />
                              הוסף דף חדש
                            </DropdownMenuItem>
                          )}
                          {supportsViews && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreateFolderDialogOpen(true);
                                }}
                              >
                                <FolderPlus className="h-4 w-4 ml-2" />
                                צור תיקייה חדשה
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {sortOrder === null && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSortOrder('asc');
                                  }}
                                >
                                  <ArrowUpDown className="h-4 w-4 ml-2" />
                                  מיין לפי שם (א-ב)
                                </DropdownMenuItem>
                              )}
                              {sortOrder === 'asc' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSortOrder('desc');
                                  }}
                                >
                                  <ArrowDown className="h-4 w-4 ml-2" />
                                  מיין לפי שם (ב-א)
                                </DropdownMenuItem>
                              )}
                              {sortOrder === 'desc' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSortOrder(null);
                                  }}
                                >
                                  <ArrowUp className="h-4 w-4 ml-2" />
                                  בטל מיון (החזר לסדר ידני)
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Expand/collapse button - always visible */}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-transform duration-200',
                        isExpanded ? 'rotate-0' : '-rotate-90',
                        isMainInterfaceActive ? 'text-gray-700' : 'text-white/60'
                      )}
                    />
                  </div>
                )}
              </>
            )}
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent dir="rtl" onClick={(e) => e.stopPropagation()}>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onResourceClick();
          }}
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף פריט חדש
        </ContextMenuItem>
        {supportsViews && (
          <>
            {onSaveViewClick && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveViewClick(item.resourceKey);
                }}
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף דף חדש
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCreateFolderDialogOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4 ml-2" />
              צור תיקייה חדשה
            </ContextMenuItem>
            <ContextMenuSeparator />
            {sortOrder === null && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder('asc');
                }}
              >
                <ArrowUpDown className="h-4 w-4 ml-2" />
                מיין לפי שם (א-ב)
              </ContextMenuItem>
            )}
            {sortOrder === 'asc' && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder('desc');
                }}
              >
                <ArrowDown className="h-4 w-4 ml-2" />
                מיין לפי שם (ב-א)
              </ContextMenuItem>
            )}
            {sortOrder === 'desc' && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder(null);
                }}
              >
                <ArrowUp className="h-4 w-4 ml-2" />
                בטל מיון (החזר לסדר ידני)
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );

  // Sub-views list - show if we have any views (from savedViews or defaultView)
  const hasViews = supportsViews && (savedViews.length > 0 || defaultView);

  // Get all views (including default)
  const allViews = useMemo(() => {
    if (!supportsViews) return [];

    let views: SavedView[] = [];
    if (defaultView) {
      const hasDefaultInList = savedViews.some(view => view.id === defaultView.id);
      if (!hasDefaultInList) {
        views = [defaultView, ...savedViews];
      } else {
        views = [...savedViews];
      }
    } else {
      views = [...savedViews];
    }

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      views = views.filter((view) =>
        view.view_name.toLowerCase().includes(query)
      );
    }

    // Sort by name if sortOrder is set, otherwise by display_order
    if (sortOrder === 'asc' || sortOrder === 'desc') {
      return views.sort((a, b) => {
        if (a.is_default) return -1;
        if (b.is_default) return 1;
        const comparison = a.view_name.localeCompare(b.view_name, 'he');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Default: sort by display_order
    return views.sort((a, b) => {
      if (a.is_default) return -1;
      if (b.is_default) return 1;
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      return orderA - orderB;
    });
  }, [savedViews, defaultView, supportsViews, sortOrder, searchQuery]);

  // Group views by folder - default view is always separate and first
  const viewsByFolder = useMemo(() => {
    const grouped: Record<string, SavedView[]> = {};
    const rootViews: SavedView[] = [];
    let defaultViewItem: SavedView | null = null;

    allViews.forEach((view) => {
      if (view.is_default) {
        defaultViewItem = view;
        return; // Skip default view - it will be rendered separately first
      }

      if (view.folder_id) {
        if (!grouped[view.folder_id]) {
          grouped[view.folder_id] = [];
        }
        grouped[view.folder_id].push(view);
      } else {
        rootViews.push(view);
      }
    });

    return { grouped, rootViews, defaultView: defaultViewItem };
  }, [allViews]);

  // Sort folders and filter by search query
  const sortedFolders = useMemo(() => {
    let filteredFolders = [...folders];

    // Filter folders that contain matching views if search query is provided
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filteredFolders = folders.filter((folder) => {
        const folderPages = viewsByFolder.grouped[folder.id] || [];
        // Include folder if its name matches or if it has matching views
        return folder.name.toLowerCase().includes(query) ||
          folderPages.some(view => view.view_name.toLowerCase().includes(query));
      });
    }

    if (sortOrder === 'asc' || sortOrder === 'desc') {
      const sorted = filteredFolders.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, 'he');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }

    // Default: sort by display_order
    return filteredFolders.sort((a, b) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      return orderA - orderB;
    });
  }, [folders, sortOrder, searchQuery, viewsByFolder.grouped]);

  // Auto-expand section if search query matches views
  useEffect(() => {
    if (searchQuery.trim() && supportsViews && allViews.length > 0 && !isExpanded) {
      onToggle();
    }
  }, [searchQuery, supportsViews, allViews.length, isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render a single page/view
  const renderPage = (view: SavedView, isInPopover = false, isInFolder = false) => {
    const isViewActive = activeViewId === view.id ||
      (shouldHighlightDefaultView && view.id === defaultView?.id);
    const isDefaultView = view.is_default;

    return (
      <SortableViewItem
        key={view.id}
        view={view}
        isActive={isViewActive}
        isDefaultView={isDefaultView}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                'group/view-item relative flex items-center',
                !isInFolder && 'mx-5'
              )}
            >
              <button
                onClick={() => {
                  onViewClick(view, item.path);
                  setPopoverOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm transition-all duration-300 ease-in-out',
                  'text-right w-full rounded-lg',
                  isViewActive
                    ? 'text-gray-800 bg-white shadow-sm font-semibold'
                    : isInPopover
                      ? 'text-gray-700 hover:bg-white/10'
                      : isInFolder
                        ? 'text-white bg-white/5 hover:bg-white/10'
                        : 'text-white/80 hover:bg-white/10'
                )}
              >
                {editingViewId === view.id ? (
                  <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingViewName}
                      onChange={(e) => setEditingViewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(view.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm flex-1 text-gray-900"
                      dir="rtl"
                      autoFocus
                      disabled={updateSavedView.isPending}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(view.id);
                      }}
                      disabled={updateSavedView.isPending}
                      className={cn(
                        'p-1 rounded transition-colors flex-shrink-0',
                        isViewActive
                          ? 'text-green-600 hover:text-green-800 hover:bg-green-100'
                          : 'text-green-400 hover:text-green-300 hover:bg-white/20'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      disabled={updateSavedView.isPending}
                      className={cn(
                        'p-1 rounded transition-colors flex-shrink-0',
                        isViewActive
                          ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                          : 'text-white/90 hover:text-white hover:bg-white/20'
                      )}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate">{view.view_name}</span>
                    {!isDefaultView && (
                      <div className="w-0 overflow-hidden group-hover/view-item:w-auto group-hover/view-item:opacity-100 opacity-0 transition-all duration-200 flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'p-1 rounded transition-colors cursor-pointer',
                                isViewActive
                                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                  : 'text-white/90 hover:text-white hover:bg-white/20'
                              )}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" dir="rtl" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateClick(view, e);
                              }}
                            >
                              <Copy className="h-4 w-4 ml-2" />
                              שכפל
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageToAssign(view);
                                setAssignPageDialogOpen(true);
                              }}
                            >
                              <Folder className="h-4 w-4 ml-2" />
                              העבר לתיקייה
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(view, e);
                              }}
                            >
                              <Edit2 className="h-4 w-4 ml-2" />
                              ערוך
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(view, e);
                              }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <X className="h-4 w-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                )}
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent dir="rtl" onClick={(e) => e.stopPropagation()}>
            {!isDefaultView && (
              <>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateClick(view, e);
                  }}
                >
                  <Copy className="h-4 w-4 ml-2" />
                  שכפל
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setPageToAssign(view);
                    setAssignPageDialogOpen(true);
                  }}
                >
                  <Folder className="h-4 w-4 ml-2" />
                  העבר לתיקייה
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(view, e);
                  }}
                >
                  <Edit2 className="h-4 w-4 ml-2" />
                  ערוך
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(view, e);
                  }}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <X className="h-4 w-4 ml-2" />
                  מחק
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </SortableViewItem>
    );
  };

  // Render a folder with its pages
  const renderFolder = (folder: InterfaceFolder) => {
    let folderPages = viewsByFolder.grouped[folder.id] || [];

    // Filter folder pages by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      folderPages = folderPages.filter((view) =>
        view.view_name.toLowerCase().includes(query)
      );
    }

    // Auto-expand folder if search query matches its pages
    const shouldAutoExpand = searchQuery.trim() && folderPages.length > 0;
    const isExpanded = shouldAutoExpand || expandedFolders.has(folder.id);

    // Check if any page inside this folder is active
    const hasActivePage = folderPages.some(view =>
      activeViewId === view.id ||
      (shouldHighlightDefaultView && view.id === defaultView?.id)
    );

    return (
      <SortableFolderItem key={folder.id} folder={folder} isActive={hasActivePage}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="mx-5 mb-1 group/folder-item">
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedFolders);
                  if (isExpanded) {
                    newExpanded.delete(folder.id);
                  } else {
                    newExpanded.add(folder.id);
                  }
                  setExpandedFolders(newExpanded);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm transition-all duration-300 ease-in-out',
                  'text-right w-full rounded-lg',
                  hasActivePage
                    ? 'text-gray-800 bg-white shadow-sm font-semibold'
                    : 'text-white bg-white/5 hover:bg-white/10'
                )}
              >
                <Folder className={cn(
                  'h-4 w-4 flex-shrink-0',
                  hasActivePage ? 'text-gray-800' : 'text-white'
                )} />
                <span className={cn(
                  'flex-1 truncate',
                  hasActivePage ? 'text-gray-800' : 'text-white'
                )}>{folder.name}</span>
                <div className="w-0 overflow-hidden group-hover/folder-item:w-auto group-hover/folder-item:opacity-100 opacity-0 transition-all duration-200 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'p-1 rounded transition-colors cursor-pointer',
                          hasActivePage
                            ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                            : 'text-white/90 hover:text-white hover:bg-white/20'
                        )}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" dir="rtl" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder.mutate(folder.id, {
                            onSuccess: () => {
                              toast({
                                title: 'תיקייה נמחקה',
                                description: `תיקייה "${folder.name}" נמחקה בהצלחה.`,
                              });
                            },
                          });
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <X className="h-4 w-4 ml-2" />
                        מחק תיקייה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-transform duration-200',
                    hasActivePage ? 'text-gray-700' : 'text-white/80',
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent dir="rtl" onClick={(e) => e.stopPropagation()}>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder.mutate(folder.id, {
                  onSuccess: () => {
                    toast({
                      title: 'תיקייה נמחקה',
                      description: `תיקייה "${folder.name}" נמחקה בהצלחה.`,
                    });
                  },
                });
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <X className="h-4 w-4 ml-2" />
              מחק תיקייה
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isExpanded && folderPages.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleViewDragEnd}
          >
            <SortableContext
              items={folderPages.map((view) => view.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1 mt-1">
                {folderPages.map((view) => renderPage(view, false, true))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </SortableFolderItem>
    );
  };

  const subViewsList = hasViews && (
    <>
      {/* Default view always appears first, before folders */}
      {viewsByFolder.defaultView && (
        <div className="space-y-1 mt-2">
          {renderPage(viewsByFolder.defaultView, false)}
        </div>
      )}

      {/* Folders */}
      {sortedFolders.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFolderDragEnd}
        >
          <SortableContext
            items={sortedFolders.map((folder) => `folder-${folder.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn("space-y-1 mt-2", viewsByFolder.defaultView && "mt-1")}>
              {sortedFolders.map((folder) => renderFolder(folder))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Root-level pages (not in folders, excluding default) */}
      {viewsByFolder.rootViews.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleViewDragEnd}
        >
          <SortableContext
            items={viewsByFolder.rootViews.map((view) => view.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn(
              "space-y-1 mt-2",
              (sortedFolders.length > 0 || viewsByFolder.defaultView) && "mt-1"
            )}>
              {viewsByFolder.rootViews.map((view) => renderPage(view, false))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
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
                <div className="max-h-[400px] overflow-y-auto">
                  {/* Default view always appears first */}
                  {viewsByFolder.defaultView && (
                    <div className="space-y-1 mb-2">
                      {renderPage(viewsByFolder.defaultView, true)}
                    </div>
                  )}

                  {sortedFolders.length > 0 && (
                    <div className={cn("space-y-1 mb-2", viewsByFolder.defaultView && "mt-1")}>
                      {sortedFolders.map((folder) => {
                        const folderPages = viewsByFolder.grouped[folder.id] || [];
                        const isFolderExpanded = expandedFolders.has(folder.id);
                        return (
                          <div key={folder.id} className="mb-1">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedFolders);
                                if (isFolderExpanded) {
                                  newExpanded.delete(folder.id);
                                } else {
                                  newExpanded.add(folder.id);
                                }
                                setExpandedFolders(newExpanded);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md w-full text-right"
                            >
                              <Folder className="h-4 w-4 text-gray-700" />
                              <span className="flex-1 truncate text-gray-700">{folder.name}</span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform duration-200 text-gray-700',
                                  isFolderExpanded ? 'rotate-0' : '-rotate-90'
                                )}
                              />
                            </button>
                            {isFolderExpanded && folderPages.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {folderPages.map((view) => renderPage(view, true, true))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {viewsByFolder.rootViews.length > 0 && (
                    <div className={cn(
                      "space-y-1",
                      (sortedFolders.length > 0 || viewsByFolder.defaultView) && "mt-1"
                    )}>
                      {viewsByFolder.rootViews.map((view) => renderPage(view, true))}
                    </div>
                  )}
                </div>
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
          <div className="mt-1">
            {subViewsList}
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
      {supportsViews && (
        <>
          <CreateFolderDialog
            isOpen={createFolderDialogOpen}
            onOpenChange={setCreateFolderDialogOpen}
            interfaceKey={item.resourceKey}
          />
          {pageToAssign && (
            <AssignPageToFolderDialog
              isOpen={assignPageDialogOpen}
              onOpenChange={(open) => {
                setAssignPageDialogOpen(open);
                if (!open) setPageToAssign(null);
              }}
              page={pageToAssign}
            />
          )}
        </>
      )}
    </>
  );
};

