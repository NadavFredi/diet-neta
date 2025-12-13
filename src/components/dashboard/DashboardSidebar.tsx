import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Link2, Plus, X, Dumbbell, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSavedViews, useDeleteSavedView, type SavedView } from '@/hooks/useSavedViews';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useToast } from '@/hooks/use-toast';

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
}

interface ResourceItemProps {
  item: NavItem;
  active: boolean;
  activeViewId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onResourceClick: () => void;
  onViewClick: (view: SavedView, resourcePath?: string) => void;
  onSaveViewClick?: (resourceKey: string) => void;
}

// Note: isExpanded and onToggle are kept for compatibility but not used in the new flat structure

const ResourceItem = ({
  item,
  active,
  activeViewId,
  isExpanded,
  onToggle,
  onResourceClick,
  onViewClick,
  onSaveViewClick,
}: ResourceItemProps) => {
  const Icon = item.icon;
  const supportsViews = item.resourceKey === 'leads' || item.resourceKey === 'workouts' || item.resourceKey === 'templates' || item.resourceKey === 'nutrition_templates';
  
  // Ensure default view exists for resources that support views
  // Always call the hook (React rules), but it will only run if resourceKey is valid (enabled check inside)
  const { defaultView } = useDefaultView(item.resourceKey);
  
  const { data: savedViews = [] } = supportsViews ? useSavedViews(item.resourceKey) : { data: [] };
  
  // Check if any view for this resource is active
  const hasActiveView = supportsViews && activeViewId && savedViews.some(view => view.id === activeViewId);
  
  // Main interface is active if:
  // 1. It's directly active (no view_id in URL), OR
  // 2. Any of its views is active (view_id matches one of this resource's views)
  const isMainInterfaceActive = active && (hasActiveView || !activeViewId);
  const deleteView = useDeleteSavedView();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleDeleteClick = (e: React.MouseEvent, view: SavedView) => {
    e.stopPropagation();
    // Prevent deletion of default views
    if (view.is_default) {
      toast({
        title: 'לא ניתן למחוק',
        description: 'לא ניתן למחוק את התצוגה הראשית. זו התצוגה הראשית שממנה ניתן ליצור תצוגות נוספות.',
        variant: 'destructive',
      });
      return;
    }
    setViewToDelete({ id: view.id, name: view.view_name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!viewToDelete) return;

    try {
      await deleteView.mutateAsync({
        viewId: viewToDelete.id,
        resourceKey: item.resourceKey,
      });

      toast({
        title: 'הצלחה',
        description: `התצוגה "${viewToDelete.name}" נמחקה בהצלחה`,
      });

      // If the deleted view was active, navigate to base resource
      if (searchParams.get('view_id') === viewToDelete.id) {
        navigate(location.pathname);
      }

      setDeleteDialogOpen(false);
      setViewToDelete(null);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת התצוגה. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };


  return (
    <>
      {/* Main Interface Button */}
      <li className="w-full">
        <div className="relative group w-full">
          <button
            onClick={() => {
              // Always navigate to base path - the page component will handle redirecting to default view
              // This ensures the page loads even if defaultView isn't ready yet
              onResourceClick();
            }}
            className={cn(
              'w-full flex items-center gap-4 px-4 py-3.5 text-right transition-all duration-200 relative',
              'text-lg font-semibold',
              isMainInterfaceActive
                ? 'text-white'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            )}
            style={isMainInterfaceActive ? {
              backgroundColor: '#4f60a8',
            } : {}}
          >
              <Icon
                className={cn(
                  'h-7 w-7 flex-shrink-0',
                  isMainInterfaceActive ? 'text-white' : 'text-gray-500'
                )}
              />
            <span className="flex-1">{item.label}</span>
            
            {supportsViews && onSaveViewClick && (
              <button
                className={cn(
                  'p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100',
                  'focus:opacity-100 focus:outline-none flex-shrink-0',
                  isMainInterfaceActive 
                    ? 'text-white hover:bg-white/20' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveViewClick(item.resourceKey);
                }}
                title="שמור תצוגה חדשה"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </button>
        </div>
      </li>

      {/* Saved Views - Each as Separate Row */}
      {supportsViews && savedViews.length > 0 && (
        <>
          {savedViews.map((view) => {
            const isViewActive = activeViewId === view.id;
            const isDefaultView = view.is_default;
            return (
              <li key={view.id} className="group/view-item w-full">
                <div className="relative flex items-center w-full">
                  <button
                    onClick={() => onViewClick(view, item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-right transition-all duration-200',
                      'text-base font-medium relative',
                      isViewActive
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    style={isViewActive ? {
                      backgroundColor: '#4f60a8',
                    } : {}}
                  >
                    <div className={cn(
                      'h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors',
                      isViewActive ? 'bg-white' : 'bg-gray-400'
                    )} />
                    <span className="flex-1 text-right">{view.view_name}</span>
                  </button>
                  {!isDefaultView && (
                    <button
                      onClick={(e) => handleDeleteClick(e, view)}
                      className={cn(
                        'absolute left-2 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover/view-item:opacity-100',
                        'text-gray-400 hover:text-red-600 hover:bg-red-50',
                        'focus:opacity-100 focus:outline-none'
                      )}
                      title="מחק תצוגה"
                      disabled={deleteView.isPending}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תצוגה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התצוגה "{viewToDelete?.name}"? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteView.isPending}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteView.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteView.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const DashboardSidebar = ({ onSaveViewClick }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeViewId = searchParams.get('view_id');
  
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

  return (
    <aside
      className="fixed right-0 w-64 bg-white border-l flex flex-col shadow-sm z-30"
      style={{ 
        top: '88px',
        height: 'calc(100vh - 88px)',
        borderLeftColor: '#4f60a8',
        borderLeftWidth: '3px'
      }}
      dir="rtl"
    >
      {/* Navigation List */}
      <nav className="flex-1 py-6 overflow-y-auto text-base">
        <ul className="space-y-1 w-full">
          {navigationItems.map((item) => (
            <ResourceItem
              key={item.id}
              item={item}
              active={isActive(item.path)}
              activeViewId={activeViewId}
              isExpanded={true}
              onToggle={() => {}}
              onResourceClick={() => handleResourceClick(item)}
              onViewClick={handleViewClick}
              onSaveViewClick={onSaveViewClick}
            />
          ))}
        </ul>
      </nav>

    </aside>
  );
};
