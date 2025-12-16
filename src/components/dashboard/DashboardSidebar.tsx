import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Link2, Plus, X, Dumbbell, Apple, ChevronLeft, HelpCircle, Edit2 } from 'lucide-react';
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


interface ResourceItemProps {
  item: NavItem;
  active: boolean;
  activeViewId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onResourceClick: () => void;
  onViewClick: (view: SavedView, resourcePath?: string) => void;
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: SavedView) => void;
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
  onEditViewClick,
}: ResourceItemProps) => {
  const Icon = item.icon;
  const supportsViews = item.resourceKey === 'leads' || item.resourceKey === 'customers' || item.resourceKey === 'workouts' || item.resourceKey === 'templates' || item.resourceKey === 'nutrition_templates';
  
  // Ensure default view exists for resources that support views
  // Always call the hook (React rules), but it will only run if resourceKey is valid (enabled check inside)
  const { defaultView } = useDefaultView(item.resourceKey);
  
  // Always call hook (React rules) - it will return empty array if not enabled
  const savedViewsQuery = useSavedViews(item.resourceKey);
  const savedViews = supportsViews ? (savedViewsQuery?.data || []) : [];
  
  // Check if any view for this resource is active
  const hasActiveView = supportsViews && activeViewId && savedViews && Array.isArray(savedViews) && savedViews.some(view => view.id === activeViewId);
  
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
              'w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 relative',
              'text-base font-semibold',
              isMainInterfaceActive
                ? 'text-white'
                  : 'text-white hover:bg-white/10'
              )}
            style={isMainInterfaceActive ? {
              backgroundColor: '#3d4d8a', // Slightly darker blue for active main interface
            } : {}}
            >
              {/* Icon on the right side (RTL: right is start) */}
              <Icon
                className={cn(
                  'h-6 w-6 flex-shrink-0',
                  isMainInterfaceActive ? 'text-white' : 'text-white'
                )}
              />
              <span className="flex-1 text-right">{item.label}</span>
              
              {/* Add View Button - appears on hover, positioned on left (RTL: left is end) */}
              {supportsViews && onSaveViewClick && (
                <button
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200 flex-shrink-0',
                    'opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none',
                    isMainInterfaceActive 
                      ? 'text-white hover:bg-white/20' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveViewClick(item.resourceKey);
                  }}
                  title="הוסף דף חדש"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              
              {/* Caret icon - points left (RTL: indicates expandable/collapsible) */}
              {supportsViews && (
                <ChevronLeft 
                  className={cn(
                    'h-5 w-5 flex-shrink-0 transition-transform',
                    isMainInterfaceActive ? 'text-gray-300' : 'text-gray-400'
                  )} 
                />
              )}
          </button>
          </div>
      </li>
          
      {/* Saved Views - Each as Separate Row */}
          {supportsViews && savedViews && Array.isArray(savedViews) && savedViews.length > 0 && (
        <>
                {savedViews.map((view) => {
                  const isViewActive = activeViewId === view.id;
            const isDefaultView = view.is_default;
                  return (
              <li key={view.id} className="group/view-item w-full">
                <div className="relative flex items-center w-full">
                  {/* Main view button */}
                  <button
                    onClick={() => onViewClick(view, item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200',
                      'text-sm font-normal relative pl-20', // Add padding-left to make room for buttons on left
                      isViewActive
                        ? 'text-white'
                        : 'text-white/80 hover:bg-white/10'
                    )}
                    style={isViewActive ? {
                      backgroundColor: '#4f60a8', // Lighter blue for active sub-item
                    } : {}}
                  >
                    {/* Vertical bar/dot on far right (RTL: right is start) for active sub-item */}
                    <div className={cn(
                      'h-full w-1 flex-shrink-0 transition-colors absolute right-0',
                      isViewActive ? 'bg-[#2d3d7a]' : 'bg-transparent'
                    )} />
                    {/* Invisible spacer to match main interface icon width (h-6 w-6 = 24px) */}
                    <div className="w-6 h-6 flex-shrink-0 opacity-0" aria-hidden="true" />
                    <span className="flex-1 text-right truncate">{view.view_name}</span>
                  </button>
                  
                  {/* Action buttons - positioned on left side (RTL: left is end), only visible on hover */}
                  <div className="absolute left-2 flex items-center gap-1 z-10 pointer-events-auto opacity-0 group-hover/view-item:opacity-100 transition-opacity duration-200">
                    {onEditViewClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditViewClick(view);
                        }}
                        className={cn(
                          'p-1.5 rounded-md transition-all duration-200',
                          'text-white/60 hover:text-white hover:bg-white/20',
                          'focus:opacity-100 focus:outline-none'
                        )}
                        title="ערוך תצוגה"
                        type="button"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {!isDefaultView && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(e, view);
                        }}
                        className={cn(
                          'p-1.5 rounded-md transition-all duration-200',
                          'text-white/60 hover:text-white hover:bg-white/20',
                          'focus:opacity-100 focus:outline-none'
                        )}
                        title="מחק תצוגה"
                        disabled={deleteView.isPending}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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

interface DashboardSidebarProps {
  onSaveViewClick?: (resourceKey: string) => void;
  onEditViewClick?: (view: SavedView) => void;
}

export const DashboardSidebar = ({ onSaveViewClick, onEditViewClick }: DashboardSidebarProps) => {
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
      className="fixed right-0 w-64 flex flex-col shadow-sm z-30 overflow-hidden"
      style={{ 
        top: '0',
        height: '100vh',
        backgroundColor: '#4f60a8', // Dark blue/purple background
        boxSizing: 'border-box',
      }}
      dir="rtl"
    >
      {/* Header Section with Logo */}
      <div 
        className="border-b border-white/10"
        style={{ 
          width: '256px', // Explicit width matching sidebar (w-64 = 256px)
          minHeight: '88px',
          padding: '20px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img 
          src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg" 
          alt="Diet Neta Logo" 
          style={{
            height: '36px',
            width: 'auto',
            maxWidth: '224px', // 256px - 32px padding (16px each side)
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            display: 'block',
          }}
        />
      </div>

      {/* Navigation List */}
      <nav 
        className="flex-1 py-4 overflow-y-auto text-base"
        dir="rtl"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#5a6ba5 #3d4d8a',
        }}
      >
        <style>{`
          nav::-webkit-scrollbar {
            width: 10px;
          }
          nav::-webkit-scrollbar-track {
            background: #3d4d8a;
            border-radius: 0;
            margin: 4px 0;
          }
          nav::-webkit-scrollbar-thumb {
            background: #5a6ba5;
            border-radius: 5px;
            border: 2px solid #3d4d8a;
            min-height: 40px;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: #6b7fb8;
          }
          nav::-webkit-scrollbar-thumb:active {
            background: #7b8fc8;
          }
        `}</style>
        <ul className="space-y-0.5 w-full" dir="rtl">
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
              onEditViewClick={onEditViewClick}
            />
          ))}
        </ul>
      </nav>

      {/* Footer Help Button */}
      <div className="px-6 py-4 border-t border-white/10">
        <button
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          title="עזרה"
        >
          <HelpCircle className="h-5 w-5 text-white" />
        </button>
      </div>
    </aside>
  );
};
