/**
 * Workout Program View Component
 * 
 * Beautiful view-only display of workout program for client portal.
 * Shows weekly schedule with exercises in a clean, readable format.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Dumbbell, 
  Clock,
  FileText,
  Target,
} from 'lucide-react';
import { BudgetLinkBadge } from '@/components/dashboard/BudgetLinkBadge';
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import type { WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';

interface WorkoutProgramViewProps {
  workoutPlan: WorkoutPlan;
}

export const WorkoutProgramView: React.FC<WorkoutProgramViewProps> = ({ 
  workoutPlan 
}) => {
  const startDate = new Date(workoutPlan.start_date);
  const today = new Date();
  const daysInPlan = differenceInDays(today, startDate);
  const weeksInPlan = differenceInWeeks(today, startDate);
  const monthsInPlan = differenceInMonths(today, startDate);

  const getTimeInPlan = () => {
    if (monthsInPlan > 0) {
      return `${monthsInPlan} ${monthsInPlan === 1 ? 'חודש' : 'חודשים'}`;
    } else if (weeksInPlan > 0) {
      return `${weeksInPlan} ${weeksInPlan === 1 ? 'שבוע' : 'שבועות'}`;
    } else {
      return `${daysInPlan} ${daysInPlan === 1 ? 'יום' : 'ימים'}`;
    }
  };

  const dayLabels: Record<string, string> = {
    sunday: 'ראשון',
    monday: 'שני',
    tuesday: 'שלישי',
    wednesday: 'רביעי',
    thursday: 'חמישי',
    friday: 'שישי',
    saturday: 'שבת',
  };

  const weeklyWorkout = workoutPlan.custom_attributes?.data?.weeklyWorkout;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="rounded-3xl border-2 border-[#5B6FB9]/20 bg-gradient-to-br from-[#5B6FB9]/5 to-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-[#5B6FB9]" />
                תוכנית אימונים
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge 
                  variant="outline" 
                  className="bg-[#5B6FB9]/10 text-[#5B6FB9] border-[#5B6FB9]/30 font-semibold px-3 py-1.5 text-sm"
                >
                  <Clock className="h-4 w-4 mr-1.5" />
                  {getTimeInPlan()} בתוכנית
                </Badge>
                <Badge 
                  variant="outline" 
                  className="bg-slate-100 text-slate-700 border-slate-300 px-3 py-1.5 text-sm"
                >
                  <Calendar className="h-3 w-3 mr-1.5" />
                  התחלה: {format(startDate, 'dd/MM/yyyy', { locale: he })}
                </Badge>
                {workoutPlan.budget_id && (
                  <BudgetLinkBadge budgetId={workoutPlan.budget_id} />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Description */}
        {workoutPlan.description && (
          <CardContent className="pt-0 pb-4">
            <div className="bg-white/60 rounded-xl p-4 border border-slate-200/50">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <p className="text-slate-700 leading-relaxed">{workoutPlan.description}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Weekly Workout Schedule */}
      {weeklyWorkout ? (
        <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-[#5B6FB9]" />
              תוכנית שבועית
            </CardTitle>
            {weeklyWorkout.generalGoals && (
              <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 leading-relaxed" dir="rtl">
                  {weeklyWorkout.generalGoals}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(weeklyWorkout.days || {}).map(([dayKey, dayData]: [string, any]) => {
                if (!dayData.isActive || !dayData.exercises || dayData.exercises.length === 0) return null;
                
                return (
                  <Card 
                    key={dayKey} 
                    className="rounded-2xl border-2 border-slate-200 hover:border-[#5B6FB9]/40 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                        <h4 className="font-bold text-lg text-slate-900">
                          יום {dayLabels[dayKey] || dayKey}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className="bg-[#5B6FB9]/10 text-[#5B6FB9] border-[#5B6FB9]/30 font-semibold"
                        >
                          {dayData.exercises.length} תרגילים
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {dayData.exercises.map((ex: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm mb-1">
                                  {ex.name}
                                </p>
                                {ex.notes && (
                                  <p className="text-xs text-slate-600 leading-relaxed mt-1" dir="rtl">
                                    {ex.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                {ex.sets && ex.reps && (
                                  <Badge 
                                    variant="outline" 
                                    className="bg-white text-slate-700 border-slate-300 text-xs font-semibold"
                                  >
                                    {ex.sets}x{ex.reps}
                                  </Badge>
                                )}
                                {ex.weight && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    {ex.weight} ק"ג
                                  </span>
                                )}
                                {ex.duration && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    {ex.duration} דק'
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-base font-medium text-gray-500">
              אין תוכנית שבועית זמינה
            </p>
            <p className="text-sm text-gray-400 mt-2">
              המאמן שלך יוסיף תוכנית אימונים בקרוב
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

