/**
 * LeadHistorySidebar Component
 * 
 * Right sidebar displaying lead history/interactions.
 * Clicking an item updates the active lead in ActionDashboard.
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dashboard';

interface Lead {
  id: string;
  created_at: string;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  [key: string]: any;
}

interface LeadHistorySidebarProps {
  leads: Lead[];
  activeLeadId: string | null;
  onLeadSelect: (leadId: string) => void;
  getStatusColor: (status: string) => string;
  getStatusBorderColor: (status: string) => string;
}

export const LeadHistorySidebar: React.FC<LeadHistorySidebarProps> = ({
  leads,
  activeLeadId,
  onLeadSelect,
  getStatusColor,
  getStatusBorderColor,
}) => {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col min-h-0" dir="rtl">
      <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">היסטוריית לידים</h2>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!leads || leads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">אין התעניינות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => {
                const isActive = lead.id === activeLeadId;
                const leadStatus = lead.status_sub || lead.status_main || 'ללא סטטוס';
                const statusColor = getStatusColor(leadStatus);
                const borderColor = getStatusBorderColor(leadStatus);

                return (
                  <div
                    key={lead.id}
                    onClick={() => onLeadSelect(lead.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isActive 
                        ? 'bg-blue-50 border-blue-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                      ${borderColor}
                      border-r-4
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {formatDate(lead.created_at)}
                      </span>
                      {isActive && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                          פעיל
                        </Badge>
                      )}
                    </div>
                    <div className="mb-2">
                      <Badge className={`${statusColor} text-xs px-2 py-1`}>
                        {leadStatus}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {lead.source && (
                        <div>
                          <span className="font-medium">מקור: </span>
                          <span>{lead.source}</span>
                        </div>
                      )}
                      {lead.fitness_goal && (
                        <div>
                          <span className="font-medium">מטרה: </span>
                          <span>{lead.fitness_goal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

