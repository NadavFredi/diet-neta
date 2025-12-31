/**
 * ActionDashboard Component
 * 
 * Main content area with Bento Grid layout.
 * Displays: Status & Info, Quick Actions, Stats/KPIs.
 * NO Lead History Table (moved to sidebar).
 */

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from './InlineEditableField';
import { InlineEditableSelect } from './InlineEditableSelect';
import { 
  Target, 
  Activity, 
  Clock, 
  MapPin, 
  Wallet, 
  TrendingUp,
  Dumbbell,
  Flame,
  FileText,
  Calendar as CalendarIcon,
  Apple,
  Weight
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { 
  FITNESS_GOAL_OPTIONS, 
  ACTIVITY_LEVEL_OPTIONS, 
  PREFERRED_TIME_OPTIONS, 
  SOURCE_OPTIONS 
} from '@/utils/dashboard';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import { LeadHistoryTabs } from './LeadHistoryTabs';
import { LeadAutomationCard } from './LeadAutomationCard';
import { LeadFormsCard } from './LeadFormsCard';
import { ReadOnlyField } from './ReadOnlyField';
import { LeadPaymentCard } from './LeadPaymentCard';
import { usePlansHistory } from '@/hooks/usePlansHistory';

interface LeadData {
  id: string;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  created_at: string;
  join_date: string | null;
  subscription_data?: any;
  workout_history?: any;
  steps_history?: any;
  nutrition_history?: any;
  supplements_history?: any;
  daily_protocol?: any;
  [key: string]: any;
}

interface ActionDashboardProps {
  activeLead: LeadData | null;
  isLoading: boolean;
  customer: any; // Customer data for automation card
  onUpdateLead: (updates: any) => Promise<void>;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAssignBudget?: () => void;
  budgetAssignments?: any[] | null;
  getStatusColor: (status: string) => string;
}

export const ActionDashboard: React.FC<ActionDashboardProps> = ({
  activeLead,
  isLoading,
  customer,
  onUpdateLead,
  onAddWorkoutPlan,
  onAddDietPlan,
  onAssignBudget,
  budgetAssignments,
  getStatusColor,
}) => {
  if (isLoading) {
    return (
      <Card className="p-8 border border-gray-200 rounded-xl shadow-sm">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">טוען פרטי התעניינות...</p>
        </div>
      </Card>
    );
  }

  if (!activeLead) {
    return (
      <Card className="p-12 border border-gray-200 rounded-xl shadow-sm">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-base font-medium">בחר התעניינות מהיסטוריה כדי לצפות בפרטים</p>
        </div>
      </Card>
    );
  }

  const subscriptionData = activeLead.subscription_data || {};
  const displayStatus = activeLead.status_sub || activeLead.status_main || 'ללא סטטוס';

  // Calculate age from birth_date
  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(activeLead.birth_date);
  
  // Calculate BMI if height and weight are available
  const calculateBMI = (height: number | null, weight: number | null): number | null => {
    if (!height || !weight || height === 0) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  const bmi = calculateBMI(activeLead.height, activeLead.weight);

  // Fetch plans history from plan tables
  const leadId = activeLead?.id;
  const { data: plansHistory } = usePlansHistory(customer?.id, leadId);

  // Merge plans from database with JSONB history (plans take precedence)
  const mergedWorkoutHistory = useMemo(() => {
    const plans = plansHistory?.workoutHistory || [];
    const jsonbHistory = activeLead?.workout_history || [];
    
    // Combine: plans first (newer), then JSONB history (legacy)
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.workoutHistory, activeLead?.workout_history]);

  const mergedNutritionHistory = useMemo(() => {
    const plans = plansHistory?.nutritionHistory || [];
    const jsonbHistory = activeLead?.nutrition_history || [];
    
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.nutritionHistory, activeLead?.nutrition_history]);

  const mergedSupplementsHistory = useMemo(() => {
    const plans = plansHistory?.supplementsHistory || [];
    const jsonbHistory = activeLead?.supplements_history || [];
    
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.supplementsHistory, activeLead?.supplements_history]);

  const mergedStepsHistory = useMemo(() => {
    const plans = plansHistory?.stepsHistory || [];
    const jsonbHistory = activeLead?.steps_history || [];
    
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.stepsHistory, activeLead?.steps_history]);

  // Helper to get badge color for fitness info
  const getFitnessBadgeColor = (type: string) => {
    switch (type) {
      case 'activity_level': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'source': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'fitness_goal': return 'bg-green-50 text-green-700 border-green-200';
      case 'preferred_time': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden w-full" dir="rtl">
      <div className="p-6 w-full min-w-0 text-right">
        {/* Row 1: 3-Column Grid - Subscription, CRM Status, Personal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6" style={{ gridAutoRows: 'min-content' }}>
          {/* Card 1: Subscription Details */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פרטי מנוי</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableField
                label="תאריך הצטרפות"
                value={activeLead.join_date || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ join_date: String(newValue) });
                }}
                type="date"
                formatValue={(val) => formatDate(String(val))}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-slate-900"
              />
              <InlineEditableField
                label="שבוע נוכחי"
                value={subscriptionData.currentWeekInProgram || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    currentWeekInProgram: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => String(val)}
                className="border-0 p-0"
                valueClassName="text-base font-bold text-blue-900"
              />
              <InlineEditableField
                label="חבילה ראשונית"
                value={subscriptionData.months || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    months: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => `${val} חודשים`}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="מחיר ראשוני"
                value={subscriptionData.initialPrice || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    initialPrice: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => `₪${val}`}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="מחיר חידוש חודשי"
                value={subscriptionData.renewalPrice || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    renewalPrice: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => `₪${val}`}
                className="border-0 p-0"
              />
            </div>
          </Card>

          {/* Card 2: CRM Status & Info */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">סטטוס ומידע CRM</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableSelect
                label="סטטוס"
                value={displayStatus}
                options={[
                  ...STATUS_CATEGORIES.map(cat => cat.label),
                  ...(STATUS_CATEGORIES.flatMap(cat => cat.subStatuses?.map(sub => sub.label) || [])),
                ]}
                onSave={async (newValue) => {
                  const mainCategory = STATUS_CATEGORIES.find(cat => cat.label === newValue);
                  const subCategory = STATUS_CATEGORIES.find(cat => 
                    cat.subStatuses?.some(sub => sub.label === newValue)
                  );
                  
                  if (mainCategory) {
                    await onUpdateLead({ 
                      status_main: mainCategory.label,
                      status_sub: null 
                    });
                  } else if (subCategory) {
                    const subStatus = subCategory.subStatuses?.find(sub => sub.label === newValue);
                    await onUpdateLead({ 
                      status_main: subCategory.label,
                      status_sub: subStatus?.label || newValue 
                    });
                  } else {
                    await onUpdateLead({ 
                      status_main: newValue,
                      status_sub: null 
                    });
                  }
                }}
                badgeClassName={getStatusColor(displayStatus)}
                className="border-0 p-0"
              />
              <InlineEditableSelect
                label="מקור"
                value={activeLead.source || ''}
                options={[...SOURCE_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ source: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('source')}
                className="border-0 p-0"
              />
              <InlineEditableSelect
                label="מטרת כושר"
                value={activeLead.fitness_goal || ''}
                options={[...FITNESS_GOAL_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ fitness_goal: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('fitness_goal')}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="עיר"
                value={activeLead.city || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ city: String(newValue) });
                }}
                type="text"
                className="border-0 p-0"
              />
              <InlineEditableSelect
                label="מגדר"
                value={activeLead.gender || ''}
                options={['male', 'female', 'other']}
                onSave={async (newValue) => {
                  await onUpdateLead({ gender: newValue });
                }}
                formatValue={(val) => {
                  if (val === 'male') return 'זכר';
                  if (val === 'female') return 'נקבה';
                  if (val === 'other') return 'אחר';
                  return val;
                }}
                badgeClassName="bg-gray-50 text-gray-700 border-gray-200"
                className="border-0 p-0"
              />
              {onUpdateLead && (
                <InlineEditableField
                  label="תאריך יצירה"
                  value={activeLead.created_at || ''}
                  onSave={async (newValue) => {
                    if (activeLead.id) {
                      await onUpdateLead({ created_at: String(newValue) });
                    }
                  }}
                  type="date"
                  formatValue={(val) => formatDate(String(val))}
                  className="border-0 p-0"
                  valueClassName="text-sm font-semibold text-slate-900"
                />
              )}
            </div>
          </Card>

          {/* Card 3: Personal Details */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-cyan-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פרטים אישיים</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <ReadOnlyField
                label="גיל"
                value={age !== null ? `${age} שנים` : null}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="גובה"
                value={activeLead.height || 0}
                onSave={async (newValue) => {
                  await onUpdateLead({ height: Number(newValue) });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : `${val} ס"מ`}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="משקל"
                value={activeLead.weight || 0}
                onSave={async (newValue) => {
                  await onUpdateLead({ weight: Number(newValue) });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : `${val} ק"ג`}
                className="border-0 p-0"
              />
              <div className="flex flex-col gap-1.5 min-w-0 w-full">
                <span className="text-xs text-gray-500 font-medium flex-shrink-0">BMI:</span>
                <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
                  {bmi !== null ? bmi : '-'}
                </span>
              </div>
              <InlineEditableField
                label="תאריך לידה"
                value={activeLead.birth_date || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ birth_date: String(newValue) });
                }}
                type="date"
                formatValue={(val) => val ? formatDate(String(val)) : '-'}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-slate-900"
              />
              {activeLead.target_weight && (
                <ReadOnlyField
                  label="משקל יעד"
                  value={`${activeLead.target_weight} ק"ג`}
                  className="border-0 p-0"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Row 2: 3-Column Grid - Fitness Info, Daily Protocol, WhatsApp Automation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6" style={{ gridAutoRows: 'min-content' }}>
          {/* Card 4: Fitness Info */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-pink-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">מידע כושר</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableSelect
                label="רמת פעילות"
                value={activeLead.activity_level || ''}
                options={[...ACTIVITY_LEVEL_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ activity_level: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('activity_level')}
                className="border-0 p-0"
              />
              <InlineEditableSelect
                label="זמן מועדף"
                value={activeLead.preferred_time || ''}
                options={[...PREFERRED_TIME_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ preferred_time: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('preferred_time')}
                className="border-0 p-0"
              />
            </div>
          </Card>

          {/* Card 5: Daily Protocol */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פרוטוקול יומי</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableField
                label="אימונים/שבוע"
                value={activeLead.daily_protocol?.workoutGoal || 0}
                onSave={async (newValue) => {
                  const updatedProtocol = {
                    ...(activeLead.daily_protocol || {}),
                    workoutGoal: Number(newValue),
                  };
                  await onUpdateLead({ daily_protocol: updatedProtocol });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : String(val)}
                className="border-0 p-0"
              />
              <InlineEditableField
                label="יעד צעדים"
                value={activeLead.daily_protocol?.stepsGoal || 0}
                onSave={async (newValue) => {
                  const updatedProtocol = {
                    ...(activeLead.daily_protocol || {}),
                    stepsGoal: Number(newValue),
                  };
                  await onUpdateLead({ daily_protocol: updatedProtocol });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : `${val}`}
                className="border-0 p-0"
              />
            </div>
          </Card>

          {/* Card 6: WhatsApp Automation - Compact Version */}
          <LeadAutomationCard
            customer={customer}
            lead={activeLead}
            workoutPlanName={null}
            nutritionPlanName={null}
          />

          {/* Card 7: Fillout Forms */}
          <LeadFormsCard 
            leadId={activeLead?.id || null} // Pass lead ID for URL parameter matching
            leadEmail={customer?.email || activeLead?.email || null} 
            leadPhone={activeLead?.phone || customer?.phone || null}
          />

          {/* Card 8: Stripe Payment Center */}
          <LeadPaymentCard
            customerPhone={activeLead.phone || customer?.phone || null}
            customerName={customer?.full_name || activeLead.name || null}
            customerEmail={customer?.email || activeLead.email || null}
          />
        </div>

        {/* Workout, Steps, Nutrition & Supplements History Tabs - Full Width - Always Visible */}
        <div className="w-full">
          <LeadHistoryTabs
            workoutHistory={mergedWorkoutHistory}
            stepsHistory={mergedStepsHistory}
            nutritionHistory={mergedNutritionHistory}
            supplementsHistory={mergedSupplementsHistory}
            budgetAssignments={budgetAssignments}
            onAddWorkoutPlan={onAddWorkoutPlan}
            onAddDietPlan={onAddDietPlan}
            onAddSupplementsPlan={() => {
              // Supplements plan creation - placeholder for future implementation
              console.log('Add supplements plan');
            }}
            onAssignBudget={onAssignBudget || (() => {})}
          />
        </div>
      </div>
    </div>
  );
};




