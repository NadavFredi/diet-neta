/**
 * MeetingActionDashboard Component
 * 
 * Main content area for meeting details
 * Similar structure to ActionDashboard but for meetings
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  PlusCircle,
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
  const navigate = useNavigate();

  const handleClientNameClick = () => {
    if (meeting?.customer?.id) {
      navigate(`/leads/${meeting.lead?.id || meeting.customer.id}`);
    }
  };

  const clientId = meeting?.lead?.id || meeting?.customer?.id;
  const clientName = customer?.full_name || schedulingData?.fullName || '-';

  // Format meeting creation date
  const meetingCreationDate = meeting?.created_at 
    ? formatDate(meeting.created_at)
    : null;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Meeting Details Grid - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Meeting Details (Merged Meeting Type + Schedule) */}
        <Card className="p-6 border border-slate-200 rounded-xl shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">פרטי פגישה</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Right Column (visually): Meeting Type and Creation Date */}
            <div className="space-y-4">
              {/* Meeting Type Badge */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">סוג פגישה</label>
                <Badge 
                  variant="outline" 
                  className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold", meetingType.color)}
                >
                  <span>{meetingType.icon}</span>
                  {meetingType.label}
                </Badge>
              </div>

              {/* Meeting Creation Date */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">תאריך יצירה</label>
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">
                    {meetingCreationDate || <span className="text-gray-400">לא צוין</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Left Column (visually): Date and Time */}
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">תאריך</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">
                    {meetingDate || <span className="text-gray-400">לא צוין</span>}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">שעה</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">
                    {formatTimeRange() || <span className="text-gray-400">לא צוין</span>}
                  </p>
                </div>
              </div>

              {/* Timezone */}
              {schedulingData?.timezone && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">אזור זמן</label>
                  <p className="text-sm text-gray-700 font-medium">{schedulingData.timezone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional fields below the grid */}
          <div className="mt-4 space-y-4">
            {/* Location */}
            {location && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">מיקום</label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700 font-medium">{String(location)}</p>
                </div>
              </div>
            )}

            {/* Add to Calendar Button */}
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

        {/* Card 2: Client Details */}
        <Card className="p-6 border border-slate-200 rounded-xl shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">פרטי לקוח</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Client Name - Clickable */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">שם מלא</label>
                {clientId ? (
                  <button
                    onClick={handleClientNameClick}
                    className="text-sm font-semibold text-[#5B6FB9] hover:text-[#5B6FB9]/80 transition-colors cursor-pointer text-right"
                  >
                    {clientName}
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{clientName}</p>
                )}
              </div>

              {/* Phone - Plain Text */}
              {customer?.phone && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">טלפון</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-700 font-medium">{customer.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Email - Plain Text */}
              {(customer?.email || schedulingData?.email) && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">אימייל</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700 font-medium break-all">
                      {customer?.email || schedulingData?.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Meeting Scheduler */}
              {schedulingData?.scheduledUserName && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">מתזמן הפגישה</label>
                  <p className="text-sm text-gray-700 font-medium">{schedulingData.scheduledUserName}</p>
                  {schedulingData.scheduledUserEmail && (
                    <p className="text-xs text-gray-600 mt-1.5">{schedulingData.scheduledUserEmail}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Notes Card (if exists) */}
      {notes && (
        <Card className="p-6 border border-slate-200 rounded-xl shadow-sm bg-white">
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

