/**
 * CollectionDetailView Component - Matches meeting page design
 * 
 * Uses same ClientHero header and customer notes system
 * Layout:
 * - ClientHero header (same as customer page)
 * - Tabs below header: הערות, היסטוריה, צפה כמתאמן, תשלומים, WhatsApp
 * - Three vertical panels: Client Details, Collection Details, Notes (using CustomerNotesSidebar)
 */

import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ClientHero } from '@/components/dashboard/ClientHero';
import { ClientHeroBar } from '@/components/dashboard/ClientHeroBar';
import { ResizableNotesPanel } from '@/components/dashboard/ResizableNotesPanel';
import { LeadSidebarContainer } from '@/components/dashboard/LeadSidebarContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollectionDetailView } from './CollectionDetailView';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { 
  Calendar, 
  Receipt,
  User, 
  Wallet,
  DollarSign,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { cn } from '@/lib/utils';

const CollectionDetailView = () => {
  const navigate = useNavigate();
  const sidebarWidth = useSidebarWidth();
  const {
    collection,
    isLoading,
    customer,
    leadData,
    sortedLeads,
    user,
    notesOpen,
    leftSidebar,
    notesCount,
    isPaymentHistoryOpen,
    setIsPaymentHistoryOpen,
    isTraineeSettingsOpen,
    setIsTraineeSettingsOpen,
    isExpanded,
    setIsExpanded,
    handleBack,
    handleLogout,
    handleWhatsApp,
    handleUpdateLead,
    handleUpdateCustomer,
    handleViewCustomerProfile,
    getStatusColor,
    getStatusConfig,
    formattedTotalAmount,
    formattedPaidAmount,
    formattedRemainingAmount,
  } = useCollectionDetailView();

  const handleSaveViewClick = () => {};
  const handleEditViewClick = () => {};

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
                  <p className="text-gray-600">טוען פרטי גבייה...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!collection || !customer) {
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
                  <p className="text-lg font-medium mb-2">גבייה לא נמצאה</p>
                  <Button onClick={handleBack} variant="outline" className="mt-4">
                    חזור לרשימת גבייות
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const statusConfig = getStatusConfig(collection.status);
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
              status={collection.status}
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
                activeLeadId={collection.lead_id || null}
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
                    activeLeadId={collection.lead_id || null}
                    onLeadSelect={(leadId) => {
                      // Navigate to the lead page if different lead is selected
                      if (leadId !== collection.lead_id) {
                        navigate(`/leads/${leadId}`);
                      }
                    }}
                    getStatusColor={getStatusColor}
                    getStatusBorderColor={getStatusColor}
                    formSubmission={null}
                  />
                )}

                {/* Center: Collection Details Panels - 2 columns in one row */}
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
                        {collection.lead_id && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ליד</label>
                            <p className="text-sm text-gray-900">
                              {collection.lead_name || `ליד ${collection.lead_id.slice(0, 8)}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Right Panel: Collection Details */}
                    <Card className="p-4 border border-slate-200 rounded-xl shadow-sm bg-white" style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">פרטי גבייה</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">סכום כולל</label>
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-gray-400" />
                            <p className="text-sm font-bold text-gray-900">
                              {formattedTotalAmount}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">שולם</label>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-semibold text-green-600">
                              {formattedPaidAmount}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">נותר</label>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-600">
                              {formattedRemainingAmount}
                            </p>
                          </div>
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
                          <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך יעד</label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {collection.due_date ? formatDate(collection.due_date) : '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">תאריך יצירה</label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-900">
                              {collection.created_at ? formatDate(collection.created_at) : '-'}
                            </p>
                          </div>
                        </div>
                        {collection.description && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">תיאור</label>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <p className="text-sm text-gray-900">
                                {collection.description}
                              </p>
                            </div>
                          </div>
                        )}
                        {collection.notes && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">הערות</label>
                            <p className="text-sm text-gray-900">
                              {collection.notes}
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

export default CollectionDetailView;
