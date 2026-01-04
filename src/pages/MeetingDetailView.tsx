/**
 * MeetingDetailView Component - Redesigned
 * 
 * Modern, professional meeting details dashboard
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMeeting } from '@/hooks/useMeetings';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit,
  X,
  Video,
  Plus
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';

// Meeting type configuration
const MEETING_TYPES = {
  'פגישת הכרות': {
    label: 'פגישת הכרות',
    english: 'Introductory Meeting',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '👋',
  },
  'פגישת מעקב': {
    label: 'פגישת מעקב',
    english: 'Follow-up Meeting',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '📋',
  },
  'פגישת ביקורת חודשית': {
    label: 'פגישת ביקורת חודשית',
    english: 'Monthly Review',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    icon: '📊',
  },
  // Add more meeting types here as needed
} as const;

type MeetingTypeKey = keyof typeof MEETING_TYPES;

const MeetingDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const { data: meeting, isLoading } = useMeeting(id || null);
  const [isTechnicalDetailsOpen, setIsTechnicalDetailsOpen] = useState(false);

  const handleBack = () => {
    navigate('/dashboard/meetings');
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('[MeetingDetailView] Logout error:', error);
      navigate('/login');
    }
  };

  const handleSaveViewClick = () => {};
  const handleEditViewClick = () => {};

  if (isLoading) {
    return (
      <>
        <DashboardHeader 
          userEmail={user?.email} 
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
        />
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
          <main 
            className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out" 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: 'calc(100vh - 88px)',
            }}
          >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-gray-600">טוען פרטי פגישה...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <DashboardHeader 
          userEmail={user?.email} 
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
        />
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: '88px' }}>
          <main 
            className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out" 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: 'calc(100vh - 88px)',
            }}
          >
            <div className="p-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium mb-2">פגישה לא נמצאה</p>
                  <Button onClick={handleBack} variant="outline" className="mt-4">
                    חזור לרשימת פגישות
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const meetingData = meeting.meeting_data || {};
  const customer = meeting.customer;

  // Extract scheduling data from Fillout structure
  const extractSchedulingData = () => {
    // Try direct scheduling array
    if (meetingData.scheduling && Array.isArray(meetingData.scheduling) && meetingData.scheduling.length > 0) {
      const scheduling = meetingData.scheduling[0];
      if (scheduling.value) {
        return {
          name: scheduling.name || scheduling.value.name || 'פגישת הכרות',
          eventStartTime: scheduling.value.eventStartTime,
          eventEndTime: scheduling.value.eventEndTime,
          timezone: scheduling.value.timezone,
          scheduledUserName: scheduling.value.scheduledUserName,
          scheduledUserEmail: scheduling.value.scheduledUserEmail,
          email: scheduling.value.email,
          fullName: scheduling.value.fullName,
          calendarUrl: scheduling.value.calendarUrl || scheduling.value.googleCalendarUrl,
          rescheduleUrl: scheduling.value.rescheduleUrl || scheduling.value.cancelUrl,
        };
      }
    }

    // Try nested structure (scheduling[0].value.*)
    const schedulingKeys = Object.keys(meetingData).filter(key => key.startsWith('scheduling['));
    if (schedulingKeys.length > 0) {
      const scheduling0 = schedulingKeys.find(key => key.startsWith('scheduling[0]'));
      if (scheduling0) {
        const nameKey = `${scheduling0}.name`;
        const valuePrefix = `${scheduling0}.value`;
        
        return {
          name: meetingData[nameKey] || 'פגישת הכרות',
          eventStartTime: meetingData[`${valuePrefix}.eventStartTime`],
          eventEndTime: meetingData[`${valuePrefix}.eventEndTime`],
          timezone: meetingData[`${valuePrefix}.timezone`],
          scheduledUserName: meetingData[`${valuePrefix}.scheduledUserName`],
          scheduledUserEmail: meetingData[`${valuePrefix}.scheduledUserEmail`],
          email: meetingData[`${valuePrefix}.email`],
          fullName: meetingData[`${valuePrefix}.fullName`],
          calendarUrl: meetingData[`${valuePrefix}.calendarUrl`] || meetingData[`${valuePrefix}.googleCalendarUrl`],
          rescheduleUrl: meetingData[`${valuePrefix}.rescheduleUrl`] || meetingData[`${valuePrefix}.cancelUrl`],
        };
      }
    }

    return null;
  };

  const schedulingData = extractSchedulingData();

  // Extract meeting date and time
  let meetingDate = null;
  let meetingStartTime = null;
  let meetingEndTime = null;

  if (schedulingData?.eventStartTime) {
    try {
      const startDate = new Date(schedulingData.eventStartTime);
      if (!isNaN(startDate.getTime())) {
        meetingDate = formatDate(startDate.toISOString());
        const hours = startDate.getHours().toString().padStart(2, '0');
        const minutes = startDate.getMinutes().toString().padStart(2, '0');
        meetingStartTime = `${hours}:${minutes}`;
      }
    } catch (e) {
      console.error('[MeetingDetailView] Error parsing start time:', e);
    }
  }

  if (schedulingData?.eventEndTime) {
    try {
      const endDate = new Date(schedulingData.eventEndTime);
      if (!isNaN(endDate.getTime())) {
        const hours = endDate.getHours().toString().padStart(2, '0');
        const minutes = endDate.getMinutes().toString().padStart(2, '0');
        meetingEndTime = `${hours}:${minutes}`;
      }
    } catch (e) {
      console.error('[MeetingDetailView] Error parsing end time:', e);
    }
  }

  // Fallback to old extraction logic if scheduling data not found
  if (!meetingDate || !meetingStartTime) {
    // Try Schedule field
    if (meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות']) {
      const scheduleValue = meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות'];
      if (scheduleValue) {
        try {
          const scheduleDate = new Date(scheduleValue);
          if (!isNaN(scheduleDate.getTime())) {
            meetingDate = formatDate(scheduleDate.toISOString());
            const hours = scheduleDate.getHours().toString().padStart(2, '0');
            const minutes = scheduleDate.getMinutes().toString().padStart(2, '0');
            meetingStartTime = `${hours}:${minutes}`;
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  // Determine meeting type
  const meetingTypeName = schedulingData?.name || meetingData['פגישת הכרות'] || 'פגישת הכרות';
  const meetingType = MEETING_TYPES[meetingTypeName as MeetingTypeKey] || {
    label: meetingTypeName,
    english: 'Meeting',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '📅',
  };

  const status = meetingData.status || meetingData['סטטוס'] || 'פעיל';
  const location = meetingData.location || meetingData['מיקום'] || meetingData['מקום'];
  const notes = meetingData.notes || meetingData['הערות'] || meetingData['תיאור'];

  const getStatusColor = (status: string) => {
    const statusStr = String(status);
    if (statusStr.includes('בוטל') || statusStr.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusStr.includes('הושלם') || statusStr.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
    if (statusStr.includes('מתוכנן') || statusStr.includes('תוכנן')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatTimeRange = () => {
    if (meetingStartTime && meetingEndTime) {
      return `${meetingStartTime} - ${meetingEndTime}`;
    }
    return meetingStartTime || '-';
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
          className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="max-w-7xl mx-auto p-6">
            {/* Header with Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                חזור לרשימת פגישות
              </Button>
            </div>

            {/* Main Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {customer?.full_name || schedulingData?.fullName || 'לקוח ללא שם'}
                    </h1>
                    <Badge variant="outline" className={getStatusColor(status)}>
                      {String(status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant="outline" 
                      className={`${meetingType.color} border font-semibold text-sm px-3 py-1`}
                    >
                      <span className="ml-2">{meetingType.icon}</span>
                      {meetingType.label}
                    </Badge>
                    {meetingType.english && (
                      <span className="text-sm text-gray-500">{meetingType.english}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="flex flex-wrap gap-3 mb-6">
              {schedulingData?.calendarUrl && (
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => window.open(schedulingData.calendarUrl, '_blank')}
                >
                  <Calendar className="h-4 w-4 ml-2" />
                  הוסף ללוח שנה
                  <ExternalLink className="h-3 w-3 mr-2" />
                </Button>
              )}
              {schedulingData?.rescheduleUrl && (
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => window.open(schedulingData.rescheduleUrl, '_blank')}
                >
                  <Edit className="h-4 w-4 ml-2" />
                  שנה/בטל פגישה
                  <ExternalLink className="h-3 w-3 mr-2" />
                </Button>
              )}
              <Button
                variant="outline"
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 ml-2" />
                ערוך פרטים
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Video className="h-4 w-4 ml-2" />
                התחל פגישה
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Schedule Section */}
                <Card className="border border-gray-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-100">
                    <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      לוח זמנים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-500 block">תאריך</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-lg font-semibold text-gray-900">
                            {meetingDate || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-500 block">שעה</label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-lg font-semibold text-gray-900">
                            {formatTimeRange()}
                          </span>
                        </div>
                      </div>
                      {schedulingData?.timezone && (
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-500 block">אזור זמן</label>
                          <span className="text-gray-700">{schedulingData.timezone}</span>
                        </div>
                      )}
                      {location && (
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-500 block">מיקום</label>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{String(location)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Client Profile Card */}
                <Card className="border border-gray-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-100">
                    <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                      <User className="h-5 w-5 text-blue-600" />
                      פרטי לקוח
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-500 block">שם מלא</label>
                        <span className="text-lg font-semibold text-gray-900">
                          {customer?.full_name || schedulingData?.fullName || '-'}
                        </span>
                      </div>
                      {customer?.phone && (
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-500 block">טלפון</label>
                          <a 
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </a>
                        </div>
                      )}
                      {(customer?.email || schedulingData?.email) && (
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-500 block">אימייל</label>
                          <a 
                            href={`mailto:${customer?.email || schedulingData?.email}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <Mail className="h-4 w-4" />
                            {customer?.email || schedulingData?.email}
                          </a>
                        </div>
                      )}
                      {schedulingData?.scheduledUserName && (
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-500 block">מתזמן הפגישה</label>
                          <span className="text-gray-700">{schedulingData.scheduledUserName}</span>
                          {schedulingData.scheduledUserEmail && (
                            <a 
                              href={`mailto:${schedulingData.scheduledUserEmail}`}
                              className="text-sm text-blue-600 hover:text-blue-700 block mt-1"
                            >
                              {schedulingData.scheduledUserEmail}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                {notes && (
                  <Card className="border border-gray-200 rounded-xl shadow-sm">
                    <CardHeader className="pb-4 border-b border-gray-100">
                      <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                        <FileText className="h-5 w-5 text-blue-600" />
                        הערות ותיאור
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{String(notes)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Info Card */}
                <Card className="border border-gray-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-100">
                    <CardTitle className="text-lg text-gray-900">מידע מהיר</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-500 mb-1 block">תאריך יצירה</label>
                      <span className="text-gray-700">{formatDate(meeting.created_at)}</span>
                    </div>
                    {meeting.fillout_submission_id && (
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">ID הגשת Fillout</label>
                        <span className="text-xs font-mono text-gray-600 break-all">{meeting.fillout_submission_id}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Technical Details (Collapsible) */}
            <div className="mt-6">
              <Collapsible open={isTechnicalDetailsOpen} onOpenChange={setIsTechnicalDetailsOpen}>
                <Card className="border border-gray-200 rounded-xl shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-gray-900">פרטים טכניים</CardTitle>
                        {isTechnicalDetailsOpen ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-700 font-mono">
                          {JSON.stringify(meetingData, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MeetingDetailView;
