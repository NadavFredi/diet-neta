/**
 * ClientDashboardView Component
 * 
 * View component for the client/trainee dashboard.
 * Logic is separated to useClientDashboard hook.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Dumbbell,
  Flame,
  Footprints,
  Target,
  Calendar,
  TrendingUp,
  Activity,
  LogOut,
  X,
  UtensilsCrossed,
  FileText,
  Wallet,
  Image as ImageIcon,
  Menu,
} from 'lucide-react';
import { WorkoutPlanCard } from '@/components/dashboard/WorkoutPlanCard';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { DailyCheckInView } from '@/components/client/DailyCheckInView';
import { CheckInCalendarSidebar } from '@/components/client/CheckInCalendarSidebar';
import { MultiDayReportModal } from '@/components/client/MultiDayReportModal';
import { BudgetView } from '@/components/client/BudgetView';
import { VisualProgressCard } from '@/components/client/VisualProgressCard';
import { BloodTestsCard } from '@/components/client/BloodTestsCard.tsx';
import { WeeklyReviewsList } from '@/components/client/WeeklyReviewsList';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
import { setSelectedDate } from '@/store/slices/clientSlice';
import { useNavigate } from 'react-router-dom';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { useClientRealtime } from '@/hooks/useClientRealtime';
import { useToast } from '@/hooks/use-toast';
import { updateClientLead } from '@/store/slices/clientSlice';
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { FooterContent } from '@/components/layout/AppFooter';

export const ClientDashboardView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customer, activeLead, leads, isLoading, error, stats, handleSelectLead } = useClientDashboard();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);
  const { checkIns, selectedDate } = useAppSelector((state) => state.client);
  const { handleLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('workout');
  const [isMultiDayModalOpen, setIsMultiDayModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize selectedDate to today on mount
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      dispatch(setSelectedDate(today));
    }
  }, [selectedDate, dispatch]);

  // Fetch workout and nutrition plans for customer
  const { workoutPlan, isLoading: isLoadingWorkoutPlan } = useWorkoutPlan(customer?.id || null);
  const { nutritionPlan, isLoading: isLoadingNutritionPlan } = useNutritionPlan(customer?.id || null);

  // Set up polling for data sync (every 5 minutes)
  useClientRealtime(customer?.id || null);

  // 7-day average calculations (from last 7 days of check-ins) - Numeric values
  // MUST be called before any early returns to follow Rules of Hooks
  const sevenDayAverages = useMemo(() => {
    const last7Days = checkIns.slice(0, 7);
    
    if (last7Days.length === 0) {
      return { exercises: 0, steps: 0, nutrition: 0 };
    }

    // Exercises: average number of exercises per day
    const totalExercises = last7Days.reduce((sum, ci) => sum + (ci.exercises_count || 0), 0);
    const exercises = Math.round((totalExercises / last7Days.length) * 10) / 10; // Round to 1 decimal

    // Steps: average steps per day
    const totalSteps = last7Days.reduce((sum, ci) => sum + (ci.steps_actual || 0), 0);
    const steps = Math.round(totalSteps / last7Days.length);

    // Nutrition: average calories per day
    const totalCalories = last7Days.reduce((sum, ci) => sum + (ci.calories_daily || 0), 0);
    const nutrition = Math.round(totalCalories / last7Days.length);
    
    return { exercises, steps, nutrition };
  }, [checkIns]);

  // Aggregate daily_protocol from all leads (merge, with later leads taking precedence)
  // MUST be called before any early returns to follow Rules of Hooks
  // This aggregates customer-level data from all leads
  const dailyProtocol = useMemo(() => {
    if (!leads || leads.length === 0) return {};
    
    // Merge all daily_protocol objects, with later (more recent) leads taking precedence
    const merged = {};
    leads.forEach(lead => {
      if (lead.daily_protocol && typeof lead.daily_protocol === 'object') {
        Object.assign(merged, lead.daily_protocol);
      }
    });
    return merged;
  }, [leads]);

  // Handle profile updates - update all leads with the same customer_id
  const handleUpdateWeight = async (newValue: string | number) => {
    if (!leads || leads.length === 0) return;
    const weight = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    if (isNaN(weight)) throw new Error('ערך לא תקין');
    
    // Update all leads for this customer
    await Promise.all(
      leads.map(lead => 
        dispatch(updateClientLead({ leadId: lead.id, updates: { weight } })).unwrap()
      )
    );
  };

  const handleUpdateHeight = async (newValue: string | number) => {
    if (!leads || leads.length === 0) return;
    const height = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    if (isNaN(height)) throw new Error('ערך לא תקין');
    
    // Update all leads for this customer
    await Promise.all(
      leads.map(lead => 
        dispatch(updateClientLead({ leadId: lead.id, updates: { height } })).unwrap()
      )
    );
  };

  // Show error if there's one
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center text-red-600">
            <p className="text-base font-medium mb-2">שגיאה בטעינת הנתונים</p>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-500 mt-4">
              אנא נסה לרענן את הדף או צור קשר עם התמיכה
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading only if we're actually loading and don't have customer yet
  if (isLoading && !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-2"></div>
          <p className="text-sm text-gray-600">טוען את הדשבורד שלך...</p>
        </div>
      </div>
    );
  }

  // Show message if customer not found (but not loading)
  if (!customer && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6">
          <Card className="p-8 max-w-md">
            <div className="text-center text-gray-500">
              <p className="text-base font-medium mb-2">לא נמצא מידע לקוח</p>
              <p className="text-sm text-gray-400">
                אנא צור קשר עם המאמן שלך כדי להגדיר את החשבון שלך
              </p>
            </div>
          </Card>
          {/* Logout Button */}
          <Button 
            variant="outline"
            size="default" 
            onClick={handleLogout} 
            className="border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9]/10 hover:text-[#5B6FB9] hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>
      </div>
    );
  }

  const greeting = `שלום, ${customer.full_name || user?.email || 'לקוח'}!`;

  return (
    <div className="bg-[#F8FAFC] flex flex-col h-full" dir="rtl" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Vertical Navigation Sidebar */}
        <div className={cn(
          "fixed lg:static inset-y-0 right-0 z-50 w-72 sm:w-64 bg-[#5B6FB9] border-l border-white/10 flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-lg",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="border-b border-white/10 flex items-center justify-between px-4 py-5">
            <NetaLogo size="default" variant="default" />
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden h-10 w-10 text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 p-3 pt-4 overflow-y-auto">
            <button
              onClick={() => {
                setActiveTab('workout');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'workout'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Dumbbell className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">אימונים</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('nutrition');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'nutrition'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Flame className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">תזונה</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('checkin');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'checkin'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">דיווח יומי</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('summaries');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'summaries'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Target className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">סיכומים שבועיים</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('budget');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'budget'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Wallet className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">תקציב</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('progress');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'progress'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <ImageIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">התקדמות ויזואלית</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('bloodtests');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-200 mb-1.5 active:scale-[0.98]",
                activeTab === 'bloodtests'
                  ? "bg-white text-gray-800 shadow-md font-semibold"
                  : "text-white hover:bg-white/15 active:bg-white/20"
              )}
            >
              <Activity className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">בדיקות דם</span>
            </button>
          </nav>
          <div className="flex-shrink-0 border-t border-white/10">
            <FooterContent compact hideLink smallImage />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full lg:w-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
          <div className="w-full px-3 sm:px-4 md:px-6 xl:px-8 py-2 pb-4">
            {/* Mobile Header with Menu Button */}
            <div className="flex items-center justify-between mb-3 gap-2 sm:gap-3">
              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden h-11 w-11 text-[#5B6FB9] border-[#5B6FB9]/30 hover:bg-[#5B6FB9]/10 hover:border-[#5B6FB9] rounded-xl shadow-sm"
              >
                <Menu className="h-6 w-6" />
              </Button>
              
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#334155] flex-1 text-right" style={{ fontFamily: 'Assistant, Heebo, sans-serif' }}>
                {greeting}
              </h1>
              {isImpersonating ? (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    dispatch(stopImpersonation());
                    // Navigate back to previous location or default to dashboard
                    const returnPath = previousLocation || '/dashboard';
                    navigate(returnPath);
                    toast({
                      title: 'יציאה ממצב תצוגה',
                      description: 'חזרת למצב מנהל',
                    });
                  }}
                  className="border-[#5B6FB9] bg-[#5B6FB9]/10 text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white hover:border-[#5B6FB9] text-xs sm:text-sm md:text-base font-semibold rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 transition-all duration-200"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  <span className="hidden sm:inline">צא ממצב צפייה</span>
                  <span className="sm:hidden">צא</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleLogout}
                  className="border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9]/10 hover:text-[#5B6FB9] hover:border-[#5B6FB9] text-xs sm:text-sm md:text-base font-semibold rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 transition-all duration-200"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  <span className="hidden sm:inline">התנתק</span>
                  <span className="sm:hidden">יציאה</span>
                </Button>
              )}
            </div>
            {/* 7-Day Averages Header - Responsive Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
              <Card className="p-3 sm:p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-black truncate">
                        תרגילים
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.exercises.toFixed(1)}
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      /יום
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Footprints className="h-4 w-4 sm:h-5 sm:w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-black truncate">
                        צעדים
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.steps.toLocaleString()}
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      צעדים
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-black truncate">
                        תזונה
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.nutrition.toLocaleString()}
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      קק״ל
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'workout' && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                {workoutPlan ? (
                  <WorkoutPlanCard
                    workoutPlan={workoutPlan}
                    isEditable={false}
                  />
                ) : (
                  <Card className="border border-slate-200 shadow-sm rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-500 mb-2">
                        אין תוכנית אימונים פעילה
                      </p>
                      <p className="text-sm text-gray-400">
                        המאמן שלך יוסיף תוכנית אימונים כאן
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                {isLoadingNutritionPlan ? (
                  <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-4"></div>
                      <p className="text-base font-medium text-gray-500">טוען תוכנית תזונה...</p>
                    </CardContent>
                  </Card>
                ) : nutritionPlan ? (
                  <NutritionPlanCard
                    nutritionPlan={nutritionPlan}
                    isEditable={false}
                  />
                ) : (
                  <Card className="border border-slate-200 shadow-sm rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <Flame className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-500 mb-2">
                        אין תוכנית תזונה פעילה
                      </p>
                      <p className="text-sm text-gray-400">
                        המאמן שלך יוסיף תוכנית תזונה כאן
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'checkin' && (
              <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0" style={{ maxHeight: '100%' }} dir="rtl">
                {/* Calendar Sidebar - Right Side (20% width on desktop) - First in RTL = Right side */}
                <div className="flex-shrink-0 flex flex-col lg:w-[20%] hidden lg:flex min-h-0">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-none overflow-hidden flex-1 flex flex-col">
                    <CheckInCalendarSidebar checkIns={checkIns} />
                  </div>
                </div>

                {/* Main Content - Daily Report (80% width on desktop) - Second in RTL = Left side */}
                <div className="flex-1 flex flex-col min-w-0 lg:w-[80%]">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-none overflow-hidden flex-1 flex flex-col">
                    <DailyCheckInView 
                      customerId={customer.id} 
                      onMultiDayClick={() => setIsMultiDayModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'summaries' && customer?.id && (
              <div className="space-y-4 sm:space-y-6">
                <WeeklyReviewsList
                  customerId={customer.id}
                  leadId={null}
                />
              </div>
            )}

            {activeTab === 'budget' && (
              <div className="space-y-4 sm:space-y-6">
                <BudgetView
                  leadId={null}
                  customerId={customer?.id}
                />
              </div>
            )}

            {/* Visual Progress Tab */}
            {activeTab === 'progress' && customer?.id && (
              <div className="space-y-4 sm:space-y-6">
                <VisualProgressCard customerId={customer.id} />
              </div>
            )}

            {/* Blood Tests Tab */}
            {activeTab === 'bloodtests' && customer?.id && (
              <div className="space-y-4 sm:space-y-6">
                <BloodTestsCard customerId={customer.id} leads={leads} />
              </div>
            )}

            {/* Disclaimer - Positioned within content */}
            <div className="w-full py-3 sm:py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-blue-900">
                <p className="font-medium mb-1">שימו לב:</p>
                <p>
                  ההמלצות במסמך זה אינן מהוות ייעוץ רפואי. המלווה אינה רופאה או תזונאית קלינית, וכל שינוי תזונתי, תוספים או פעילות גופנית יש לבצע באחריות אישית ובהתייעצות עם רופא מוסמך.
                </p>
              </div>
            </div>

            {/* Multi-Day Report Modal */}
            {customer && activeTab === 'checkin' && (
              <MultiDayReportModal
                open={isMultiDayModalOpen}
                onOpenChange={setIsMultiDayModalOpen}
                customerId={customer.id}
                leadId={null}
                existingCheckIns={checkIns}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
