/**
 * ClientDashboardView Component
 * 
 * View component for the client/trainee dashboard.
 * Logic is separated to useClientDashboard hook.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { WorkoutPlanCard } from '@/components/dashboard/WorkoutPlanCard';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { DailyCheckInView } from '@/components/client/DailyCheckInView';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { stopImpersonation } from '@/store/slices/impersonationSlice';
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

export const ClientDashboardView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customer, activeLead, leads, isLoading, error, stats, handleSelectLead } = useClientDashboard();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);
  const { checkIns } = useAppSelector((state) => state.client);
  const { handleLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('workout');

  // Fetch workout and nutrition plans for customer
  const { workoutPlan } = useWorkoutPlan(customer?.id || null);
  const { nutritionPlan } = useNutritionPlan(customer?.id || null);

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
        <Card className="p-8 max-w-md">
          <div className="text-center text-gray-500">
            <p className="text-base font-medium mb-2">לא נמצא מידע לקוח</p>
            <p className="text-sm text-gray-400">
              אנא צור קשר עם המאמן שלך כדי להגדיר את החשבון שלך
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const greeting = `שלום, ${customer.full_name || user?.email || 'לקוח'}!`;

  // Get goals from daily_protocol
  const dailyProtocol = activeLead?.daily_protocol || {};

  return (
    <div className="bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NetaLogo 
                size="default" 
                variant="default"
                className="rounded-none border-0 p-0"
              />
              <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
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
                className="border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 hover:border-orange-600 text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-0">
        {/* 7-Day Averages Header - Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="p-4 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#5B6FB9]/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-6 w-6 text-[#5B6FB9]" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-black font-bold">תרגילים</div>
                  <div className="text-xs text-black">ממוצע - 7 ימים אחרונים</div>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div 
                  className="text-3xl font-bold transition-all duration-300 ease-out leading-none"
                  style={{ 
                    color: sevenDayAverages.exercises > 0 ? '#5B6FB9' : '#000000',
                  }}
                >
                  {sevenDayAverages.exercises.toFixed(1)}
                </div>
                <span className="text-sm text-black font-medium">/יום</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#5B6FB9]/10 flex items-center justify-center flex-shrink-0">
                  <Footprints className="h-6 w-6 text-[#5B6FB9]" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-black font-bold">צעדים</div>
                  <div className="text-xs text-black">ממוצע - 7 ימים אחרונים</div>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-bold text-black transition-all duration-300 leading-none">
                  {sevenDayAverages.steps.toLocaleString()}
                </div>
                <span className="text-sm text-black font-medium">צעדים</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#5B6FB9]/10 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="h-6 w-6 text-[#5B6FB9]" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest text-black font-bold">תזונה</div>
                  <div className="text-xs text-black">ממוצע - 7 ימים אחרונים</div>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-3xl font-bold text-black transition-all duration-300 leading-none">
                  {sevenDayAverages.nutrition.toLocaleString()}
                </div>
                <span className="text-sm text-black font-medium">קק״ל</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
            <TabsTrigger value="workout" className="data-[state=active]:bg-[#5B6FB9] data-[state=active]:text-white">
              אימונים
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-[#5B6FB9] data-[state=active]:text-white">
              תזונה
            </TabsTrigger>
            <TabsTrigger value="checkin" className="data-[state=active]:bg-[#5B6FB9] data-[state=active]:text-white">
              דיווח יומי
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workout" className="space-y-6">
            {workoutPlan ? (
              <WorkoutPlanCard
                workoutPlan={workoutPlan}
                isEditable={false}
              />
            ) : (
              <Card className="border-2 border-slate-200">
                <CardContent className="p-12 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-base font-medium text-gray-500">
                    אין תוכנית אימונים פעילה
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-6">
            {nutritionPlan ? (
              <NutritionPlanCard
                nutritionPlan={nutritionPlan}
                isEditable={false}
              />
            ) : (
              <Card className="border-2 border-slate-200">
                <CardContent className="p-12 text-center">
                  <Flame className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-base font-medium text-gray-500">
                    אין תוכנית תזונה פעילה
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checkin" className="space-y-0">
            <DailyCheckInView customerId={customer.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

