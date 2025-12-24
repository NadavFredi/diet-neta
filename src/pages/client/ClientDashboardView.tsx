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
} from 'lucide-react';
import { WorkoutPlanCard } from '@/components/dashboard/WorkoutPlanCard';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { DailyCheckInView } from '@/components/client/DailyCheckInView';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
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
  const { toast } = useToast();
  const { customer, activeLead, leads, isLoading, error, stats, handleSelectLead } = useClientDashboard();
  const { user } = useAppSelector((state) => state.auth);
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NetaLogo 
                size="default" 
                variant="default"
                className="rounded-none border-0 p-0"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeLead?.fitness_goal || 'אין יעד כושר מוגדר'}
                </p>
              </div>
            </div>
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">משקל</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.weight ? `${stats.weight} ק"ג` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">גובה</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.height ? `${stats.height} ס"מ` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">BMI</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.bmi ? stats.bmi.toFixed(1) : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">יעד כושר</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {stats.fitnessGoal || '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

