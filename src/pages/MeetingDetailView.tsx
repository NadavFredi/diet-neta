/**
 * MeetingDetailView Component - Matches customer page design
 * 
 * Uses same ClientHero header and customer notes system
 * Layout:
 * - ClientHero header (same as customer page)
 * - Tabs below header: הערות, היסטוריה, צפה כמתאמן, תשלומים, WhatsApp
 * - Three vertical panels: Client Details, Meeting Details, Notes (using CustomerNotesSidebar)
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ClientHero } from '@/components/dashboard/ClientHero';
import { ClientHeroBar } from '@/components/dashboard/ClientHeroBar';
import { ResizableNotesPanel } from '@/components/dashboard/ResizableNotesPanel';
import { LeadSidebarContainer } from '@/components/dashboard/LeadSidebarContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeeting, useDeleteMeeting } from '@/hooks/useMeetings';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { 
  Calendar, 
  Clock, 
  User, 
  Handshake,
  Trash2,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/hooks/useCustomers';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { selectCustomerNotes, fetchCustomerNotes } from '@/store/slices/leadViewSlice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// Meeting type configuration
const MEETING_TYPES = {
  'פגישת הכרות': {
    label: 'פגישת הכרות',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '👋',
  },
  'פגישת מעקב': {
    label: 'פגישת מעקב',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '📋',
  },
  'פגישת ביקורת חודשית': {
    label: 'פגישת ביקורת חודשית',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    icon: '📊',
  },
  'פגישת תזונה': {
    label: 'פגישת תזונה',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🥗',
  },
  'תיאום תקציב': {
    label: 'תיאום תקציב',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '💰',
  },
} as const;

type MeetingTypeKey = keyof typeof MEETING_TYPES;

const MeetingDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const { data: meeting, isLoading } = useMeeting(id || null);
  const deleteMeeting = useDeleteMeeting();
  const { toast } = useToast();

  // Get customer from meeting
  const customerId = meeting?.customer_id || meeting?.lead?.customer_id;
  const { data: customer } = useCustomer(customerId || null);

  // Get lead data for ClientHero
  const { data: leadData } = useQuery({
    queryKey: ['lead', meeting?.lead_id],
    queryFn: async () => {
      if (!meeting?.lead_id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', meeting.lead_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!meeting?.lead_id,
  });

  // Fetch all leads for the customer (for history sidebar)
  const { data: allLeads } = useQuery({
    queryKey: ['leads-for-customer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // Sort leads by created_at descending (most recent first)
  const sortedLeads = allLeads || [];

  const handleBack = () => {
    // Check if we have a return URL from location state (e.g., from lead page)
    const returnTo = (location.state as any)?.returnTo;
    if (returnTo && returnTo.startsWith('/leads/')) {
      navigate(returnTo);
    } else {
      // Default to meetings list page
      navigate('/dashboard/meetings');
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleSaveViewClick = () => {};
  const handleEditViewClick = () => {};

  const handleWhatsApp = () => {
    const phone = customer?.phone || meeting?.customer?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  // Update handlers for ClientHero
  const updateLead = useUpdateLead();
  const updateCustomer = useUpdateCustomer();

  const handleUpdateLead = async (updates: any) => {
    if (!leadData?.id) return;
    await updateLead.mutateAsync({
      leadId: leadData.id,
      updates,
    });
  };

  const handleUpdateCustomer = async (updates: any) => {
    if (!customer?.id) return;
    await updateCustomer.mutateAsync({
      customerId: customer.id,
      updates,
    });
  };

  const handleViewCustomerProfile = () => {
    if (customer?.id) {
      navigate(`/leads/${meeting.lead_id || customer.id}`);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meeting?.id) return;

    try {
      await deleteMeeting.mutateAsync(meeting.id);
      toast({
        title: 'הצלחה',
        description: 'הפגישה נמחקה בהצלחה',
      });
      setIsDeleteDialogOpen(false);
      // Navigate back to meetings list
      navigate('/dashboard/meetings');
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הפגישה',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const statusStr = String(status);
    if (statusStr.includes('בוטל') || statusStr.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusStr.includes('הושלם') || statusStr.includes('הושלם')) return 'bg-green-50 text-green-700 border-green-200';
    if (statusStr.includes('מתוכנן') || statusStr.includes('תוכנן')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Get sidebar states from Redux (same as customer page) - MUST be before early returns
  const notesOpen = useAppSelector((state) => state.leadView.notesOpen);
  const leftSidebar = useAppSelector((state) => state.leadView.leftSidebar);

  // Modal state management (same as lead page)
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isTraineeSettingsOpen, setIsTraineeSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get notes count for the customer
  // Memoize the selector to prevent creating a new selector on every render
  const customerNotesSelector = useMemo(
    () => selectCustomerNotes(customer?.id),
    [customer?.id]
  );
  const notes = useAppSelector(customerNotesSelector);
  const notesCount = notes?.length || 0;

  // Fetch notes when customer changes - MUST be before early returns
  useEffect(() => {
    if (customer?.id) {
      dispatch(fetchCustomerNotes(customer.id));
    }
  }, [customer?.id, dispatch]);

  const HEADER_HEIGHT_LOADING = 60;

  if (isLoading) {
    return (
      <>
        <div
          className="fixed top-0 left-0 right-0 z-40 flex-shrink-0"
          style={{ height: `${HEADER_HEIGHT_LOADING}px` }}
        >
          <DashboardHeader 
            userEmail={user?.email} 
            onLogout={handleLogout}
            sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
          />
        </div>
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: `${HEADER_HEIGHT_LOADING}px` }}>
          <main 
            className="bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out" 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: `calc(100vh - ${HEADER_HEIGHT_LOADING}px)`,
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

  if (!meeting || !customer) {
    return (
      <>
        <div
          className="fixed top-0 left-0 right-0 z-40 flex-shrink-0"
          style={{ height: `${HEADER_HEIGHT_LOADING}px` }}
        >
          <DashboardHeader 
            userEmail={user?.email} 
            onLogout={handleLogout}
            sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
          />
        </div>
        <div className="min-h-screen" dir="rtl" style={{ paddingTop: `${HEADER_HEIGHT_LOADING}px` }}>
          <main 
            className="bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out" 
            style={{ 
              marginRight: `${sidebarWidth.width}px`,
              minHeight: `calc(100vh - ${HEADER_HEIGHT_LOADING}px)`,
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

  // Extract scheduling data
  const extractSchedulingData = () => {
    // First, check for direct event_start_time and event_end_time fields (from custom webhook payloads)
    if (meetingData.event_start_time || meetingData.event_end_time || meetingData.eventStartTime || meetingData.eventEndTime) {
      const meetingType = meetingData['סוג פגישה'] || 
                        meetingData.meeting_type ||
                        meetingData['Form_name'] ||
                        'פגישת הכרות';
      return {
        name: meetingType,
        eventStartTime: meetingData.event_start_time || meetingData.eventStartTime,
        eventEndTime: meetingData.event_end_time || meetingData.eventEndTime,
        timezone: meetingData.timezone || null,
        scheduledUserName: meetingData.scheduledUserName || null,
        scheduledUserEmail: meetingData.scheduledUserEmail || null,
        email: meetingData.email || null,
        fullName: meetingData.fullName || null,
      };
    }

    if (meetingData.scheduling && Array.isArray(meetingData.scheduling) && meetingData.scheduling.length > 0) {
      const scheduling = meetingData.scheduling[0];
      if (scheduling.value) {
        // Check for meeting type in meeting_data first, then fall back to scheduling data
        const meetingType = meetingData['סוג פגישה'] || 
                          meetingData.meeting_type ||
                          meetingData['Form_name'] ||
                          scheduling.name || 
                          scheduling.value.name || 
                          'פגישת הכרות';
        return {
          name: meetingType,
          eventStartTime: scheduling.value.eventStartTime,
          eventEndTime: scheduling.value.eventEndTime,
          timezone: scheduling.value.timezone,
          scheduledUserName: scheduling.value.scheduledUserName,
          scheduledUserEmail: scheduling.value.scheduledUserEmail,
          email: scheduling.value.email,
          fullName: scheduling.value.fullName,
        };
      }
    }

    const eventStartTimeKey = 'scheduling[0].value.eventStartTime';
    const eventEndTimeKey = 'scheduling[0].value.eventEndTime';
    
    if (meetingData[eventStartTimeKey] || meetingData[eventEndTimeKey]) {
      // Check for meeting type in meeting_data first, then fall back to scheduling data
      const meetingType = meetingData['סוג פגישה'] || 
                        meetingData.meeting_type ||
                        meetingData['Form_name'] ||
                        meetingData['scheduling[0].name'] || 
                        meetingData['scheduling[0].value.name'] || 
                        'פגישת הכרות';
      return {
        name: meetingType,
        eventStartTime: meetingData[eventStartTimeKey],
        eventEndTime: meetingData[eventEndTimeKey],
        timezone: meetingData['scheduling[0].value.timezone'],
        scheduledUserName: meetingData['scheduling[0].value.scheduledUserName'],
        scheduledUserEmail: meetingData['scheduling[0].value.scheduledUserEmail'],
        email: meetingData['scheduling[0].value.email'],
        fullName: meetingData['scheduling[0].value.fullName'],
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
    }
  }

  // Determine meeting type - check multiple possible field names
  const meetingTypeName = schedulingData?.name || 
                         meetingData['סוג פגישה'] || 
                         meetingData.meeting_type ||
                         meetingData['פגישת הכרות'] || 
                         'פגישת הכרות';
  const meetingType = MEETING_TYPES[meetingTypeName as MeetingTypeKey] || {
    label: meetingTypeName,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '📅',
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

  const status = meetingData.status || meetingData['סטטוס'] || 'פעיל';

  const HEADER_HEIGHT = 60;

  return (
    <>
      {/* Top Navigation Header - Fixed (spans full width) */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex-shrink-0"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <DashboardHeader 
          userEmail={user?.email} 
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
          clientHeroContent={
            customer ? (
              <ClientHeroBar
                customer={customer}
                mostRecentLead={leadData as any}
                onBack={handleBack}
                onWhatsApp={handleWhatsApp}
                onUpdateCustomer={handleUpdateCustomer}
                onViewCustomerProfile={handleViewCustomerProfile}
                onPaymentHistoryClick={() => setIsPaymentHistoryOpen(true)}
                onTraineeSettingsClick={() => setIsTraineeSettingsOpen(true)}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                isExpanded={isExpanded}
                notesCount={notesCount}
              />
            ) : undefined
          }
        />
      </div>
          
      {/* Main Content Area - Below Navigation Header */}
      <div 
        className="flex flex-col flex-1 overflow-hidden"
        style={{ 
          marginTop: `${HEADER_HEIGHT}px`,
          marginRight: `${sidebarWidth.width}px`, // Account for navigation sidebar
          height: `calc(100vh - ${HEADER_HEIGHT}px)`
        }}
        dir="rtl"
      >
        {/* Page Header (ClientHero) - Full Width, Fixed at Top - Only show expandable section when main bar is in header */}
        {customer && (
          <div
            className="flex-shrink-0 w-full bg-white border-b border-gray-200"
            style={{
              marginTop: isExpanded ? 'var(--expandable-height, 0px)' : '0px'
            }}
          >
            <ClientHero
              customer={customer}
              mostRecentLead={leadData as any}
              status={status}
              onBack={handleBack}
              onWhatsApp={handleWhatsApp}
              onUpdateLead={handleUpdateLead}
              onUpdateCustomer={handleUpdateCustomer}
              getStatusColor={getStatusColor}
              onViewCustomerProfile={handleViewCustomerProfile}
              hideMainBar={true}
              isPaymentHistoryOpen={isPaymentHistoryOpen}
              onPaymentHistoryClose={() => setIsPaymentHistoryOpen(false)}
              isTraineeSettingsOpen={isTraineeSettingsOpen}
              onTraineeSettingsClose={() => setIsTraineeSettingsOpen(false)}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
            />
          </div>
        )}

        {/* Main Content Wrapper - Dual Column Layout (Body | Notes) */}
        <div 
          className="flex flex-1 overflow-hidden"
          style={{ 
            flexDirection: 'row' // RTL row: Notes first = right, Body second = left
          }}
          dir="rtl"
        >
            {/* Notes Panel - Opens from header button, same as customer page */}
            {notesOpen && (
              <ResizableNotesPanel 
                customerId={customer?.id || null} 
                leads={leadData ? [{
                  id: leadData.id,
                  created_at: leadData.created_at,
                  fitness_goal: leadData.fitness_goal,
                  status_main: leadData.status_main,
                }] : []}
                activeLeadId={meeting.lead_id || null}
              />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col bg-gray-50 overflow-y-auto" style={{ padding: '20px' }} dir="rtl">
              {/* Content Area - Split View for History/Submission Sidebar */}
              <div 
                className="flex-1 flex gap-4 w-full" 
                style={{ 
                  direction: 'rtl', 
                  overflowX: 'hidden',
                  minHeight: 'fit-content'
                }}
                dir="rtl"
              >
                {/* Left Side: History or Submission Sidebar */}
                {leftSidebar === 'history' && (
                  <LeadSidebarContainer
                    leads={sortedLeads}
                    activeLeadId={meeting.lead_id || null}
                    onLeadSelect={(leadId) => {
                      // Navigate to the lead page if different lead is selected
                      if (leadId !== meeting.lead_id) {
                        navigate(`/leads/${leadId}`);
                      }
                    }}
                    getStatusColor={getStatusColor}
                    getStatusBorderColor={getStatusColor}
                    formSubmission={null}
                  />
                )}

                {/* Center: Meeting Details Panels - 2 columns in one row */}
                <div 
                  className="flex-1 w-full transition-all duration-200 ease-out"
                  style={{ 
                    minWidth: '0', // Allow flex item to shrink
                    maxWidth: '100%',
                    width: '100%'
                  }}
                >
                  <div 
                    className="grid gap-4 w-full" 
                    style={{ 
                      gridTemplateColumns: '1fr 1fr',
                      display: 'grid',
                      width: '100%',
                      gridAutoFlow: 'row'
                    }}
                  >
                    {/* Left Panel: Client Details */}
                    <Card className="p-4 border border-slate-200 rounded-xl shadow-sm bg-white" style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">פרטי לקוח</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">שם מלא</label>
                          <p className="text-sm text-gray-900">
                            {customer.full_name || '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">אימייל</label>
                          <p className="text-sm text-gray-900">
                            {customer.email || '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">טלפון</label>
                          <p className="text-sm text-gray-900">
                            {customer.phone || '-'}
                          </p>
                        </div>
                        {schedulingData?.scheduledUserName && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">מתזמן הפגישה</label>
                            <p className="text-sm text-gray-900">{schedulingData.scheduledUserName}</p>
                            {schedulingData.scheduledUserEmail && (
                              <p className="text-xs text-gray-600">{schedulingData.scheduledUserEmail}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Right Panel: Meeting Details */}
                    <Card className="p-4 border border-slate-200 rounded-xl shadow-sm bg-white" style={{ minWidth: 0 }}>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">פרטי פגישה</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">סוג פגישה</label>
                          <div className="flex items-center gap-2">
                            <Handshake className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {meetingType.label}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך</label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {meetingDate || '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">שעה</label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {formatTimeRange() || '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך יצירה</label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {meeting.created_at ? formatDate(meeting.created_at) : '-'}
                            </p>
                          </div>
                        </div>
                        {schedulingData?.timezone && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">אזור זמן</label>
                            <p className="text-sm text-gray-900">{schedulingData.timezone}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </main>
          </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פגישה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק פגישה זו? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMeeting.isPending}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeeting}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMeeting.isPending}
            >
              {deleteMeeting.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MeetingDetailView;
