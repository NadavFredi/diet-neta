import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useLeadDetailsPage } from './LeadDetails';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkoutSummaryCard } from '@/components/dashboard/WorkoutSummaryCard';
import { NutritionSummaryCard } from '@/components/dashboard/NutritionSummaryCard';
import { DailyProtocolGrid } from '@/components/dashboard/DailyProtocolGrid';
import { CustomerHistoryTabs } from '@/components/dashboard/CustomerHistoryTabs';
import { CustomerSidebar } from '@/components/dashboard/CustomerSidebar';
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';
import { InlineEditableBadge } from '@/components/dashboard/InlineEditableBadge';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { FITNESS_GOAL_OPTIONS, ACTIVITY_LEVEL_OPTIONS, PREFERRED_TIME_OPTIONS, SOURCE_OPTIONS } from '@/utils/dashboard';
import { useCustomer } from '@/hooks/useCustomers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Mail,
  Target,
  User,
  FileText,
  Edit,
  Calendar,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { useAppSelector } from '@/store/hooks';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Template imports removed - coaching moved to Customer Profile
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const LeadDetails = () => {
  const navigate = useNavigate();
  const {
    lead,
    isLoading: isLoadingLead,
    bmi,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
    isOpen,
    selectedCategory,
    selectedSubStatus,
    handleOpen,
    handleClose,
    handleCategoryChange,
    handleSubStatusChange,
    handleSave,
    hasSubStatuses,
    selectedCategoryData,
  } = useLeadDetailsPage();
  
  const { user } = useAppSelector((state) => state.auth);
  const updateLead = useUpdateLead();
  const { data: customer } = useCustomer(lead?.customerId || '');

  if (isLoadingLead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטי ליד...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ליד לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    // Check if status matches any category or sub-status
    if (status === 'פעיל') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'לא פעיל') {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
    if (status === 'מתקדמת לתהליך') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
        status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    // Legacy statuses
    switch (status) {
      case 'חדש':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'בטיפול':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הושלם':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'תת משקל';
    if (bmi < 25) return 'נורמלי';
    if (bmi < 30) return 'עודף משקל';
    return 'השמנה';
  };

  const getBMIColor = (bmi: number): string => {
    if (bmi < 18.5) return 'text-blue-600';
    if (bmi < 25) return 'text-green-600';
    if (bmi < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <DashboardHeader
        userEmail={user?.email}
        onLogout={() => {}}
      />
      <div className="flex-1 flex flex-col" style={{ marginTop: '88px' }}>
        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar />
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px', minHeight: 'calc(100vh - 88px)' }}>
            <div className="p-4">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200/50">
                {/* Header */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleBack}
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <ArrowRight className="ml-2 h-5 w-5" />
                        חזור לדשבורד
                      </Button>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                          {lead.customerId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/customers/${lead.customerId}`);
                              }}
                              className="hover:underline text-blue-600 hover:text-blue-700"
                            >
                              {lead.name}
                            </button>
                          ) : (
                            lead.name
                          )}
                        </h1>
                        <div className="flex items-center gap-3">
                          <Popover open={isOpen} onOpenChange={(open) => open ? handleOpen() : handleClose()}>
                            <PopoverTrigger asChild>
                              <button
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(lead.status)} hover:opacity-80 transition-opacity cursor-pointer`}
                              >
                                {lead.status}
                                <Edit className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start" dir="rtl">
                              <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 mb-3">עדכן סטטוס</h3>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    סטטוס ראשי
                                  </label>
                                  <Select
                                    value={selectedCategory}
                                    onValueChange={handleCategoryChange}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר סטטוס ראשי" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {STATUS_CATEGORIES.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {hasSubStatuses && selectedCategoryData?.subStatuses && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      סטטוס משני
                                    </label>
                                    <Select
                                      value={selectedSubStatus}
                                      onValueChange={handleSubStatusChange}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="בחר סטטוס משני" />
                                      </SelectTrigger>
                                      <SelectContent dir="rtl">
                                        {selectedCategoryData.subStatuses.map((subStatus) => (
                                          <SelectItem key={subStatus.id} value={subStatus.id}>
                                            {subStatus.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    שמור
                                  </Button>
                                  <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    ביטול
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <span className="text-sm text-gray-500">
                            ID: <span className="font-mono">{lead.id}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleCall}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <Phone className="ml-2 h-5 w-5" />
                        התקשר
                      </Button>
                      <Button
                        onClick={handleWhatsApp}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <MessageCircle className="ml-2 h-5 w-5" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={handleEmail}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                        size="lg"
                      >
                        <Mail className="ml-2 h-5 w-5" />
                        אימייל
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes Section - Top Priority */}
                {lead.notes && (
                  <Card className="p-4 bg-white border-gray-200 mb-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      הערות
                    </h2>
                    <InlineEditableField
                      label=""
                      value={lead.notes}
                      onSave={async (newValue) => {
                        await updateLead.mutateAsync({
                          leadId: lead.id,
                          updates: { notes: newValue },
                        });
                      }}
                      type="text"
                      className="border-0 p-0"
                      valueClassName="text-sm text-gray-700 leading-relaxed"
                    />
                  </Card>
                )}

                {/* Unified Super-View Dashboard */}
                <div className="flex flex-col gap-6">
                  {/* SECTION 1: LEAD DATA (Sales/CRM) */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-0.5 flex-1 bg-gradient-to-l from-blue-300 via-blue-400 to-blue-300"></div>
                      <h2 className="text-lg font-bold text-blue-900 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200 whitespace-nowrap">
                        נתוני ליד (מכירות/CRM)
                      </h2>
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300"></div>
                    </div>

                    {/* ROW 1: All Lead Data in 3 columns for maximum space efficiency */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Card A: Personal Info */}
                      <Card className="p-3 bg-white border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          מידע אישי
                        </h2>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                          <div>
                            <InlineEditableField
                              label="גיל"
                              value={lead.age}
                              onSave={async (newValue) => {
                                // Calculate birth date from age
                                const today = new Date();
                                const birthYear = today.getFullYear() - Number(newValue);
                                const birthDate = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { birth_date: birthDate },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `${val} שנים`}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="תאריך לידה"
                              value={lead.birthDate}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { birth_date: newValue },
                                });
                              }}
                              type="date"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="תאריך יצירה"
                              value={lead.createdDate}
                              onSave={async () => {}}
                              type="text"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-b border-gray-100"
                              disabled={true}
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="טלפון"
                              value={lead.phone}
                              onSave={async (newValue) => {
                                // Update customer phone, not lead
                                const { error } = await supabase
                                  .from('customers')
                                  .update({ phone: newValue })
                                  .eq('id', lead.customerId || '');
                                if (error) throw error;
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: {},
                                });
                              }}
                              type="tel"
                              valueClassName="font-mono text-xs"
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div className="col-span-2">
                            <InlineEditableField
                              label="אימייל"
                              value={lead.email}
                              onSave={async (newValue) => {
                                // Update customer email, not lead
                                const { error } = await supabase
                                  .from('customers')
                                  .update({ email: newValue })
                                  .eq('id', lead.customerId || '');
                                if (error) throw error;
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: {},
                                });
                              }}
                              type="email"
                              valueClassName="text-xs"
                              className=""
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Card B: Subscription Details */}
                      <Card className="p-3 bg-white border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          פרטי מנוי
                        </h2>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                          <div>
                            <InlineEditableField
                              label="תאריך הצטרפות"
                              value={lead.subscription.joinDate}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { join_date: newValue },
                                });
                              }}
                              type="date"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-gray-100 bg-blue-50 rounded-md px-2">
                            <span className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5" />
                              שבוע נוכחי
                            </span>
                            <span className="text-sm font-bold text-blue-900">
                              {lead.subscription.currentWeekInProgram}
                            </span>
                          </div>
                          <div>
                            <InlineEditableField
                              label="חבילה ראשונית"
                              value={lead.subscription.initialPackageMonths}
                              onSave={async (newValue) => {
                                const subscriptionData = {
                                  ...lead.subscription,
                                  months: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { subscription_data: subscriptionData },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `${val} חודשים`}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="זמן בתקציב נוכחי"
                              value={lead.subscription.timeInCurrentBudget}
                              onSave={async (newValue) => {
                                const subscriptionData = {
                                  ...lead.subscription,
                                  timeInCurrentBudget: String(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { subscription_data: subscriptionData },
                                });
                              }}
                              type="text"
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="מחיר ראשוני"
                              value={lead.subscription.initialPrice}
                              onSave={async (newValue) => {
                                const subscriptionData = {
                                  ...lead.subscription,
                                  initialPrice: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { subscription_data: subscriptionData },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `₪${Number(val).toLocaleString('he-IL')}`}
                              className=""
                            />
                          </div>
                          <div>
                            <InlineEditableField
                              label="מחיר חידוש חודשי"
                              value={lead.subscription.monthlyRenewalPrice}
                              onSave={async (newValue) => {
                                const subscriptionData = {
                                  ...lead.subscription,
                                  renewalPrice: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { subscription_data: subscriptionData },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `₪${Number(val).toLocaleString('he-IL')}`}
                              className=""
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Card C: Fitness Info - Now in same row as other cards */}
                      <Card className="p-3 bg-white border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-600" />
                          מידע כושר
                        </h2>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                          <div>
                            <InlineEditableBadge
                              label="מטרת כושר"
                              value={lead.fitnessGoal}
                              options={FITNESS_GOAL_OPTIONS.map(goal => ({
                                value: goal,
                                label: goal,
                                className: 'bg-green-50 text-green-700 border-green-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { fitness_goal: newValue },
                                });
                              }}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableBadge
                              label="רמת פעילות"
                              value={lead.activityLevel}
                              options={ACTIVITY_LEVEL_OPTIONS.map(level => ({
                                value: level,
                                label: level,
                                className: 'bg-orange-50 text-orange-700 border-orange-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { activity_level: newValue },
                                });
                              }}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableBadge
                              label="זמן מועדף"
                              value={lead.preferredTime}
                              options={PREFERRED_TIME_OPTIONS.map(time => ({
                                value: time,
                                label: time,
                                className: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { preferred_time: newValue },
                                });
                              }}
                              className="border-b border-gray-100"
                            />
                          </div>
                          <div>
                            <InlineEditableBadge
                              label="מקור"
                              value={lead.source}
                              options={SOURCE_OPTIONS.map(source => ({
                                value: source,
                                label: source,
                                className: 'bg-purple-50 text-purple-700 border-purple-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: lead.id,
                                  updates: { source: newValue },
                                });
                              }}
                              className=""
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* SECTION 2: CUSTOMER DATA (Coaching) */}
                  {lead.customerId ? (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-0.5 flex-1 bg-gradient-to-l from-orange-300 via-orange-400 to-orange-300"></div>
                        <h2 className="text-lg font-bold text-orange-900 px-3 py-1.5 bg-orange-50 rounded-md border border-orange-200 whitespace-nowrap">
                          נתוני לקוח (אימון ותזונה)
                        </h2>
                        <div className="h-0.5 flex-1 bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300"></div>
                      </div>

                      {/* Customer Section - Sidebar + Main Content Grid */}
                      <div className="grid grid-cols-12 gap-3 mb-3">
                        {/* Left Sidebar: Customer Identity Card (3 columns) */}
                        <div className="col-span-12 lg:col-span-3">
                          <CustomerSidebar
                            customerId={lead.customerId}
                            onWhatsApp={handleWhatsApp}
                            onCall={handleCall}
                            onEmail={handleEmail}
                            onAddNote={() => {}}
                          />
                        </div>

                        {/* Right Main Content: Plans & Protocol (9 columns) */}
                        <div className="col-span-12 lg:col-span-9">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            {/* Nutrition Summary */}
                            <NutritionSummaryCard 
                              customerId={lead.customerId}
                              onViewDetails={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                              onAddPlan={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                            />
                            
                            {/* Workout Summary */}
                            <WorkoutSummaryCard 
                              customerId={lead.customerId}
                              onViewDetails={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                              onAddPlan={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                            />
                            
                            {/* Daily Protocol */}
                            <DailyProtocolGrid customerId={lead.customerId} />
                          </div>
                        </div>
                      </div>

                      {/* ROW 3: History Tabs - Full Width */}
                      <div className="flex flex-col">
                        <CustomerHistoryTabs customerId={lead.customerId} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-0.5 flex-1 bg-gradient-to-l from-gray-300 via-gray-400 to-gray-300"></div>
                        <h2 className="text-lg font-bold text-gray-700 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200 whitespace-nowrap">
                          נתוני לקוח
                        </h2>
                        <div className="h-0.5 flex-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                      </div>
                      <Card className="p-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
                              <User className="h-5 w-5 text-blue-600" />
                              אין לקוח משויך
                            </h2>
                            <p className="text-sm text-blue-700">
                              כדי להציג נתוני אימון ותזונה, יש ליצור לקוח או לקשר את הליד לקוח קיים
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;

