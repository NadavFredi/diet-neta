/**
 * KnowledgeBaseManagement Page
 * 
 * Standalone page for managing internal and external knowledge base
 */

import { useState } from 'react';
import { TableManagementLayout } from '@/components/dashboard/TableManagementLayout';
import { useAppSelector } from '@/store/hooks';
import { InternalKnowledgeBase } from '@/components/dashboard/InternalKnowledgeBase';
import { ExternalKnowledgeBase } from '@/components/dashboard/ExternalKnowledgeBase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Book, BookOpen } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';

const KnowledgeBaseManagement = () => {
  const { user } = useAppSelector((state) => state.auth);
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
      <TableManagementLayout
        userEmail={user?.email}
        onLogout={handleLogout}
        onSaveViewClick={handleSaveViewClick}
      >
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
      </TableManagementLayout>
    </>
  );
};

export default KnowledgeBaseManagement;
