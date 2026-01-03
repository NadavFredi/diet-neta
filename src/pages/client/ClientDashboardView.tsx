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
} from 'lucide-react';
import { WorkoutPlanCard } from '@/components/dashboard/WorkoutPlanCard';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { DailyCheckInView } from '@/components/client/DailyCheckInView';
import { CheckInCalendarSidebar } from '@/components/client/CheckInCalendarSidebar';
import { MultiDayReportModal } from '@/components/client/MultiDayReportModal';
import { WeeklySummariesView } from '@/components/client/WeeklySummariesView';
import { BudgetView } from '@/components/client/BudgetView';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
import { setSelectedDate } from '@/store/slices/clientSlice';
import { useNavigate } from 'react-router-dom';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { AddWorkoutPlanDialog } from '@/components/dashboard/dialogs/AddWorkoutPlanDialog';
import { AddNutritionPlanDialog } from '@/components/dashboard/dialogs/AddNutritionPlanDialog';
import { useClientRealtime } from '@/hooks/useClientRealtime';
import { useToast } from '@/hooks/use-toast';
import { updateClientLead } from '@/store/slices/clientSlice';
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';
import { NetaLogo } from '@/components/ui/NetaLogo';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [isWorkoutPlanDialogOpen, setIsWorkoutPlanDialogOpen] = useState(false);
  const [isNutritionPlanDialogOpen, setIsNutritionPlanDialogOpen] = useState(false);

  // Initialize selectedDate to today on mount
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      dispatch(setSelectedDate(today));
    }
  }, [selectedDate, dispatch]);

  // Fetch workout and nutrition plans for customer
  const { workoutPlan, createWorkoutPlan, fetchWorkoutPlan, isLoading: isLoadingWorkoutPlan } = useWorkoutPlan(customer?.id || null);
  const { nutritionPlan, createNutritionPlan, fetchNutritionPlan, isLoading: isLoadingNutritionPlan } = useNutritionPlan(customer?.id || null);

  // Debug: Log nutrition plan data
  useEffect(() => {
    if (customer?.id) {
      console.log('[ClientDashboard] Nutrition Plan Data:', {
        customerId: customer.id,
        nutritionPlan,
        isLoadingNutritionPlan,
      });
    }
  }, [customer?.id, nutritionPlan, isLoadingNutritionPlan]);

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

  // Handle profile updates
  const handleUpdateWeight = async (newValue: string | number) => {
    if (!activeLead) return;
    const weight = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    if (isNaN(weight)) throw new Error('ערך לא תקין');
    
    await dispatch(
      updateClientLead({ leadId: activeLead.id, updates: { weight } })
    ).unwrap();
  };

  const handleUpdateHeight = async (newValue: string | number) => {
    if (!activeLead) return;
    const height = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    if (isNaN(height)) throw new Error('ערך לא תקין');
    
    await dispatch(
      updateClientLead({ leadId: activeLead.id, updates: { height } })
    ).unwrap();
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

  // Get goals from daily_protocol
  const dailyProtocol = activeLead?.daily_protocol || {};

  return (
    <div className="bg-[#F8FAFC] flex flex-col h-full" dir="rtl" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <div className="bg-white border-b border-[#E2E8F0] flex-shrink-0 z-20 shadow-sm">
        <div className="w-full px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NetaLogo 
                size="default" 
                variant="default"
                className="rounded-none border-0 p-0"
              />
              <h1 className="text-2xl font-bold text-[#334155]" style={{ fontFamily: 'Assistant, Heebo, sans-serif' }}>
                {greeting}
              </h1>
            </div>
            {/* Show Exit Impersonation button if admin is impersonating, otherwise show Logout */}
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
                className="border-[#5B6FB9] bg-[#5B6FB9]/10 text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200"
              >
                <X className="h-4 w-4 ml-2" />
                צא ממצב צפייה
              </Button>
            ) : (
              <Button 
                variant="outline"
                size="default" 
                onClick={handleLogout} 
                className="border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9]/10 hover:text-[#5B6FB9] hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 ml-2" />
                התנתק
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Vertical Navigation Sidebar */}
        <div className="w-64 bg-white border-l border-[#E2E8F0] flex-shrink-0 flex flex-col">
          <nav className="flex-1 p-3 pt-4">
            <button
              onClick={() => setActiveTab('workout')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 mb-1",
                activeTab === 'workout'
                  ? "bg-[#5B6FB9]/10 text-[#5B6FB9] border-r-4 border-[#5B6FB9] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#5B6FB9]"
              )}
            >
              <Dumbbell className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">אימונים</span>
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 mb-1",
                activeTab === 'nutrition'
                  ? "bg-[#5B6FB9]/10 text-[#5B6FB9] border-r-4 border-[#5B6FB9] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#5B6FB9]"
              )}
            >
              <Flame className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">תזונה</span>
            </button>
            <button
              onClick={() => setActiveTab('checkin')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 mb-1",
                activeTab === 'checkin'
                  ? "bg-[#5B6FB9]/10 text-[#5B6FB9] border-r-4 border-[#5B6FB9] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#5B6FB9]"
              )}
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">דיווח יומי</span>
            </button>
            <button
              onClick={() => setActiveTab('summaries')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 mb-1",
                activeTab === 'summaries'
                  ? "bg-[#5B6FB9]/10 text-[#5B6FB9] border-r-4 border-[#5B6FB9] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#5B6FB9]"
              )}
            >
              <Target className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">סיכומים שבועיים</span>
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 mb-1",
                activeTab === 'budget'
                  ? "bg-[#5B6FB9]/10 text-[#5B6FB9] border-r-4 border-[#5B6FB9] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#5B6FB9]"
              )}
            >
              <Wallet className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">תקציב</span>
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
          <div className="w-full px-6 xl:px-8 py-2 pb-4">
            {/* 7-Day Averages Header - Larger Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Activity className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black truncate">
                        תרגילים
                      </div>
                      <div className="text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.exercises.toFixed(1)}
                    </div>
                    <span className="text-xs text-slate-500">
                      /יום
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Footprints className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black truncate">
                        צעדים
                      </div>
                      <div className="text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.steps.toLocaleString()}
                    </div>
                    <span className="text-xs text-slate-500">
                      צעדים
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border border-slate-200 bg-white shadow-sm rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <UtensilsCrossed className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black truncate">
                        תזונה
                      </div>
                      <div className="text-xs text-slate-500">
                        ממוצע 7 ימים
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <div className="text-2xl font-bold text-black leading-none">
                      {sevenDayAverages.nutrition.toLocaleString()}
                    </div>
                    <span className="text-xs text-slate-500">
                      קק״ל
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'workout' && (
              <div className="space-y-6 pb-4">
                {workoutPlan ? (
                  <WorkoutPlanCard
                    workoutPlan={workoutPlan}
                    isEditable={false}
                  />
                ) : (
                  <Card className="border border-slate-200 shadow-sm rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-500 mb-6">
                        אין תוכנית אימונים פעילה
                      </p>
                      <Button
                        onClick={() => setIsWorkoutPlanDialogOpen(true)}
                        className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                      >
                        <Dumbbell className="h-4 w-4 ml-2" />
                        צור תוכנית אימונים
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-6 pb-4">
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
                  <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Flame className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-500 mb-2">
                        אין תוכנית תזונה פעילה
                      </p>
                      <p className="text-sm text-gray-400 mb-6">
                        צור תוכנית תזונה חדשה עבור הלקוח
                      </p>
                      <Button
                        onClick={() => {
                          console.log('[ClientDashboard] Opening nutrition plan dialog for customer:', customer?.id);
                          setIsNutritionPlanDialogOpen(true);
                        }}
                        className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white shadow-sm"
                      >
                        <Flame className="h-4 w-4 ml-2" />
                        צור תוכנית תזונה
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'checkin' && (
              <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0" style={{ maxHeight: '100%' }} dir="rtl">
                {/* Calendar Sidebar - Right Side (20% width on desktop) - First in RTL = Right side */}
                <div className="flex-shrink-0 flex flex-col lg:w-[20%] hidden lg:flex">
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

            {activeTab === 'summaries' && (
              <div className="space-y-6">
                <WeeklySummariesView
                  leadId={activeLead?.id}
                  customerId={customer?.id}
                />
              </div>
            )}

            {activeTab === 'budget' && (
              <div className="space-y-6">
                <BudgetView
                  leadId={activeLead?.id}
                  customerId={customer?.id}
                />
              </div>
            )}

            {/* Multi-Day Report Modal */}
            {customer && activeTab === 'checkin' && (
              <MultiDayReportModal
                open={isMultiDayModalOpen}
                onOpenChange={setIsMultiDayModalOpen}
                customerId={customer.id}
                leadId={activeLead?.id || null}
                existingCheckIns={checkIns}
              />
            )}
          </div>
        </div>
      </div>

      {/* Workout Plan Creation Dialog */}
      {customer && (
        <AddWorkoutPlanDialog
          isOpen={isWorkoutPlanDialogOpen}
          onOpenChange={setIsWorkoutPlanDialogOpen}
          onSave={async (data) => {
            try {
              const leadId = activeLead?.id || undefined;
              const planData = {
                ...data,
                lead_id: leadId,
              };
              await createWorkoutPlan(planData);
              await fetchWorkoutPlan(); // Refetch to update UI
              toast({
                title: 'הצלחה',
                description: 'תוכנית האימונים נוצרה בהצלחה',
              });
              setIsWorkoutPlanDialogOpen(false);
            } catch (error: any) {
              console.error('Failed to create workout plan:', error);
              toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל ביצירת תוכנית האימונים',
                variant: 'destructive',
              });
            }
          }}
          customerId={customer.id}
          leadId={activeLead?.id}
        />
      )}

      {/* Nutrition Plan Creation Dialog */}
      {customer && (
        <AddNutritionPlanDialog
          isOpen={isNutritionPlanDialogOpen}
          onOpenChange={setIsNutritionPlanDialogOpen}
          onSave={async (data) => {
            try {
              const leadId = activeLead?.id || undefined;
              const planData = {
                lead_id: leadId,
                start_date: new Date().toISOString(),
                description: '',
                targets: data || {
                  calories: 2000,
                  protein: 150,
                  carbs: 200,
                  fat: 65,
                  fiber: 30,
                },
              };
              await createNutritionPlan(planData);
              await fetchNutritionPlan(); // Refetch to update UI
              toast({
                title: 'הצלחה',
                description: 'תוכנית התזונה נוצרה בהצלחה',
              });
              setIsNutritionPlanDialogOpen(false);
            } catch (error: any) {
              console.error('Failed to create nutrition plan:', error);
              toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל ביצירת תוכנית התזונה',
                variant: 'destructive',
              });
            }
          }}
          customerId={customer.id}
          leadId={activeLead?.id}
        />
      )}
    </div>
  );
};

