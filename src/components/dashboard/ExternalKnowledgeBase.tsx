/**
 * ExternalKnowledgeBase Component
 * 
 * Placeholder component for external knowledge base (to be added later)
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ExternalKnowledgeBase: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center" dir="rtl">
      <div className="mb-4 p-4 bg-gray-100 rounded-full">
        <FileText className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        מאגר ידע חיצוני
      </h3>
      <p className="text-sm text-gray-500 max-w-md">
        פיצ'ר זה יתווסף בהמשך
      </p>
    </div>
  );
};
