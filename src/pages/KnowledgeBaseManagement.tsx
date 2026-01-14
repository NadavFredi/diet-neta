/**
 * KnowledgeBaseManagement Page
 * 
 * Standalone page for managing internal and external knowledge base
 */

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAppSelector } from '@/store/hooks';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { InternalKnowledgeBase } from '@/components/dashboard/InternalKnowledgeBase';
import { ExternalKnowledgeBase } from '@/components/dashboard/ExternalKnowledgeBase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Book, BookOpen } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';

const KnowledgeBaseManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('internal');

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const handleSaveViewClick = () => {
    // Not used for knowledge base, but required by DashboardSidebar interface
  };

  const handleEditViewClick = () => {
    // Not used for knowledge base, but required by DashboardSidebar interface
  };

  return (
    <>
      <DashboardHeader 
        userEmail={user?.email} 
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
      />
          
      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
        <main 
          className="bg-gray-50 overflow-y-auto" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="p-6 w-full">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
                <div className="border-b border-gray-200 px-6 pt-4">
                  <TabsList className="grid w-full max-w-md grid-cols-2 h-10 bg-gray-100">
                    <TabsTrigger 
                      value="internal" 
                      className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Book className="h-4 w-4" />
                      <span>מאגר ידע פנימי</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="external"
                      className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>מאגר ידע חיצוני</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6" style={{ minHeight: '400px' }}>
                  <TabsContent value="internal" className="mt-0">
                    <InternalKnowledgeBase />
                  </TabsContent>

                  <TabsContent value="external" className="mt-0">
                    <ExternalKnowledgeBase />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default KnowledgeBaseManagement;
