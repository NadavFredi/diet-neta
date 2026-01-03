/**
 * MeetingDetailView Component
 * 
 * Displays detailed information about a single meeting
 */

import { useParams, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeeting } from '@/hooks/useMeetings';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { ArrowRight, Calendar, Clock, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';

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

  // Debug: Log meeting_data to help identify fields
  if (process.env.NODE_ENV === 'development') {
    console.log('[MeetingDetailView] Full meeting_data:', meetingData);
    console.log('[MeetingDetailView] meeting_data keys:', Object.keys(meetingData));
    console.log('[MeetingDetailView] meeting_data keys count:', Object.keys(meetingData).length);
    
    // Check for Schedule-related fields
    const scheduleRelatedKeys = Object.keys(meetingData).filter(key => {
      const keyLower = key.toLowerCase();
      return keyLower.includes('schedule') || 
             keyLower.includes('date') || 
             keyLower.includes('time') ||
             keyLower.includes('תאריך') || 
             keyLower.includes('שעה') || 
             keyLower.includes('זמן') ||
             keyLower.includes('פגישה');
    });
    if (scheduleRelatedKeys.length > 0) {
      console.log('[MeetingDetailView] Schedule/Date/Time-related keys found:', scheduleRelatedKeys);
      scheduleRelatedKeys.forEach(key => {
        console.log(`[MeetingDetailView] ${key}:`, meetingData[key], typeof meetingData[key]);
      });
    } else {
      console.warn('[MeetingDetailView] No Schedule/Date/Time-related keys found in meeting_data!');
      console.warn('[MeetingDetailView] This suggests the Fillout data was not extracted properly.');
      console.warn('[MeetingDetailView] Please check Supabase Edge Function logs for sync-fillout-meetings or receive-fillout-webhook');
    }
  }

  // Extract actual meeting date and time from Schedule field (not submission time)
  let meetingDate = null;
  let meetingTime = null;
  
  // First, try to extract from Schedule field (actual meeting date/time from Fillout)
  if (meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות']) {
    const scheduleValue = meetingData.Schedule || meetingData.schedule || meetingData['Schedule'] || meetingData['פגישת הכרות'];
    if (scheduleValue) {
      try {
        // Try to parse as date
        const scheduleDate = new Date(scheduleValue);
        if (!isNaN(scheduleDate.getTime())) {
          // Extract date
          meetingDate = formatDate(scheduleDate.toISOString());
          // Extract time in HH:MM format
          const hours = scheduleDate.getHours().toString().padStart(2, '0');
          const minutes = scheduleDate.getMinutes().toString().padStart(2, '0');
          meetingTime = `${hours}:${minutes}`;
        } else {
          // If parsing fails, try to extract date and time from string (e.g., "Jan 5, 2026 11:00 AM")
          const dateMatch = String(scheduleValue).match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\w+\s+\d{1,2},\s+\d{4})/);
          if (dateMatch) {
            try {
              const parsedDate = new Date(dateMatch[0]);
              if (!isNaN(parsedDate.getTime())) {
                meetingDate = formatDate(parsedDate.toISOString());
              }
            } catch (e) {
              meetingDate = dateMatch[0];
            }
          }
          
          // Extract time pattern (e.g., "11:00 AM" or "11:00")
          const timeMatch = String(scheduleValue).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            meetingTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
          } else {
            const timePatternMatch = String(scheduleValue).match(/(\d{1,2}):(\d{2})/);
            if (timePatternMatch) {
              meetingTime = timePatternMatch[0];
            }
          }
        }
      } catch (e) {
        // If parsing fails, continue to other fields
      }
    }
  }
  
  // Fallback to other common date fields (if Schedule not found)
  if (!meetingDate) {
    meetingDate = meetingData.date || 
                  meetingData.meeting_date || 
                  meetingData['תאריך'] || 
                  meetingData['תאריך פגישה'] ||
                  meetingData['Date'] ||
                  meetingData['Meeting Date'];
  }
  
  // Fallback to other common time fields (if Schedule not found)
  if (!meetingTime) {
    meetingTime = meetingData.hour ||
                  meetingData.time || 
                  meetingData.meeting_time || 
                  meetingData['שעה'] || 
                  meetingData['שעת פגישה'];
  }
  
  // If not found, search through all keys for time-related patterns
  if (!meetingTime) {
    const allKeys = Object.keys(meetingData);
    
    // First pass: look specifically for 'hour' field (case-insensitive)
    for (const key of allKeys) {
      const keyLower = key.toLowerCase();
      if (keyLower === 'hour' || keyLower === 'שעה') {
        const value = meetingData[key];
        if (value && value !== null && value !== '') {
          meetingTime = value;
          break;
        }
      }
    }
    
    // Second pass: look for other time-related fields
    if (!meetingTime) {
      for (const key of allKeys) {
        const keyLower = key.toLowerCase();
        const value = meetingData[key];
        
        if (keyLower.includes('time') || 
            keyLower.includes('hour') || 
            keyLower.includes('שעה') ||
            keyLower.includes('זמן')) {
          if (value && value !== null && value !== '') {
            meetingTime = value;
            break;
          }
        }
        
        // Check if value looks like a time (HH:MM or HHMM format)
        if (value && typeof value === 'string') {
          const timePattern = /^(\d{1,2}):(\d{2})/; // HH:MM
          const timePatternNoColon = /^(\d{3,4})$/; // HHMM or HMM
          if (timePattern.test(value) || timePatternNoColon.test(value)) {
            meetingTime = value;
            break;
          }
        }
      }
    }
  }
  
  // Format time if it's a number (like 1430 for 14:30)
  if (meetingTime && typeof meetingTime === 'string') {
    const timeStr = meetingTime.trim();
    if (/^\d{3,4}$/.test(timeStr)) {
      const padded = timeStr.padStart(4, '0');
      const hours = padded.substring(0, 2);
      const minutes = padded.substring(2, 4);
      meetingTime = `${hours}:${minutes}`;
    }
  }
  
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
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                חזור לרשימת פגישות
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">פרטי פגישה</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Meeting Information */}
                <Card className="border border-slate-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      פרטי פגישה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">תאריך</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 font-medium">
                            {meetingDate ? String(meetingDate) : '-'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">שעה</label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 font-medium">
                            {meetingTime ? String(meetingTime) : '-'}
                          </span>
                        </div>
                      </div>
                      {location && (
                        <div>
                          <label className="text-sm font-semibold text-gray-500 mb-1 block">מיקום</label>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{String(location)}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">סטטוס</label>
                        <Badge variant="outline" className={getStatusColor(status)}>
                          {String(status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes/Description */}
                {notes && (
                  <Card className="border border-slate-200 rounded-xl shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        הערות ותיאור
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{String(notes)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* All Meeting Data (Raw JSON) */}
                <Card className="border border-slate-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">כל הנתונים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-gray-700">
                        {JSON.stringify(meetingData, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Customer Information */}
                {customer && (
                  <Card className="border border-slate-200 rounded-xl shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        פרטי לקוח
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">שם מלא</label>
                        <span className="text-gray-900 font-medium">{customer.full_name}</span>
                      </div>
                      {customer.phone && (
                        <div>
                          <label className="text-sm font-semibold text-gray-500 mb-1 block">טלפון</label>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-sm">{customer.phone}</span>
                          </div>
                        </div>
                      )}
                      {customer.email && (
                        <div>
                          <label className="text-sm font-semibold text-gray-500 mb-1 block">אימייל</label>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card className="border border-slate-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">מידע נוסף</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-500 mb-1 block">תאריך יצירה</label>
                      <span className="text-gray-700">{formatDate(meeting.created_at)}</span>
                    </div>
                    {meeting.fillout_submission_id && (
                      <div>
                        <label className="text-sm font-semibold text-gray-500 mb-1 block">ID הגשת Fillout</label>
                        <span className="text-xs font-mono text-gray-600">{meeting.fillout_submission_id}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MeetingDetailView;

