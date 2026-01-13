/**
 * KnowledgeBasePanel Component
 * 
 * Panel with tabs for Internal Knowledge Base, External Knowledge Base, and Notes
 */

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InternalKnowledgeBase } from './InternalKnowledgeBase';
import { ExternalKnowledgeBase } from './ExternalKnowledgeBase';
import { CustomerNotesSidebar } from './CustomerNotesSidebar';
import { FileText, BookOpen, Book } from 'lucide-react';

interface LeadOption {
  id: string;
  created_at: string;
  fitness_goal?: string | null;
  status_main?: string | null;
}

interface KnowledgeBasePanelProps {
  customerId: string | null;
  leads?: LeadOption[];
  activeLeadId?: string | null;
  onClose?: () => void;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  customerId,
  leads = [],
  activeLeadId = null,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('notes');

  return (
    <div className="flex flex-col h-full bg-white" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full" dir="rtl">
        <div className="border-b border-gray-200 flex-shrink-0 px-4 pt-3">
          <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100">
            <TabsTrigger 
              value="internal" 
              className="flex items-center gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Book className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">פנימי</span>
            </TabsTrigger>
            <TabsTrigger 
              value="external"
              className="flex items-center gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">חיצוני</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notes"
              className="flex items-center gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">הערות</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <TabsContent value="internal" className="mt-0 h-full m-0">
            <InternalKnowledgeBase />
          </TabsContent>

          <TabsContent value="external" className="mt-0 h-full m-0">
            <ExternalKnowledgeBase />
          </TabsContent>

          <TabsContent value="notes" className="mt-0 h-full m-0">
            <CustomerNotesSidebar
              customerId={customerId}
              leads={leads}
              activeLeadId={activeLeadId}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
