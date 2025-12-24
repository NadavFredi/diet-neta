import { Button } from '@/components/ui/button';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/sidebarSlice';
import { ChevronRight, ChevronLeft, LogOut, Eye } from 'lucide-react';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userEmail: string | undefined;
  onLogout: () => void;
  sidebarContent?: React.ReactNode;
}

export const DashboardHeader = ({
  userEmail,
  onLogout,
  sidebarContent,
}: DashboardHeaderProps) => {
  const sidebarWidth = useSidebarWidth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating } = useAppSelector((state) => state.impersonation);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  return (
    <>
      {/* Sidebar Section - Fixed on right side (RTL) */}
      <div 
        className={cn(
          'fixed right-0 top-0 flex flex-col bg-[#5B6FB9] transition-all duration-300 ease-in-out',
          'border-l border-white/10 shadow-lg'
        )}
        style={{ 
          width: `${sidebarWidth.width}px`,
          height: '100vh',
          zIndex: 50,
        }}
        dir="rtl"
      >
        {/* Logo Section - Top of sidebar */}
        <div 
          className={cn(
            'border-b border-white/10 flex items-center justify-center transition-all duration-300 relative',
            sidebarWidth.isCollapsed ? 'px-2 py-4' : 'px-4 py-5'
          )}
          style={{ 
            height: '88px',
          }}
        >
          {/* Logo */}
          {!sidebarWidth.isCollapsed && (
            <NetaLogo 
              size="default" 
              variant="default"
            />
          )}
        </div>
        
        {/* Toggle Button - On the edge between sidebar and content, aligned with border */}
        <button
          onClick={handleToggleSidebar}
          className={cn(
            'absolute z-50 h-8 w-8 flex items-center justify-center',
            'rounded-full bg-white shadow-lg border border-gray-200',
            'hover:bg-gray-50 hover:shadow-xl',
            'transition-all duration-300 ease-in-out',
            'text-gray-700 hover:text-gray-900',
            // Position on the left edge of sidebar (RTL: left is the content side/border)
            'left-0 -translate-x-1/2'
          )}
          style={{
            top: '70px', // Positioned higher to avoid overlapping with icons
          }}
          title={sidebarWidth.isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
          aria-label={sidebarWidth.isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
        >
          {sidebarWidth.isCollapsed ? (
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform duration-300" />
          )}
        </button>

        {/* Sidebar Navigation Content */}
        {sidebarContent && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Main Header Bar - Fixed at top */}
      <header 
        className="fixed top-0 left-0 right-0 bg-white text-gray-900 flex items-center shadow-sm border-b border-gray-200 z-40"
        dir="rtl"
        style={{ 
          height: '88px',
          marginRight: `${sidebarWidth.width}px`,
        }}
      >
        {/* User info and logout - positioned on left side (appears on left in RTL) */}
        <div className="flex-1 flex items-center justify-end px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Impersonation Mode Indicator */}
            {isImpersonating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                <Eye className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-700">מצב תצוגה פעיל</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dispatch(stopImpersonation());
                    navigate('/dashboard');
                  }}
                  className="h-6 px-2 text-orange-600 hover:bg-orange-100"
                >
                  יציאה
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
              <span className="text-base font-semibold text-gray-700">{userEmail}</span>
            </div>
            <Button 
              variant="outline"
              size="default" 
              onClick={onLogout} 
              className="border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9]/10 hover:text-[#5B6FB9] hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 ml-2" />
              התנתק
            </Button>
          </div>
        </div>
      </header>
    </>
  );
};
