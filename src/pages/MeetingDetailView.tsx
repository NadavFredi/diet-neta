/**
 * MeetingDetailView Component
 * 
 * Matches the design of UnifiedProfileView (customer/lead detail page)
 * Uses the same PageLayout structure with header and sidebar
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { useMeeting } from '@/hooks/useMeetings';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ClientHero } from '@/components/dashboard/ClientHero';
import { MeetingActionDashboard } from '@/components/dashboard/MeetingActionDashboard';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { logoutUser } from '@/store/slices/authSlice';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';

// Meeting type configuration
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

  const handleWhatsApp = () => {
    const phone = meeting?.customer?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleEditDetails = () => {
    // TODO: Implement edit details logic
    console.log('Editing meeting details...');
  };

  const handleViewClientProfile = () => {
    if (meeting?.customer?.id) {
      navigate(`/leads/${meeting.lead?.id || meeting.customer.id}`);
    }
  };

  const handleSaveViewClick = () => {};
  const handleEditViewClick = () => {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטי פגישה...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">פגישה לא נמצאה</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לרשימת פגישות
          </Button>
        </div>
      </div>
    );
  }

  const meetingData = meeting.meeting_data || {};
  const customer = meeting.customer;

  // Extract scheduling data from Fillout structure
  const extractSchedulingData = () => {
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

  // Create customer object for ClientHero
  const customerForHero = customer ? {
    id: customer.id,
    full_name: customer.full_name || schedulingData?.fullName || 'לקוח ללא שם',
    phone: customer.phone || '',
    email: customer.email || schedulingData?.email || '',
    created_at: (customer as any).created_at || meeting.created_at,
    updated_at: (customer as any).updated_at || meeting.updated_at,
  } : null;

  // Create lead object for ClientHero (minimal)
  const leadForHero = {
    id: meeting.lead?.id || meeting.id,
    created_at: meeting.created_at,
    status_main: status,
    status_sub: null,
    customer_id: customer?.id || null,
    birth_date: null,
    height: null,
    weight: null,
    city: null,
    gender: null,
  };

  const handleUpdateLead = async () => {};
  const handleUpdateCustomer = async () => {};

  const HEADER_HEIGHT = 88;

  return (
    <div 
      className="flex flex-col overflow-hidden bg-gray-50/50" 
      style={{ 
        height: '100vh',
        overflow: 'hidden'
      }}
      dir="rtl"
    >
      {/* Top Navigation Header - Fixed */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 flex-shrink-0"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <DashboardHeader
          userEmail={user?.email}
          onLogout={handleLogout}
          sidebarContent={
            <DashboardSidebar 
              onSaveViewClick={handleSaveViewClick} 
              onEditViewClick={handleEditViewClick}
            />
          }
        />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex flex-col flex-1 overflow-hidden"
        style={{ 
          marginTop: `${HEADER_HEIGHT}px`,
          marginRight: `${sidebarWidth.width}px`,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`
        }}
      >
        {/* Page Header (ClientHero) */}
        {customerForHero && (
          <div className="flex-shrink-0 w-full bg-white border-b border-gray-200">
            <ClientHero
              customer={customerForHero}
              mostRecentLead={leadForHero}
              status={status}
              onBack={handleBack}
              onWhatsApp={handleWhatsApp}
              onUpdateLead={handleUpdateLead}
              onUpdateCustomer={handleUpdateCustomer}
              getStatusColor={getStatusColor}
            />
          </div>
        )}

        {/* Main Content Wrapper */}
        <main 
          className="flex-1 flex flex-col bg-gray-50 overflow-y-auto overflow-x-hidden scroll-smooth"
          style={{ 
            padding: '20px'
          }}
        >
          <div className="w-full max-w-7xl mx-auto">
            <MeetingActionDashboard
              meeting={meeting}
              customer={customer}
              schedulingData={schedulingData}
              meetingType={meetingType}
              status={status}
              meetingDate={meetingDate}
              formatTimeRange={formatTimeRange}
              location={location}
              notes={notes}
              getStatusColor={getStatusColor}
              onAddToCalendar={handleAddToCalendar}
              hasCalendarUrl={!!schedulingData?.calendarUrl}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MeetingDetailView;
