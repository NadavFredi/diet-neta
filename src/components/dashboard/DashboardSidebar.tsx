import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'leads',
    label: 'ניהול לידים',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'interfaces',
    label: 'ממשקים',
    icon: Link2,
    path: '/interfaces',
  },
  {
    id: 'pages',
    label: 'דפים',
    icon: FileText,
    path: '/pages',
  },
  {
    id: 'settings',
    label: 'הגדרות',
    icon: Settings,
    path: '/settings',
  },
];

export const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/leads');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed right-0 top-[73px] h-[calc(100vh-73px)] w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm z-10"
      dir="rtl"
    >
      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-lg text-right transition-all duration-200',
                    'text-base font-medium',
                    active
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6 flex-shrink-0',
                      active ? 'text-blue-600' : 'text-gray-500'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Section (Optional - for account info or help) */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="font-medium text-gray-700 mb-2">חשבון</div>
          <div className="text-gray-500">פאנל ניהול</div>
        </div>
      </div>
    </aside>
  );
};
