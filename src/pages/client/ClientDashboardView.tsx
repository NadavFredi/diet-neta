/**
 * ClientDashboardView Component
 * 
 * View component for the client/trainee dashboard.
 * Logic is separated to useClientDashboard hook.
 */

import React, { useState } from 'react';
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

export const ClientDashboardView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customer, activeLead, leads, isLoading, error, stats, handleSelectLead } = useClientDashboard();
  const { user } = useAppSelector((state) => state.auth);
  const { isImpersonating, previousLocation } = useAppSelector((state) => state.impersonation);
  const { handleLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('workout');

  // Fetch workout and nutrition plans for customer
  const { workoutPlan } = useWorkoutPlan(customer?.id || null);
  const { nutritionPlan } = useNutritionPlan(customer?.id || null);

  // Set up polling for data sync (every 5 minutes)
  useClientRealtime(customer?.id || null);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-4">
        {/* Stats Summary - Compact Single Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card className="border border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 flex-shrink-0">משקל</span>
                    <InlineEditableField
                      label=""
                      value={stats.weight || 0}
                      onSave={handleUpdateWeight}
                      type="number"
                      formatValue={(val) => {
                        const numVal = typeof val === 'number' ? val : Number(val);
                        return numVal && numVal > 0 ? `${numVal} ק"ג` : '—';
                      }}
                      className="flex-1 min-w-0 py-0 [&>div]:py-0 [&>div>span:first-child]:hidden"
                      valueClassName="text-lg font-bold text-slate-900 truncate"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 flex-shrink-0">גובה</span>
                    <InlineEditableField
                      label=""
                      value={stats.height || 0}
                      onSave={handleUpdateHeight}
                      type="number"
                      formatValue={(val) => {
                        const numVal = typeof val === 'number' ? val : Number(val);
                        return !isNaN(numVal) && numVal > 0 ? `${numVal} ס"מ` : '—';
                      }}
                      className="flex-1 min-w-0 py-0 [&>div]:py-0 [&>div>span:first-child]:hidden"
                      valueClassName="text-lg font-bold text-slate-900 truncate"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">BMI</span>
                    <span className="text-lg font-bold text-slate-900 truncate">
                      {stats.bmi ? stats.bmi.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">יעד כושר</span>
                    <span className="text-base font-semibold text-slate-900 truncate">
                      {stats.fitnessGoal || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
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

          <TabsContent value="checkin" className="space-y-6">
            <DailyCheckInView customerId={customer.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

