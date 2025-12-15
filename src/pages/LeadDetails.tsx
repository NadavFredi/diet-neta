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
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';
import { InlineEditableBadge } from '@/components/dashboard/InlineEditableBadge';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { FITNESS_GOAL_OPTIONS, ACTIVITY_LEVEL_OPTIONS, PREFERRED_TIME_OPTIONS, SOURCE_OPTIONS } from '@/utils/dashboard';
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
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginTop: '88px', height: 'calc(100vh - 88px)' }}>
        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar />
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden" style={{ marginRight: '256px', height: 'calc(100vh - 88px)' }}>
            <div className="p-4 h-full flex flex-col overflow-hidden">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200/50 flex-1 flex flex-col overflow-hidden">
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
                    <p className="text-sm text-gray-700 leading-relaxed">{lead.notes}</p>
                  </Card>
                )}

                {/* Unified Super-View Dashboard */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* ROW 1: Sales Header - Lead Info, Status, Actions (Full width) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
                  {/* Card A: Personal Info */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      מידע אישי
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">גיל</span>
                        <span className="text-base font-semibold text-gray-900">{lead.age} שנים</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">תאריך לידה</span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.birthDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">טלפון</span>
                        <span className="text-base font-semibold text-gray-900 font-mono">
                          {lead.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">אימייל</span>
                        <span className="text-base font-semibold text-gray-900">{lead.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">תאריך יצירה</span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.createdDate)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Card B: Subscription Details */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" />
                      פרטי מנוי
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך הצטרפות
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.subscription.joinDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 bg-blue-50 rounded-lg px-3">
                        <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          שבוע נוכחי
                        </span>
                        <span className="text-base font-bold text-blue-900">
                          {lead.subscription.currentWeekInProgram}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">חבילה ראשונית</span>
                        <span className="text-base font-semibold text-gray-900">
                          {lead.subscription.initialPackageMonths} חודשים
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מחיר ראשוני</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₪{lead.subscription.initialPrice.toLocaleString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מחיר חידוש חודשי</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₪{lead.subscription.monthlyRenewalPrice.toLocaleString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">זמן בתקציב נוכחי</span>
                        <span className="text-base font-semibold text-gray-900">
                          {lead.subscription.timeInCurrentBudget}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Card C: Fitness Info */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      מידע כושר
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מטרת כושר</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                          {lead.fitnessGoal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">רמת פעילות</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-100">
                          {lead.activityLevel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">זמן מועדף</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                          {lead.preferredTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">מקור</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                          {lead.source}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                  {/* ROW 2: Service Dashboard - High-Density Grid (3 columns) */}
                  {lead.customerId ? (
                    <>
                      <div className="grid grid-cols-12 gap-4 mb-4 flex-shrink-0">
                        {/* Left Col (span-4): Nutrition Summary */}
                        <div className="col-span-12 md:col-span-4">
                          <NutritionSummaryCard 
                            customerId={lead.customerId}
                            onViewDetails={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                            onAddPlan={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                          />
                        </div>
                        
                        {/* Middle Col (span-4): Workout Summary */}
                        <div className="col-span-12 md:col-span-4">
                          <WorkoutSummaryCard 
                            customerId={lead.customerId}
                            onViewDetails={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                            onAddPlan={() => navigate(`/dashboard/customers/${lead.customerId}`)}
                          />
                        </div>
                        
                        {/* Right Col (span-4): Daily Protocol */}
                        <div className="col-span-12 md:col-span-4">
                          <DailyProtocolGrid customerId={lead.customerId} />
                        </div>
                      </div>

                      {/* ROW 3: History Tabs - Elastic Section */}
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <CustomerHistoryTabs customerId={lead.customerId} />
                      </div>
                    </>
                  ) : (
                    <Card className="p-4 bg-blue-50 border-blue-200 mb-4 flex-shrink-0">
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
                  )}
                  </div>
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

