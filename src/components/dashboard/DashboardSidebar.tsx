import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, LayoutDashboard, Dumbbell, Apple, Link2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSection } from '@/store/slices/sidebarSlice';
import { SidebarItem } from './SidebarItem';
import type { SavedView } from '@/hooks/useSavedViews';

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
    id: 'interfaces',
    resourceKey: 'interfaces',
    label: 'ממשקים',
    icon: Link2,
    path: '/interfaces',
  },
  {
    id: 'pages',
    resourceKey: 'pages',
    label: 'דפים',
    icon: FileText,
    path: '/pages',
  },
  {
    id: 'settings',
    resourceKey: 'settings',
    label: 'הגדרות',
    icon: Settings,
    path: '/settings',
  },
];

interface DashboardSidebarProps {
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: SavedView) => void;
}

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

  // When sidebar is collapsed, also collapse all sections
  const effectiveExpandedSections = isCollapsed 
    ? Object.keys(expandedSections).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<string, boolean>)
    : expandedSections;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/leads');
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
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        </nav>

      </div>
    </>
  );
};
