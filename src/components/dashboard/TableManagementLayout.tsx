/**
 * TableManagementLayout Component
 * 
 * Shared layout wrapper for all table management pages (Leads, Customers, Meetings, etc.)
 * Provides consistent structure: header, sidebar, main content area with table container
 */

import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';

interface TableManagementLayoutProps {
    userEmail?: string;
    onLogout: () => void;
    onSaveViewClick: (resourceKey: string) => void;
    children: React.ReactNode;
    className?: string;
}

// Custom hook to detect if screen is desktop (lg breakpoint = 1024px)
const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = React.useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
    );

    React.useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isDesktop;
};

export const TableManagementLayout: React.FC<TableManagementLayoutProps> = ({
    userEmail,
    onLogout,
    onSaveViewClick,
    children,
    className,
}) => {
    const sidebarWidth = useSidebarWidth();
    const isDesktop = useIsDesktop();

    return (
        <>
            <DashboardHeader
                userEmail={userEmail}
                onLogout={onLogout}
                sidebarContent={<DashboardSidebar onSaveViewClick={onSaveViewClick} />}
            />

            <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
                <main
                    className={`bg-gray-50 overflow-y-auto transition-all duration-300 ${className || ''}`}
                    style={{
                        marginRight: isDesktop ? `${sidebarWidth.width}px` : 0,
                        minHeight: 'calc(100vh - 60px)',
                    }}
                >
                    <div className="pr-6">
                        <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};
