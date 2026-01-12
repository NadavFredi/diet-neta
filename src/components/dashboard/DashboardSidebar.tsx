import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Apple, Calculator, Settings, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSection } from '@/store/slices/sidebarSlice';
import { SidebarItem } from './SidebarItem';
import type { SavedView } from '@/hooks/useSavedViews';
import { useInterfaceIconPreferences } from '@/hooks/useInterfaceIconPreferences';
import { selectInterfaceIconPreferences } from '@/store/slices/interfaceIconPreferencesSlice';
import { getIconByName } from '@/utils/iconUtils';
import { EditInterfaceIconDialog } from './EditInterfaceIconDialog';

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
    label: 'ניהול לידים',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'customers',
    resourceKey: 'customers',
    label: 'ניהול לקוחות',
    icon: LayoutDashboard,
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
    id: 'nutrition-templates',
    resourceKey: 'nutrition_templates',
    label: 'תבניות תזונה',
    icon: Apple,
    path: '/dashboard/nutrition-templates',
  },
  {
    id: 'budgets',
    resourceKey: 'budgets',
    label: 'תקציבים',
    icon: Calculator,
    path: '/dashboard/budgets',
  },
  {
    id: 'subscription-types',
    resourceKey: 'subscription_types',
    label: 'סוגי מנויים',
    icon: CreditCard,
    path: '/dashboard/subscription-types',
  },
  {
    id: 'check-in-settings',
    resourceKey: 'check_in_settings',
    label: 'הגדרות צ\'ק-אין',
    icon: Settings,
    path: '/dashboard/check-in-settings',
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
  
  // Get sidebar state from Redux
  const { isCollapsed, expandedSections } = useAppSelector((state) => state.sidebar);
  
  // Fetch preferences on mount to sync with database (populates Redux)
  useInterfaceIconPreferences();
  
  // Get all preferences from Redux at component level
  const iconPreferences = useAppSelector(selectInterfaceIconPreferences);
  
  const [editIconDialogOpen, setEditIconDialogOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<{
    key: string;
    label: string;
    currentIconName?: string | null;
  } | null>(null);

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
    if (path === '/dashboard/subscription-types') {
      // Active for subscription types list
      return location.pathname === '/dashboard/subscription-types';
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
    // For resources that support views, navigate to base path
    // The page component will automatically redirect to default view if needed
    navigate(item.path);
  };

  const handleToggleSection = (resourceKey: string) => {
    dispatch(toggleSection(resourceKey));
  };

  return (
    <>
      {/* Navigation Content - This will be rendered inside the header */}
      <div className="flex-1 flex flex-col min-h-0">
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
          <ul className={cn(
            'space-y-1 w-full px-2',
            isCollapsed && 'px-1'
          )} dir="rtl">
          {navigationItems.map((item) => (
              <SidebarItem
              key={item.id}
              item={item}
              active={isActive(item.path)}
              activeViewId={activeViewId}
                isExpanded={effectiveExpandedSections[item.resourceKey] ?? true}
                onToggle={() => handleToggleSection(item.resourceKey)}
              onResourceClick={() => handleResourceClick(item)}
              onViewClick={handleViewClick}
              onSaveViewClick={onSaveViewClick}
              onEditViewClick={onEditViewClick}
                onEditIconClick={handleEditIconClick}
                customIcon={getIconForItem(item)}
                isCollapsed={isCollapsed}
            />
          ))}
        </ul>
      </nav>

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
