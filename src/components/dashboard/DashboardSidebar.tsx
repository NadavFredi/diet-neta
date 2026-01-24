import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Users, Dumbbell, Apple, Calculator, Settings, Calendar, CreditCard, Book, Send, Receipt, BarChart3, Target, Search, X, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSection, setSectionExpanded } from '@/store/slices/sidebarSlice';
import { SidebarItem } from './SidebarItem';
import { SortableSidebarItem } from './SortableSidebarItem';
import type { SavedView } from '@/hooks/useSavedViews';
import { useInterfaceIconPreferences } from '@/hooks/useInterfaceIconPreferences';
import { selectInterfaceIconPreferences } from '@/store/slices/interfaceIconPreferencesSlice';
import { getIconByName } from '@/utils/iconUtils';
import { EditInterfaceIconDialog } from './EditInterfaceIconDialog';
import { FooterContent } from '@/components/layout/AppFooter';
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
import { useInterfaceOrder, useUpdateInterfaceOrders } from '@/hooks/useInterfaceOrder';
import { useToast } from '@/hooks/use-toast';
import { useDefaultView } from '@/hooks/useDefaultView';

interface NavItem {
  id: string;
  resourceKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'leads',
    resourceKey: 'leads',
    label: 'לידים',
    icon: UserPlus,
    path: '/dashboard',
  },
  {
    id: 'customers',
    resourceKey: 'customers',
    label: 'לקוחות',
    icon: Users,
    path: '/dashboard/customers',
  },
  {
    id: 'meetings',
    resourceKey: 'meetings',
    label: 'פגישות',
    icon: Calendar,
    path: '/dashboard/meetings',
  },
  {
    id: 'templates',
    resourceKey: 'templates',
    label: 'תכניות אימונים',
    icon: Dumbbell,
    path: '/dashboard/templates',
  },
  {
    id: 'exercises',
    resourceKey: 'exercises',
    label: 'תרגילים',
    icon: Target,
    path: '/dashboard/exercises',
  },
  {
    id: 'nutrition-templates',
    resourceKey: 'nutrition_templates',
    label: 'תבניות תזונה',
    icon: Apple,
    path: '/dashboard/nutrition-templates',
  },
  {
    id: 'supplement-templates',
    resourceKey: 'supplement_templates',
    label: 'תבניות תוספים',
    icon: Pill,
    path: '/dashboard/supplement-templates',
  },
  {
    id: 'budgets',
    resourceKey: 'budgets',
    label: 'תקציבים',
    icon: Calculator,
    path: '/dashboard/budgets',
  },
  {
    id: 'payments',
    resourceKey: 'payments',
    label: 'תשלומים',
    icon: CreditCard,
    path: '/dashboard/payments',
  },
  {
    id: 'collections',
    resourceKey: 'collections',
    label: 'גבייה',
    icon: Receipt,
    path: '/dashboard/collections',
  },
  {
    id: 'subscription-types',
    resourceKey: 'subscription_types',
    label: 'סוגי מנויים',
    icon: CreditCard,
    path: '/dashboard/subscription-types',
  },
  {
    id: 'knowledge-base',
    resourceKey: 'knowledge_base',
    label: 'מאגר ידע',
    icon: Book,
    path: '/dashboard/knowledge-base',
  },
  {
    id: 'check-in-settings',
    resourceKey: 'check_in_settings',
    label: 'הגדרות צ\'ק-אין',
    icon: Settings,
    path: '/dashboard/check-in-settings',
  },
  {
    id: 'whatsapp-automations',
    resourceKey: 'whatsapp_automations',
    label: 'אוטומציית WhatsApp',
    icon: Send,
    path: '/dashboard/whatsapp-automations',
  },
  {
    id: 'analytics',
    resourceKey: 'analytics',
    label: 'אנליטיקה',
    icon: BarChart3,
    path: '/dashboard/analytics',
  },
];

interface DashboardSidebarProps {
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: SavedView) => void;
}

export const DashboardSidebar = ({ onSaveViewClick, onEditViewClick }: DashboardSidebarProps) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeViewId = searchParams.get('view_id');
  const { toast } = useToast();

  // Get sidebar state from Redux
  const { isCollapsed, expandedSections } = useAppSelector((state) => state.sidebar);

  // Fetch default views for resources that support views
  // We fetch them all so we can navigate directly to default view on click
  const subscriptionTypesDefaultView = useDefaultView('subscription_types');
  const whatsappAutomationsDefaultView = useDefaultView('whatsapp_automations');

  // Fetch preferences on mount to sync with database (populates Redux)
  useInterfaceIconPreferences();

  // Get all preferences from Redux at component level
  const iconPreferences = useAppSelector(selectInterfaceIconPreferences);

  // Fetch interface order for drag-and-drop
  const { data: interfaceOrder } = useInterfaceOrder();
  const updateInterfaceOrders = useUpdateInterfaceOrders();

  const [editIconDialogOpen, setEditIconDialogOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<{
    key: string;
    label: string;
    currentIconName?: string | null;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort navigation items based on user's custom order
  const sortedNavigationItems = useMemo(() => {
    if (!interfaceOrder || interfaceOrder.length === 0) {
      return navigationItems;
    }

    // Create a map of interface_key to display_order
    const orderMap = new Map<number, string>();
    interfaceOrder.forEach((item) => {
      if (item.display_order != null) {
        orderMap.set(item.display_order, item.interface_key);
      }
    });

    // Separate items with and without order
    const itemsWithOrder: NavItem[] = [];
    const itemsWithoutOrder: NavItem[] = [];

    navigationItems.forEach((item) => {
      const orderEntry = Array.from(orderMap.entries()).find(([_, key]) => key === item.resourceKey);
      if (orderEntry) {
        itemsWithOrder.push({ ...item, _order: orderEntry[0] } as NavItem & { _order: number });
      } else {
        itemsWithoutOrder.push(item);
      }
    });

    // Sort by order and combine
    itemsWithOrder.sort((a, b) => (a as any)._order - (b as any)._order);
    return [...itemsWithOrder, ...itemsWithoutOrder].map((item) => {
      const { _order, ...rest } = item as any;
      return rest as NavItem;
    });
  }, [interfaceOrder]);

  // Filter navigation items based on search query
  // Show items that match the label OR show all items (views will be filtered within each item)
  // This allows users to find views even if they don't remember the item name
  const filteredNavigationItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedNavigationItems;
    }

    const query = searchQuery.trim().toLowerCase();
    // Filter items by label - views will be filtered within each item
    // This way users can find items by name, and views will be filtered too
    const matchingItems = sortedNavigationItems.filter((item) => {
      return item.label.toLowerCase().includes(query);
    });

    // If we have matching items, show only those. Otherwise show all (for view searching)
    // This balances between focused results and discoverability
    return matchingItems.length > 0 ? matchingItems : sortedNavigationItems;
  }, [sortedNavigationItems, searchQuery]);

  // Handle drag end for interfaces
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedNavigationItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedNavigationItems.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the items
    const reorderedItems = arrayMove(sortedNavigationItems, oldIndex, newIndex);

    // Update orders in database
    try {
      // Create order updates for ALL interfaces in the new order
      // This ensures all interfaces get proper ordering, including those without existing preferences
      const orders = reorderedItems.map((item, index) => ({
        interface_key: item.resourceKey,
        display_order: index + 1,
      }));

      await updateInterfaceOrders.mutateAsync(orders);

      toast({
        title: 'סדר התפריט עודכן',
        description: 'הסדר החדש נשמר בהצלחה.',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן לעדכן את הסדר. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  // Get custom icon for each navigation item from Redux
  const getIconForItem = useMemo(() => {
    return (item: NavItem) => {
      const customIconName = iconPreferences[item.resourceKey];
      if (customIconName) {
        return getIconByName(customIconName, item.resourceKey);
      }
      return item.icon;
    };
  }, [iconPreferences]);

  const handleEditIconClick = (interfaceKey: string, interfaceLabel: string, currentIconName?: string | null) => {
    // Get current icon name from Redux if not provided
    const iconName = currentIconName || iconPreferences[interfaceKey] || null;
    setEditingInterface({ key: interfaceKey, label: interfaceLabel, currentIconName: iconName });
    setEditIconDialogOpen(true);
  };

  const handleIconEditSuccess = () => {
    setEditIconDialogOpen(false);
    setEditingInterface(null);
  };

  // When sidebar is collapsed, also collapse all sections
  const effectiveExpandedSections = isCollapsed
    ? Object.keys(expandedSections).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<string, boolean>)
    : expandedSections;

  // Auto-expand the section for the current route when navigating
  useEffect(() => {
    if (isCollapsed) return; // Don't auto-expand if sidebar is collapsed

    const activeItem = navigationItems.find(item => isActive(item.path));
    if (activeItem) {
      const supportsViews = ['leads', 'customers', 'templates', 'exercises', 'nutrition_templates', 'supplement_templates', 'budgets', 'payments', 'collections', 'meetings', 'subscription_types', 'whatsapp_automations'].includes(activeItem.resourceKey);
      // Only auto-expand if it supports views and isn't already expanded
      if (supportsViews && !expandedSections[activeItem.resourceKey]) {
        // Collapse all sections first
        navigationItems.forEach(item => {
          if (item.resourceKey !== activeItem.resourceKey) {
            dispatch(setSectionExpanded({ resourceKey: item.resourceKey, expanded: false }));
          }
        });
        // Then expand the active section
        dispatch(setSectionExpanded({ resourceKey: activeItem.resourceKey, expanded: true }));
      }
    }
  }, [location.pathname, isCollapsed, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      // Active for dashboard and lead profile routes (not customer routes)
      return location.pathname === '/dashboard' ||
        location.pathname.startsWith('/leads/') ||
        location.pathname.startsWith('/profile/lead/') ||
        (location.pathname.startsWith('/profile/') &&
          !location.pathname.startsWith('/profile/lead/') &&
          location.pathname.split('/').length === 3); // /profile/:customerId (lead route)
    }
    if (path === '/dashboard/customers') {
      // Active for customers list and customer profile routes (not lead routes)
      return location.pathname === '/dashboard/customers' ||
        (location.pathname.startsWith('/dashboard/customers/') &&
          !location.pathname.startsWith('/profile/lead/') &&
          !location.pathname.startsWith('/leads/'));
    }
    if (path === '/dashboard/meetings') {
      // Active for meetings list and meeting detail routes
      return location.pathname === '/dashboard/meetings' ||
        location.pathname.startsWith('/dashboard/meetings/');
    }
    if (path === '/dashboard/exercises') {
      // Active for exercises page
      return location.pathname === '/dashboard/exercises';
    }
    if (path === '/dashboard/subscription-types') {
      // Active for subscription types list
      return location.pathname === '/dashboard/subscription-types';
    }
    if (path === '/dashboard/payments') {
      // Active for payments page
      return location.pathname === '/dashboard/payments';
    }
    if (path === '/dashboard/collections') {
      // Active for collections page
      return location.pathname === '/dashboard/collections';
    }
    if (path === '/dashboard/whatsapp-automations') {
      // Active for WhatsApp automations page
      return location.pathname === '/dashboard/whatsapp-automations';
    }
    if (path === '/dashboard/analytics') {
      // Active for analytics page
      return location.pathname === '/dashboard/analytics';
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const toggleResource = (resourceKey: string) => {
    // Not used in flat structure, but kept for compatibility
  };

  const handleViewClick = (view: SavedView, resourcePath?: string) => {
    const path = resourcePath || location.pathname;
    navigate(`${path}?view_id=${view.id}`);
  };

  const handleResourceClick = (item: NavItem) => {
    const supportsViews = ['leads', 'customers', 'templates', 'exercises', 'nutrition_templates', 'supplement_templates', 'budgets', 'payments', 'collections', 'meetings', 'subscription_types', 'whatsapp_automations'].includes(item.resourceKey);

    if (supportsViews) {
      // Expand the section to show views
      if (!expandedSections[item.resourceKey]) {
        dispatch(setSectionExpanded({ resourceKey: item.resourceKey, expanded: true }));
      }

      // For resources that support views, navigate directly to default view if available
      let defaultView = null;

      if (item.resourceKey === 'subscription_types') {
        defaultView = subscriptionTypesDefaultView.defaultView;
      } else if (item.resourceKey === 'whatsapp_automations') {
        defaultView = whatsappAutomationsDefaultView.defaultView;
      }

      // If we have a default view, navigate directly to it
      // Otherwise, navigate to base path and let page component handle redirect
      if (defaultView) {
        navigate(`${item.path}?view_id=${defaultView.id}`);
      } else {
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
  };

  const handleToggleSection = (resourceKey: string) => {
    dispatch(toggleSection(resourceKey));
  };

  return (
    <>
      {/* Navigation Content - This will be rendered inside the header */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Filter */}
        {!isCollapsed && (
          <div className="px-2 pb-3 pt-4">
            <div className="relative ml-3">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                type="text"
                placeholder="חפש אובייקטים ותצוגות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pr-9 pl-9 h-9 text-sm",
                  "bg-white/10 border-white/20 text-white placeholder:text-white/60",
                  "focus-visible:ring-0 focus-visible:border-white/30 focus-visible:bg-white/15"
                )}
                dir="rtl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="נקה חיפוש"
                >
                  <X className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
              )}
            </div>
          </div>
        )}
        <nav
          className="flex-1 py-4 overflow-y-auto text-base transition-all duration-300"
          dir="rtl"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#6B7FB8 #5B6FB9',
          }}
          role="navigation"
          aria-label="תפריט ניווט ראשי"
        >
          <style>{`
          nav::-webkit-scrollbar {
              width: 8px;
          }
          nav::-webkit-scrollbar-track {
              background: #5B6FB9;
            border-radius: 0;
          }
          nav::-webkit-scrollbar-thumb {
              background: #6B7FB8;
              border-radius: 4px;
              border: 1px solid #5B6FB9;
          }
          nav::-webkit-scrollbar-thumb:hover {
              background: #7B8FC8;
          }
        `}</style>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredNavigationItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className={cn(
                'space-y-1 w-full px-2',
                isCollapsed && 'px-1'
              )} dir="rtl">
                {filteredNavigationItems.length > 0 ? (
                  filteredNavigationItems.map((item) => (
                    <SortableSidebarItem
                      key={item.id}
                      item={item}
                      active={isActive(item.path)}
                      activeViewId={activeViewId}
                      isExpanded={effectiveExpandedSections[item.resourceKey] ?? false}
                      onToggle={() => handleToggleSection(item.resourceKey)}
                      onResourceClick={() => handleResourceClick(item)}
                      onViewClick={handleViewClick}
                      onSaveViewClick={onSaveViewClick}
                      onEditViewClick={onEditViewClick}
                      onEditIconClick={handleEditIconClick}
                      customIcon={getIconForItem(item)}
                      isCollapsed={isCollapsed}
                      isSortable={true}
                      searchQuery={searchQuery}
                    />
                  ))
                ) : (
                  <li className="px-3 py-4 text-center text-white/60 text-sm">
                    לא נמצאו תוצאות
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </nav>

        {/* Footer - At the bottom of the sidebar */}
        <div className={cn("flex-shrink-0", !isCollapsed && "border-t border-white/10", isCollapsed && "p-0")}>
          <FooterContent compact hideLink smallImage isCollapsed={isCollapsed} />
        </div>

      </div>

      {/* Edit Icon Dialog */}
      {editingInterface && (
        <EditInterfaceIconDialog
          isOpen={editIconDialogOpen}
          onOpenChange={setEditIconDialogOpen}
          interfaceKey={editingInterface.key}
          interfaceLabel={editingInterface.label}
          currentIconName={editingInterface.currentIconName}
          onSuccess={handleIconEditSuccess}
        />
      )}
    </>
  );
};
