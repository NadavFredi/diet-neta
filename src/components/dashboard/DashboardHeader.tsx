import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useUpdateSidebarWidthPreference } from '@/hooks/useSidebarWidthPreference';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, setSidebarWidth } from '@/store/slices/sidebarSlice';
import { ChevronRight, ChevronLeft, LogOut, Eye, Menu, X, UserSearch } from 'lucide-react';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { UserImpersonationDialog } from '@/components/dashboard/UserImpersonationDialog';

// Custom hook to detect if screen is desktop (lg breakpoint = 1024px)
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};

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
  const updateWidthMutation = useUpdateSidebarWidthPreference();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImpersonationDialogOpen, setIsImpersonationDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isDesktop = useIsDesktop();
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(sidebarWidth.expandedWidth);
  const currentWidthRef = useRef<number>(sidebarWidth.expandedWidth);
  
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 500;

  // Check if we're on a general header (not on leads, profile, or client pages)
  const isGeneralHeader = !location.pathname.startsWith('/leads/') &&
    !location.pathname.startsWith('/profile/') &&
    !location.pathname.startsWith('/client/') &&
    !location.pathname.startsWith('/dashboard/customers/') &&
    !location.pathname.startsWith('/dashboard/meetings/');
  
  // Only show impersonation button for admins/managers on general pages
  const showImpersonationButton = isGeneralHeader && 
    user && 
    (user.role === 'admin' || user.role === 'user');

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (isDesktop && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isDesktop, isMobileMenuOpen]);

  // Handle mouse down on resize handle
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (sidebarWidth.isCollapsed) return; // Don't allow resizing when collapsed
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth.expandedWidth;
    currentWidthRef.current = sidebarWidth.expandedWidth;
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [sidebarWidth.isCollapsed, sidebarWidth.expandedWidth]);

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // In RTL: sidebar is on right, handle is on left edge
      // Moving mouse left (decreasing clientX) should increase sidebar width
      // Moving mouse right (increasing clientX) should decrease sidebar width
      const deltaX = startXRef.current - e.clientX; // Inverted for left-edge handle in RTL
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + deltaX)
      );
      
      // Update Redux immediately for instant UI feedback (no API call during drag)
      dispatch(setSidebarWidth(newWidth));
      currentWidthRef.current = newWidth;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Save final width to database only on mouse up (single API call)
      const finalWidth = currentWidthRef.current;
      if (finalWidth !== startWidthRef.current) {
        updateWidthMutation.mutate(finalWidth, {
          onError: () => {
            // On error, revert to start width in both Redux and DB
            dispatch(setSidebarWidth(startWidthRef.current));
            updateWidthMutation.mutate(startWidthRef.current);
          }
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, updateWidthMutation, dispatch]);

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleCloseMobileMenu}
        />
      )}

      {/* Sidebar Section - Fixed on right side (RTL) */}
      {/* Hidden on mobile unless menu is open */}
      <div
        className={cn(
          'fixed right-0 top-0 flex flex-col bg-[#5B6FB9] transition-all duration-300 ease-in-out',
          'border-l border-white/10 shadow-lg',
          // Mobile: slide in/out from right
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          // Disable transition during resize for smooth dragging
          isResizing && 'transition-none'
        )}
        style={{
          width: `${sidebarWidth.width}px`,
          height: '100vh',
          zIndex: 50,
        }}
        dir="rtl"
      >
        {/* Resize Handle - Only visible when expanded and on desktop */}
        {!sidebarWidth.isCollapsed && isDesktop && (
          <div
            onMouseDown={handleResizeMouseDown}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50',
              'hover:bg-white/30 transition-colors',
              'group'
            )}
            style={{
              // Make it slightly wider for easier grabbing
              width: '4px',
              marginLeft: '-2px',
            }}
            title="גרור לשינוי רוחב התפריט"
            aria-label="גרור לשינוי רוחב התפריט"
          >
            {/* Visual indicator on hover */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/0 group-hover:bg-white/50 transition-colors" />
          </div>
        )}
        {/* Logo Section - Top of sidebar */}
        <div
          className={cn(
            'border-b border-white/10 flex items-center transition-all duration-300 relative',
            sidebarWidth.isCollapsed ? 'px-2 py-4 justify-center' : 'px-4 py-5 justify-between'
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
          
          {/* Mobile Close Button */}
          {!sidebarWidth.isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseMobileMenu}
              className="lg:hidden h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Toggle Button - On the edge between sidebar and content, aligned with border */}
        {/* Hidden on mobile */}
        <button
          onClick={handleToggleSidebar}
          className={cn(
            'absolute z-50 h-8 w-8 items-center justify-center',
            'rounded-full bg-white shadow-lg border border-gray-200',
            'hover:bg-gray-50 hover:shadow-xl',
            'transition-all duration-300 ease-in-out',
            'text-gray-700 hover:text-gray-900',
            // Position on the left edge of sidebar (RTL: left is the content side/border)
            'left-0 -translate-x-1/2',
            // Hidden on mobile
            'hidden lg:flex'
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
          <div className="flex-1 flex flex-col overflow-hidden min-h-0" onClick={handleCloseMobileMenu}>
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Main Header Bar - Fixed at top */}
      <header
        className={cn(
          "fixed top-0 left-0 bg-white text-gray-900 flex items-center shadow-sm border-b border-gray-200 z-40",
          "transition-all duration-300"
        )}
        dir="rtl"
        style={{
          height: '60px',
          // On mobile, take full width. On desktop, account for sidebar
          right: 0,
          marginRight: isDesktop ? `${sidebarWidth.width}px` : 0,
        }}
      >
        <div className="flex-1 flex items-center justify-between px-3 sm:px-4 md:px-6 py-5 h-full gap-2 sm:gap-4">
          {/* Mobile Menu Button - Only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden h-10 w-10 text-gray-700 hover:bg-gray-100 flex-shrink-0"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Client Hero Content - Right side (if present) */}
          {clientHeroContent ? (
            <div className="flex-1 flex items-center min-w-0 mr-2 sm:mr-4 overflow-hidden">
              {clientHeroContent}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* User info and logout - ALWAYS positioned on left side */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Impersonation Mode Indicator */}
            {isImpersonating && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                <Eye className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-orange-700 whitespace-nowrap">מצב תצוגה פעיל</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dispatch(stopImpersonation());
                    // Navigate back to previous location or default to dashboard
                    const returnPath = previousLocation || '/dashboard';
                    navigate(returnPath);
                  }}
                  className="h-6 px-2 text-orange-600 hover:bg-orange-100 flex-shrink-0"
                >
                  יציאה
                </Button>
              </div>
            )}

            {/* User Impersonation Button - Only on general pages */}
            {showImpersonationButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImpersonationDialogOpen(true)}
                className="h-10 w-10 text-gray-700 hover:bg-gray-100 flex-shrink-0"
                title="צפה בעיני משתמש"
              >
                <UserSearch className="h-5 w-5" />
              </Button>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* Avatar with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-center rounded-full border-2 border-[#5B6FB9] hover:border-[#5B6FB9]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] focus:ring-offset-2">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 cursor-pointer">
                    <AvatarFallback className="bg-[#5B6FB9] text-white font-semibold text-xs sm:text-sm">
                      {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 max-w-[calc(100vw-2rem)] p-4" align="end" side="bottom" dir="rtl">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-medium">משתמש מחובר</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900 break-all">{userEmail}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        await onLogout();
                      } catch (error) {
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

      {/* User Impersonation Dialog */}
      {showImpersonationButton && (
        <UserImpersonationDialog
          open={isImpersonationDialogOpen}
          onOpenChange={setIsImpersonationDialogOpen}
        />
      )}
    </>
  );
};
