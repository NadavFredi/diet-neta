import { Button } from '@/components/ui/button';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/sidebarSlice';
import { ChevronRight, ChevronLeft, LogOut, Eye } from 'lucide-react';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DashboardHeaderProps {
  userEmail: string | undefined;
  onLogout: () => void;
  sidebarContent?: React.ReactNode;
  clientHeroContent?: React.ReactNode;
}

export const DashboardHeader = ({
  userEmail,
  onLogout,
  sidebarContent,
  clientHeroContent,
}: DashboardHeaderProps) => {
  const sidebarWidth = useSidebarWidth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);

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
          height: '60px',
          marginRight: `${sidebarWidth.width}px`,
        }}
      >
        <div className="flex-1 flex items-center justify-between px-6 py-5 h-full">
          {/* Client Hero Content - Left side (appears on left in RTL) */}
          {clientHeroContent && (
            <div className="flex-1 flex items-center min-w-0 mr-4">
              {clientHeroContent}
            </div>
          )}

          {/* User info and logout - ALWAYS positioned on left side (appears on left in RTL) */}
          <div className="flex items-center mr-2 gap-4 flex-shrink-0">
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
                    // Navigate back to previous location or default to dashboard
                    const returnPath = previousLocation || '/dashboard';
                    navigate(returnPath);
                  }}
                  className="h-6 px-2 text-orange-600 hover:bg-orange-100"
                >
                  יציאה
                </Button>
              </div>
            )}

            {/* Avatar with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-center rounded-full border-2 border-[#5B6FB9] hover:border-[#5B6FB9]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] focus:ring-offset-2">
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarFallback className="bg-[#5B6FB9] text-white font-semibold text-sm">
                      {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end" side="bottom" dir="rtl">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-medium">משתמש מחובר</span>
                    <span className="text-base font-semibold text-gray-900">{userEmail}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DashboardHeader] Logout button clicked');
                      try {
                        await onLogout();
                      } catch (error) {
                        console.error('[DashboardHeader] Logout error:', error);
                        // Force navigation to login even if logout fails
                        navigate('/login');
                      }
                    }}
                    className="w-full border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9]/10 hover:text-[#5B6FB9] hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200 justify-start"
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                    התנתק
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
    </>
  );
};
