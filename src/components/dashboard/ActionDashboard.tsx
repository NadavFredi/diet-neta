/**
 * ActionDashboard Component
 * 
 * Main content area with Bento Grid layout.
 * Displays: Status & Info, Quick Actions, Stats/KPIs.
 * NO Lead History Table (moved to sidebar).
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from './InlineEditableField';
import { InlineEditableSelect } from './InlineEditableSelect';
import { NotesEditor } from './NotesEditor';
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
  Barbell,
  Apple
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
  onUpdateLead: (updates: any) => Promise<void>;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  getStatusColor: (status: string) => string;
}

export const ActionDashboard: React.FC<ActionDashboardProps> = ({
  activeLead,
  isLoading,
  onUpdateLead,
  onAddWorkoutPlan,
  onAddDietPlan,
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" dir="rtl">
      <div className="p-4 space-y-4">
        {/* Notes Section - Top of Body - Always Visible */}
        <NotesEditor
          value={activeLead.notes || ''}
          onSave={async (newValue) => {
            await onUpdateLead({ notes: newValue });
          }}
          isLoading={isLoading}
        />

        {/* Bento Grid Layout - 3 Columns */}
        <div className="grid grid-cols-3 gap-4 items-stretch">
          {/* Card 1: Status & CRM Info */}
          <Card className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">סטטוס ומידע CRM</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Status - Editable with custom values */}
              <InlineEditableSelect
                label="סטטוס"
                value={displayStatus}
                options={[
                  ...STATUS_CATEGORIES.map(cat => cat.label),
                  ...(STATUS_CATEGORIES.flatMap(cat => cat.subStatuses?.map(sub => sub.label) || [])),
                ]}
                onSave={async (newValue) => {
                  // Find if it's a main status or sub-status
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
                    // Custom status - store as main status
                    await onUpdateLead({ 
                      status_main: newValue,
                      status_sub: null 
                    });
                  }
                }}
                badgeClassName={getStatusColor(displayStatus)}
                className="border-0 p-0"
              />

              {/* Source - Editable with custom values */}
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

              {/* Fitness Goal - Editable with custom values */}
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
            </div>
            {/* Created Date - Read Only - Full Width Below */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 mb-1 block">תאריך יצירה</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatDate(activeLead.created_at)}
              </span>
            </div>
          </Card>

          {/* Card 2: Subscription Details */}
          <Card className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פרטי מנוי</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <InlineEditableField
                label="תאריך הצטרפות"
                value={activeLead.join_date || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ join_date: String(newValue) });
                }}
                type="date"
                formatValue={(val) => formatDate(String(val))}
                className="border-0 p-0"
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
              <div></div>
            </div>
          </Card>

          {/* Card 3: Quick Actions - Both buttons in same column */}
          <Card className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-orange-100 flex items-center justify-center">
                <Barbell className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פעולות מהירות</h3>
            </div>
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <Button
                onClick={onAddWorkoutPlan}
                className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 hover:from-blue-100 hover:via-blue-200 hover:to-blue-100 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-lg transition-all group min-h-0"
                variant="outline"
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors shadow-inner">
                  <Barbell className="h-7 w-7 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm font-bold text-blue-900">הוסף תכנית אימונים</span>
                <span className="text-xs text-blue-700 opacity-75">תכנית אימונים מותאמת אישית</span>
              </Button>
              <Button
                onClick={onAddDietPlan}
                className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 hover:from-orange-100 hover:via-orange-200 hover:to-orange-100 border-2 border-orange-200 rounded-xl shadow-sm hover:shadow-lg transition-all group min-h-0"
                variant="outline"
              >
                <div className="w-14 h-14 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors shadow-inner">
                  <Apple className="h-7 w-7 text-orange-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm font-bold text-orange-900">הוסף תכנית תזונה</span>
                <span className="text-xs text-orange-700 opacity-75">תכנית תזונה מותאמת אישית</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Stats/KPIs Row - 3 Columns */}
        <div className="grid grid-cols-3 gap-4">
          {/* Daily Protocol Card */}
          <Card className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">פרוטוקול יומי</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
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
              <div></div>
            </div>
          </Card>

          {/* Fitness Info Card */}
          <Card className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-pink-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">מידע כושר</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
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
              <div></div>
            </div>
          </Card>
        </div>

        {/* Workout, Steps, Nutrition & Supplements History Tabs - Full Width - Always Visible */}
        <div className="w-full">
          <LeadHistoryTabs
            workoutHistory={activeLead.workout_history}
            stepsHistory={activeLead.steps_history}
            nutritionHistory={activeLead.nutrition_history}
            supplementsHistory={activeLead.supplements_history}
          />
        </div>
      </div>
    </div>
  );
};
