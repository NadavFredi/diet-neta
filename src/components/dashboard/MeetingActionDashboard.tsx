/**
 * MeetingActionDashboard Component
 * 
 * Main content area for meeting details
 * Similar structure to ActionDashboard but for meetings
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText,
  CalendarPlus,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';

interface MeetingActionDashboardProps {
  meeting: any;
  customer: any;
  schedulingData: any;
  meetingType: any;
  status: string;
  meetingDate: string | null;
  formatTimeRange: () => string;
  notes: string | null;
  getStatusColor: (status: string) => string;
  onAddToCalendar: () => void;
  hasCalendarUrl: boolean;
}

export const MeetingActionDashboard: React.FC<MeetingActionDashboardProps> = ({
  meeting,
  customer,
  schedulingData,
  meetingType,
  status,
  meetingDate,
  formatTimeRange,
  notes,
  getStatusColor,
  onAddToCalendar,
  hasCalendarUrl,
}) => {
  return (
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            </div>
          </div>
            <div className="space-y-4">
              <div>
                <Badge 
                  variant="outline" 
                >
                  {meetingType.label}
                </Badge>
              </div>
              <div>
                  <p className="text-sm font-semibold text-gray-900">
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">תאריך</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">
                    {meetingDate || <span className="text-gray-400">לא צוין</span>}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">שעה</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">
                    {formatTimeRange() || <span className="text-gray-400">לא צוין</span>}
                  </p>
                </div>
              </div>
              {schedulingData?.timezone && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">אזור זמן</label>
                  <p className="text-sm text-gray-700 font-medium">{schedulingData.timezone}</p>
                </div>
              )}
            {hasCalendarUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 text-xs border-[#5B6FB9] text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white transition-colors"
                onClick={onAddToCalendar}
              >
                <CalendarPlus className="h-3.5 w-3.5 ml-1.5" />
                הוסף ללוח שנה
              </Button>
            )}
          </div>
        </Card>

      </div>

      {/* Notes Card (if exists) */}
      {notes && (
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">הערות ותיאור</h3>
          </div>
          <div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{String(notes)}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

