/**
 * MeetingDetailView Component - Redesigned
 * 
 * High-density, professional CRM-style dashboard matching Lead Management screen
 * Grid-based layout with efficient use of space
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ExternalLink,
  Edit,
  Video,
  MessageCircle,
  Link as LinkIcon,
  Info,
  Zap,
  Send,
  CalendarPlus,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';

// Meeting type configuration with extended support
const MEETING_TYPES = {
  'פגישת הכרות': {
    label: 'פגישת הכרות',
    english: 'Introductory Meeting',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '👋',
    iconColor: 'bg-blue-100',
    iconTextColor: 'text-blue-600',
  },
  'פגישת מעקב': {
    label: 'פגישת מעקב',
    english: 'Follow-up Meeting',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '📋',
    iconColor: 'bg-purple-100',
    iconTextColor: 'text-purple-600',
  },
  'פגישת ביקורת חודשית': {
    label: 'פגישת ביקורת חודשית',
    english: 'Monthly Review',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    icon: '📊',
    iconColor: 'bg-pink-100',
    iconTextColor: 'text-pink-600',
  },
  'פגישת תזונה': {
    label: 'פגישת תזונה',
    english: 'Nutrition Meeting',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🥗',
    iconColor: 'bg-green-100',
    iconTextColor: 'text-green-600',
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

  const handleWhatsApp = () => {
    const phone = meeting?.customer?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleStartMeeting = () => {
    // TODO: Implement meeting start logic
    console.log('Starting meeting...');
  };

  const handleEditDetails = () => {
    // TODO: Implement edit details logic
    console.log('Editing meeting details...');
  };

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
            className="bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out" 
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
            className="bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out" 
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

    // Try direct string keys (Fillout stores as "scheduling[0].value.eventStartTime")
    const eventStartTimeKey = 'scheduling[0].value.eventStartTime';
    const eventEndTimeKey = 'scheduling[0].value.eventEndTime';
    
    if (meetingData[eventStartTimeKey] || meetingData[eventEndTimeKey]) {
      return {
        name: meetingData['scheduling[0].name'] || meetingData['scheduling[0].value.name'] || 'פגישת הכרות',
        eventStartTime: meetingData[eventStartTimeKey],
        eventEndTime: meetingData[eventEndTimeKey],
        timezone: meetingData['scheduling[0].value.timezone'],
        scheduledUserName: meetingData['scheduling[0].value.scheduledUserName'],
        scheduledUserEmail: meetingData['scheduling[0].value.scheduledUserEmail'],
        email: meetingData['scheduling[0].value.email'],
        fullName: meetingData['scheduling[0].value.fullName'],
        calendarUrl: meetingData['scheduling[0].value.calendarUrl'] || meetingData['scheduling[0].value.googleCalendarUrl'],
        rescheduleUrl: meetingData['scheduling[0].value.rescheduleUrl'] || meetingData['scheduling[0].value.cancelUrl'],
      };
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

  // Fallback to direct key access
  if (!meetingDate || !meetingStartTime) {
    const directStartTime = meetingData['scheduling[0].value.eventStartTime'];
    if (directStartTime) {
      try {
        const startDate = new Date(directStartTime);
        if (!isNaN(startDate.getTime())) {
          meetingDate = formatDate(startDate.toISOString());
          const hours = startDate.getHours().toString().padStart(2, '0');
          const minutes = startDate.getMinutes().toString().padStart(2, '0');
          meetingStartTime = `${hours}:${minutes}`;
        }
      } catch (e) {
        console.error('[MeetingDetailView] Error parsing direct start time:', e);
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
    iconColor: 'bg-gray-100',
    iconTextColor: 'text-gray-600',
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
      if (meetingStartTime > meetingEndTime) {
        return `${meetingEndTime} - ${meetingStartTime}`;
      }
      return `${meetingStartTime} - ${meetingEndTime}`;
    }
    return meetingStartTime || '-';
  };

  const handleAddToCalendar = () => {
    if (schedulingData?.calendarUrl) {
      window.open(schedulingData.calendarUrl, '_blank');
    }
  };

  const handleViewClientProfile = () => {
    if (customer?.id) {
      navigate(`/leads/${meeting.lead?.id || customer.id}`);
    }
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
          className="bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out" 
          style={{ 
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 88px)',
          }}
        >
          <div className="p-4 w-full min-w-0">
            {/* Header Section - Similar to ClientHero */}
            <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm mb-4" dir="rtl">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left Side: Back Button, Name, Badges */}
                  <div className="flex items-center gap-4 flex-wrap min-w-0">
                    <Button
                      onClick={handleBack}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 flex-shrink-0 h-7 px-2"
                    >
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      חזור
                    </Button>
                    
                    <h1 className="text-base font-bold text-gray-900 flex-shrink-0">
                      {customer?.full_name || schedulingData?.fullName || 'לקוח ללא שם'}
                    </h1>
                    
                    {customer?.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm text-gray-600 hover:text-[#5B6FB9] flex items-center gap-1 flex-shrink-0"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone}
                      </a>
                    )}
                    
                    <Badge variant="outline" className={`${getStatusColor(status)} text-xs px-2 py-0.5 font-semibold flex-shrink-0`}>
                      {String(status)}
                    </Badge>
                    
                    <Badge 
                      variant="outline" 
                      className={`${meetingType.color} border font-semibold text-xs px-2 py-0.5 flex-shrink-0`}
                    >
                      <span className="ml-1">{meetingType.icon}</span>
                      {meetingType.label}
                    </Badge>
                  </div>

                  {/* Right Side: Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="default"
                      className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white text-base font-semibold rounded-lg px-4 py-2"
                      onClick={handleStartMeeting}
                    >
                      <Video className="h-5 w-5 ml-2" strokeWidth={2.5} />
                      התחל פגישה
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-base font-semibold rounded-lg px-4 py-2"
                      onClick={handleEditDetails}
                    >
                      <Edit className="h-5 w-5 ml-2" strokeWidth={2.5} />
                      ערוך פרטים
                    </Button>
                    {customer?.phone && (
                      <Button
                        variant="outline"
                        size="default"
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-base font-semibold rounded-lg px-4 py-2"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="h-5 w-5 ml-2" strokeWidth={2.5} />
                        WhatsApp
                      </Button>
                    )}
                    {schedulingData?.calendarUrl && (
                      <Button
                        variant="outline"
                        size="default"
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-base font-semibold rounded-lg px-4 py-2"
                        onClick={handleAddToCalendar}
                      >
                        <LinkIcon className="h-5 w-5 ml-2" strokeWidth={2.5} />
                        לוח שנה
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Meeting Identity & Type */}
              <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", meetingType.iconColor)}>
                    <span className="text-lg">{meetingType.icon}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">סוג פגישה</h3>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">סוג</label>
                    <Badge 
                      variant="outline" 
                      className={cn("w-full justify-center py-2 text-sm font-semibold", meetingType.color)}
                    >
                      <span className="ml-1">{meetingType.icon}</span>
                      {meetingType.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">סטטוס</label>
                    <Badge 
                      variant="outline" 
                      className={cn("w-full justify-center py-2 text-sm font-semibold", getStatusColor(status))}
                    >
                      {String(status)}
                    </Badge>
                  </div>
                  {meetingType.english && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">English</label>
                      <p className="text-sm text-gray-700">{meetingType.english}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 2: Client Profile */}
              <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">פרטי לקוח</h3>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">שם מלא</label>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {customer?.full_name || schedulingData?.fullName || '-'}
                      </p>
                      {customer?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-[#5B6FB9] hover:text-[#5B6FB9]/80"
                          onClick={handleViewClientProfile}
                        >
                          <ExternalLink className="h-3 w-3 ml-1" />
                          צפה בפרופיל
                        </Button>
                      )}
                    </div>
                  </div>
                  {customer?.phone && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">טלפון</label>
                      <a 
                        href={`tel:${customer.phone}`}
                        className="flex items-center gap-2 text-sm text-[#5B6FB9] hover:text-[#5B6FB9]/80 font-medium"
                      >
                        <Phone className="h-4 w-4" />
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {(customer?.email || schedulingData?.email) && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">אימייל</label>
                      <a 
                        href={`mailto:${customer?.email || schedulingData?.email}`}
                        className="flex items-center gap-2 text-sm text-[#5B6FB9] hover:text-[#5B6FB9]/80 break-all"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{customer?.email || schedulingData?.email}</span>
                      </a>
                    </div>
                  )}
                  {schedulingData?.scheduledUserName && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">מתזמן הפגישה</label>
                      <p className="text-sm text-gray-700">{schedulingData.scheduledUserName}</p>
                      {schedulingData.scheduledUserEmail && (
                        <a 
                          href={`mailto:${schedulingData.scheduledUserEmail}`}
                          className="text-xs text-[#5B6FB9] hover:text-[#5B6FB9]/80 block mt-1"
                        >
                          {schedulingData.scheduledUserEmail}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 3: Scheduling Details */}
              <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">לוח זמנים</h3>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">
                        {meetingDate || <span className="text-gray-400">לא צוין</span>}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">שעה</label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">
                        {formatTimeRange() || <span className="text-gray-400">לא צוין</span>}
                      </p>
                    </div>
                  </div>
                  {schedulingData?.timezone && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">אזור זמן</label>
                      <p className="text-sm text-gray-700">{schedulingData.timezone}</p>
                    </div>
                  )}
                  {location && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">מיקום</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-700">{String(location)}</p>
                      </div>
                    </div>
                  )}
                  {schedulingData?.calendarUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={handleAddToCalendar}
                    >
                      <CalendarPlus className="h-3.5 w-3.5 ml-1.5" />
                      הוסף ללוח שנה
                    </Button>
                  )}
                </div>
              </Card>

              {/* Card 4: Technical & Meta-Data (Low Profile) */}
              <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Info className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">מידע טכני</h3>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">מקור</label>
                    <p className="text-xs text-gray-600">Fillout</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך יצירה</label>
                    <p className="text-xs text-gray-600">
                      {meeting.created_at ? formatDate(meeting.created_at) : '-'}
                    </p>
                  </div>
                  {meeting.fillout_submission_id && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">מזהה הגשה</label>
                      <p className="text-xs text-gray-600 font-mono truncate">{meeting.fillout_submission_id}</p>
                    </div>
                  )}
                  {meeting.id && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">מזהה פגישה</label>
                      <p className="text-xs text-gray-600 font-mono truncate">{meeting.id}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 5: Quick Actions/Automation */}
              <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col md:col-span-2">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">פעולות מהירות</h3>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customer?.phone && (
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-4 border border-slate-200 hover:bg-green-50 hover:border-green-200"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="h-4 w-4 ml-2 text-green-600" />
                        <div className="text-right flex-1">
                          <div className="text-sm font-semibold text-gray-900">שלח הודעת WhatsApp</div>
                          <div className="text-xs text-gray-500">שלח הודעה מהירה ללקוח</div>
                        </div>
                      </Button>
                    )}
                    {schedulingData?.rescheduleUrl && (
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-4 border border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                        onClick={() => window.open(schedulingData.rescheduleUrl, '_blank')}
                      >
                        <Edit className="h-4 w-4 ml-2 text-blue-600" />
                        <div className="text-right flex-1">
                          <div className="text-sm font-semibold text-gray-900">שנה/בטל פגישה</div>
                          <div className="text-xs text-gray-500">ערוך או בטל את הפגישה</div>
                        </div>
                      </Button>
                    )}
                    {customer?.id && (
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-4 border border-slate-200 hover:bg-purple-50 hover:border-purple-200"
                        onClick={handleViewClientProfile}
                      >
                        <User className="h-4 w-4 ml-2 text-purple-600" />
                        <div className="text-right flex-1">
                          <div className="text-sm font-semibold text-gray-900">צפה בפרופיל לקוח</div>
                          <div className="text-xs text-gray-500">עבור לדף הלקוח המלא</div>
                        </div>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4 border border-slate-200 hover:bg-pink-50 hover:border-pink-200"
                      onClick={handleEditDetails}
                    >
                      <FileText className="h-4 w-4 ml-2 text-pink-600" />
                      <div className="text-right flex-1">
                        <div className="text-sm font-semibold text-gray-900">ערוך פרטי פגישה</div>
                        <div className="text-xs text-gray-500">עדכן מידע על הפגישה</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Notes Card (if exists) */}
              {notes && (
                <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col md:col-span-3">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">הערות ותיאור</h3>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{String(notes)}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MeetingDetailView;
