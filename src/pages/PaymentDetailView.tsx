/**
 * PaymentDetailView Component - Matches meeting page design
 * 
 * Uses same ClientHero header and customer notes system
 * Layout:
 * - ClientHero header (same as customer page)
 * - Tabs below header: הערות, היסטוריה, צפה כמתאמן, תשלומים, WhatsApp
 * - Three vertical panels: Client Details, Payment Details, Notes (using CustomerNotesSidebar)
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
import { usePayment } from '@/hooks/usePayment';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { 
  Calendar, 
  CreditCard,
  User, 
  Package,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/hooks/useCustomers';
import { useUpdateCustomer } from '@/hooks/useUpdateCustomer';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { selectCustomerNotes, fetchCustomerNotes } from '@/store/slices/leadViewSlice';

// Payment status configuration
const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  'שולם': {
    label: 'שולם',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  'ממתין': {
    label: 'ממתין',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  'הוחזר': {
    label: 'הוחזר',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'נכשל': {
    label: 'נכשל',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

const PaymentDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const sidebarWidth = useSidebarWidth();
  const { data: payment, isLoading } = usePayment(id || null);

  // Get customer from payment
  const customerId = payment?.customer_id;
  const { data: customer } = useCustomer(customerId || null);

  // Get lead data for ClientHero
  const { data: leadData } = useQuery({
    queryKey: ['lead', payment?.lead_id],
    queryFn: async () => {
      if (!payment?.lead_id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', payment.lead_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!payment?.lead_id,
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
      // Default to payments list page
      navigate('/dashboard/payments');
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
    const phone = customer?.phone || payment?.customer?.phone;
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
      navigate(`/leads/${payment?.lead_id || customer.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    const statusStr = String(status);
    if (statusStr.includes('בוטל') || statusStr.includes('מבוטל')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusStr.includes('הושלם') || statusStr.includes('שולם')) return 'bg-green-50 text-green-700 border-green-200';
    if (statusStr.includes('מתוכנן') || statusStr.includes('ממתין')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Get sidebar states from Redux (same as customer page) - MUST be before early returns
  const notesOpen = useAppSelector((state) => state.leadView.notesOpen);
  const leftSidebar = useAppSelector((state) => state.leadView.leftSidebar);

  // Modal state management (same as lead page)
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isTraineeSettingsOpen, setIsTraineeSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get notes count for the customer
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
                  <p className="text-gray-600">טוען פרטי תשלום...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!payment || !customer) {
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
                  <p className="text-lg font-medium mb-2">תשלום לא נמצא</p>
                  <Button onClick={handleBack} variant="outline" className="mt-4">
                    חזור לרשימת תשלומים
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status] || PAYMENT_STATUS_CONFIG['ממתין'];
  const formattedAmount = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: payment.currency || 'ILS',
  }).format(payment.amount);

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
              status={payment.status}
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
                activeLeadId={payment.lead_id || null}
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
                    activeLeadId={payment.lead_id || null}
                    onLeadSelect={(leadId) => {
                      // Navigate to the lead page if different lead is selected
                      if (leadId !== payment.lead_id) {
                        navigate(`/leads/${leadId}`);
                      }
                    }}
                    getStatusColor={getStatusColor}
                    getStatusBorderColor={getStatusColor}
                    formSubmission={null}
                  />
                )}

                {/* Center: Payment Details Panels - 2 columns in one row */}
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
                        {payment.lead_id && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ליד</label>
                            <p className="text-sm text-gray-900">
                              {payment.lead?.customer?.full_name || `ליד ${payment.lead_id.slice(0, 8)}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Right Panel: Payment Details */}
                    <Card className="p-4 border border-slate-200 rounded-xl shadow-sm bg-white" style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">פרטי תשלום</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">מוצר</label>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {payment.product_name || '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">סכום</label>
                          <p className="text-sm font-bold text-gray-900">
                            {formattedAmount}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">סטטוס</label>
                          <Badge
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 border',
                              statusConfig.className
                            )}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך יצירה</label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {payment.created_at ? formatDate(payment.created_at) : '-'}
                            </p>
                          </div>
                        </div>
                        {payment.transaction_id && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">מספר עסקה</label>
                            <p className="text-sm text-gray-900 font-mono">
                              {payment.transaction_id}
                            </p>
                          </div>
                        )}
                        {payment.stripe_payment_id && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">מזהה Stripe</label>
                            <p className="text-sm text-gray-900 font-mono text-xs">
                              {payment.stripe_payment_id}
                            </p>
                          </div>
                        )}
                        {payment.receipt_url && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">קבלה</label>
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Receipt className="h-4 w-4" />
                              <span>צפה בקבלה</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {payment.notes && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">הערות</label>
                            <p className="text-sm text-gray-900">
                              {payment.notes}
                            </p>
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
    </>
  );
};

export default PaymentDetailView;
