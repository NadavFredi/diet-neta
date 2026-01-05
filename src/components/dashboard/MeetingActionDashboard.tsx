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
  MapPin, 
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
  location: string | null;
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
  location,
  notes,
  getStatusColor,
  onAddToCalendar,
  hasCalendarUrl,
}) => {
  return (
    <div className="space-y-4">
      {/* Meeting Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Meeting Type & Status */}
        <Card className="p-6 border border-slate-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", meetingType.iconColor)}>
              <span className="text-xl">{meetingType.icon}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900">סוג פגישה</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">סוג</label>
              <Badge 
                variant="outline" 
                className={cn("w-full justify-center py-2.5 text-sm font-semibold", meetingType.color)}
              >
                <span className="ml-1.5">{meetingType.icon}</span>
                {meetingType.label}
              </Badge>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">סטטוס</label>
              <Badge 
                variant="outline" 
                className={cn("w-full justify-center py-2.5 text-sm font-semibold", getStatusColor(status))}
              >
                {String(status)}
              </Badge>
            </div>
            {meetingType.english && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">English</label>
                <p className="text-sm text-gray-700 font-medium">{meetingType.english}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Client Profile */}
        <Card className="p-6 border border-slate-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">פרטי לקוח</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">שם מלא</label>
              <p className="text-sm font-semibold text-gray-900">
                {customer?.full_name || schedulingData?.fullName || '-'}
              </p>
            </div>
            {customer?.phone && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">טלפון</label>
                <a 
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 text-sm text-[#5B6FB9] hover:text-[#5B6FB9]/80 font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
              </div>
            )}
            {(customer?.email || schedulingData?.email) && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">אימייל</label>
                <a 
                  href={`mailto:${customer?.email || schedulingData?.email}`}
                  className="flex items-center gap-2 text-sm text-[#5B6FB9] hover:text-[#5B6FB9]/80 break-all transition-colors"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{customer?.email || schedulingData?.email}</span>
                </a>
              </div>
            )}
            {schedulingData?.scheduledUserName && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">מתזמן הפגישה</label>
                <p className="text-sm text-gray-700 font-medium">{schedulingData.scheduledUserName}</p>
                {schedulingData.scheduledUserEmail && (
                  <a 
                    href={`mailto:${schedulingData.scheduledUserEmail}`}
                    className="text-xs text-[#5B6FB9] hover:text-[#5B6FB9]/80 block mt-1.5 transition-colors"
                  >
                    {schedulingData.scheduledUserEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Card 3: Scheduling Details */}
        <Card className="p-6 border border-slate-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">לוח זמנים</h3>
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
            {location && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">מיקום</label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700 font-medium">{String(location)}</p>
                </div>
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
        <Card className="p-6 border border-slate-200 rounded-lg shadow-sm bg-white">
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

