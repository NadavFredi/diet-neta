import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Link2, Plus, X, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  onViewClick: (view: SavedView) => void;
  onSaveViewClick?: (resourceKey: string) => void;
}

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
  const supportsViews = item.resourceKey === 'leads' || item.resourceKey === 'workouts' || item.resourceKey === 'templates';
  const { data: savedViews = [] } = supportsViews ? useSavedViews(item.resourceKey) : { data: [] };
  const deleteView = useDeleteSavedView();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleDeleteClick = (e: React.MouseEvent, view: SavedView) => {
    e.stopPropagation();
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

  // If there are saved views, always keep it expanded (can't hide)
  const shouldBeExpanded = supportsViews && savedViews.length > 0 ? true : isExpanded;
  const canToggle = supportsViews && savedViews.length === 0;

  return (
    <li>
      <Collapsible
        open={shouldBeExpanded}
        onOpenChange={canToggle ? onToggle : undefined}
        disabled={!supportsViews}
      >
        <div className="relative group">
          <div className="flex items-center">
            <button
              onClick={(e) => {
                if (supportsViews && canToggle && !isExpanded) {
                  e.stopPropagation();
                  onToggle();
                }
                onResourceClick();
              }}
              className={cn(
                'flex-1 flex items-center gap-4 px-5 py-4 rounded-lg text-right transition-all duration-200',
                'text-base font-medium',
                active && !activeViewId
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 flex-shrink-0',
                  active && !activeViewId ? 'text-blue-600' : 'text-gray-500'
                )}
              />
              <span className="flex-1">{item.label}</span>
            </button>
            
            {supportsViews && (
              <>
                {onSaveViewClick && (
                  <button
                    className={cn(
                      'p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100',
                      'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                      'focus:opacity-100 focus:outline-none'
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
              </>
            )}
          </div>
          
          {supportsViews && savedViews.length > 0 && (
            <CollapsibleContent>
              <ul className="mt-1 space-y-1 pr-8">
                {savedViews.map((view) => {
                  const isViewActive = activeViewId === view.id;
                  return (
                    <li key={view.id} className="group/view-item">
                      <div className="relative flex items-center">
                        <button
                          onClick={() => onViewClick(view)}
                          className={cn(
                            'flex-1 flex items-center gap-3 px-4 py-2.5 rounded-lg text-right transition-all duration-200',
                            'text-sm font-medium',
                            isViewActive
                              ? 'bg-pink-50 text-pink-700 border-r-2 border-pink-500'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <span className="flex-1 text-right">{view.view_name}</span>
                          {view.is_default && (
                            <span className="text-xs text-gray-400">(ברירת מחדל)</span>
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, view)}
                          className={cn(
                            'p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover/view-item:opacity-100',
                            'text-gray-400 hover:text-red-600 hover:bg-red-50',
                            'focus:opacity-100 focus:outline-none',
                            'mr-2 flex-shrink-0'
                          )}
                          title="מחק תצוגה"
                          disabled={deleteView.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} dir="rtl">
            <AlertDialogContent>
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
        </div>
      </Collapsible>
    </li>
  );
};

export const DashboardSidebar = ({ onSaveViewClick }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeViewId = searchParams.get('view_id');
  
  // Track which resources are expanded (default: leads is expanded)
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set(['leads']));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/leads');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const toggleResource = (resourceKey: string) => {
    // Get saved views for this resource to check if it has views
    const item = navigationItems.find(i => i.resourceKey === resourceKey);
    const supportsViews = item?.resourceKey === 'leads' || item?.resourceKey === 'workouts' || item?.resourceKey === 'templates';
    
    // If this resource has saved views, don't allow collapsing
    // We'll check this in the ResourceItem component instead
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceKey)) {
        next.delete(resourceKey);
      } else {
        next.add(resourceKey);
      }
      return next;
    });
  };

  const handleViewClick = (view: SavedView) => {
    navigate(`${location.pathname}?view_id=${view.id}`);
  };

  const handleResourceClick = (item: NavItem) => {
    // Navigate to resource base path, clear view_id
    navigate(item.path);
  };

  return (
    <aside
      className="fixed right-0 w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm z-30"
      style={{ 
        top: '88px',
        bottom: '120px'
      }}
      dir="rtl"
    >
      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <ResourceItem
              key={item.id}
              item={item}
              active={isActive(item.path)}
              activeViewId={activeViewId}
              isExpanded={expandedResources.has(item.resourceKey)}
              onToggle={() => toggleResource(item.resourceKey)}
              onResourceClick={() => handleResourceClick(item)}
              onViewClick={handleViewClick}
              onSaveViewClick={onSaveViewClick}
            />
          ))}
        </ul>
      </nav>

      {/* Footer Section */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="font-medium text-gray-700 mb-2">חשבון</div>
          <div className="text-gray-500">פאנל ניהול</div>
        </div>
      </div>
    </aside>
  );
};
