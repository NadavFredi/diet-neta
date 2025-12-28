/**
 * DailyCheckInView Component
 * 
 * View component for daily check-in functionality.
 * Logic is separated to useDailyCheckIn hook.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  Activity,
  Footprints,
  UtensilsCrossed,
  Pill,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useAppSelector } from '@/store/hooks';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface DailyCheckInViewProps {
  customerId: string | null;
}

export const DailyCheckInView: React.FC<DailyCheckInViewProps> = ({ customerId }) => {
  const { activeLead } = useAppSelector((state) => state.client);
  const {
    todayCheckIn,
    isLoading,
    isSubmitting,
    submitCheckIn,
    complianceStats,
  } = useDailyCheckIn(customerId);

  const [workoutCompleted, setWorkoutCompleted] = useState(
    todayCheckIn?.workout_completed ?? false
  );
  const [stepsGoalMet, setStepsGoalMet] = useState(
    todayCheckIn?.steps_goal_met ?? false
  );
  const [stepsActual, setStepsActual] = useState<string>(
    todayCheckIn?.steps_actual?.toString() || ''
  );
  const [nutritionGoalMet, setNutritionGoalMet] = useState(
    todayCheckIn?.nutrition_goal_met ?? false
  );
  const [supplements, setSupplements] = useState<string[]>(
    todayCheckIn?.supplements_taken || []
  );
  const [notes, setNotes] = useState(todayCheckIn?.notes || '');

  // Get daily protocol from active lead
  const dailyProtocol = activeLead?.daily_protocol || {};
  const stepsGoal = dailyProtocol.stepsGoal || 0;
  const supplementsList = dailyProtocol.supplements || [];

  const handleSubmit = () => {
    submitCheckIn({
      workout_completed: workoutCompleted,
      steps_goal_met: stepsGoalMet,
      steps_actual: stepsActual ? parseInt(stepsActual, 10) : null,
      nutrition_goal_met: nutritionGoalMet,
      supplements_taken: supplements,
      notes: notes.trim() || null,
    });
  };

  const toggleSupplement = (supplement: string) => {
    setSupplements((prev) =>
      prev.includes(supplement)
        ? prev.filter((s) => s !== supplement)
        : [...prev, supplement]
    );
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-slate-200">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#5B6FB9] mb-2"></div>
            <p className="text-sm text-gray-600">טוען דיווח יומי...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he });

  return (
    <div className="space-y-3" dir="rtl">
      {/* Header with Stats */}
      <Card className="border-2 border-slate-200 bg-gradient-to-br from-[#5B6FB9]/5 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#5B6FB9]" />
            דיווח יומי - {today}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Workout Card */}
            <div className="bg-white rounded-lg py-2.5 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <Activity className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">אימון</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.workout}%</span>
            </div>
            
            {/* Steps Card */}
            <div className="bg-white rounded-lg py-2.5 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <Footprints className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">צעדים</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.steps}%</span>
            </div>
            
            {/* Nutrition Card */}
            <div className="bg-white rounded-lg py-2.5 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <UtensilsCrossed className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">תזונה</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.nutrition}%</span>
            </div>
            
            {/* Overall Card */}
            <div className="bg-white rounded-lg py-2.5 px-4 border border-gray-100 shadow-sm flex flex-row items-center justify-between">
              <TrendingUp className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-bold text-black">כללי</span>
                <span className="text-[10px] text-gray-400 leading-tight">7 ימים אחרונים</span>
              </div>
              <span className="text-3xl font-bold text-black flex-shrink-0">{complianceStats.overall}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-In Form */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            מה השלמת היום?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 pb-3">
          {/* Two-Column Layout: Checklist (30%) on Left, Notes (70%) on Right */}
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Left Side: Checklist Items (30%) - Stacked Vertically */}
            <div className="lg:w-[30%] flex-shrink-0 space-y-3">
              {/* Workout */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold text-slate-900">אימון</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="workout-completed"
                    checked={workoutCompleted}
                    onCheckedChange={(checked) => setWorkoutCompleted(checked === true)}
                  />
                  <Label htmlFor="workout-completed" className="cursor-pointer text-sm">
                    השלמתי את האימון
                  </Label>
                </div>
                {workoutCompleted && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-2 w-fit text-xs">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    הושלם
                  </Badge>
                )}
              </div>

              {/* Steps - All in one row */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Footprints className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-semibold text-slate-900">צעדים</Label>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Checkbox
                    id="steps-goal-met"
                    checked={stepsGoalMet}
                    onCheckedChange={(checked) => setStepsGoalMet(checked === true)}
                  />
                  <Label htmlFor="steps-goal-met" className="cursor-pointer text-sm flex-shrink-0">
                    השגתי את היעד
                  </Label>
                  <Label htmlFor="steps-actual" className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                    בפועל:
                  </Label>
                  <Input
                    id="steps-actual"
                    type="number"
                    value={stepsActual}
                    onChange={(e) => setStepsActual(e.target.value)}
                    placeholder="מספר"
                    className="h-8 text-sm w-20 flex-shrink-0"
                    dir="ltr"
                  />
                  {stepsGoalMet && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      יעד הושג
                    </Badge>
                  )}
                </div>
              </div>

              {/* Nutrition */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                  <Label className="text-sm font-semibold text-slate-900">תזונה</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nutrition-goal-met"
                    checked={nutritionGoalMet}
                    onCheckedChange={(checked) => setNutritionGoalMet(checked === true)}
                  />
                  <Label htmlFor="nutrition-goal-met" className="cursor-pointer text-sm">
                    עמדתי ביעדי התזונה
                  </Label>
                </div>
                {nutritionGoalMet && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-2 w-fit text-xs">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    הושג
                  </Badge>
                )}
              </div>

              {/* Supplements */}
              {supplementsList.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <Label className="text-sm font-semibold text-slate-900">תוספי תזונה</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supplementsList.map((supplement: string) => (
                      <Badge
                        key={supplement}
                        variant={supplements.includes(supplement) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors text-xs ${
                          supplements.includes(supplement)
                            ? 'bg-[#5B6FB9] text-white'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleSupplement(supplement)}
                      >
                        {supplements.includes(supplement) && (
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                        )}
                        {supplement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Notes (70%) */}
            <div className="flex-1 lg:w-[70%] min-w-0">
              <div className="p-3 bg-gradient-to-br from-slate-50 to-white rounded-lg border-2 border-slate-200 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#5B6FB9]/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-[#5B6FB9]" />
                  </div>
                  <Label className="text-base font-semibold text-slate-900">הערות (אופציונלי)</Label>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערות על היום שלך, איך הרגשת, מה היו האתגרים, או כל דבר אחר שתרצה לשתף..."
                  className="flex-1 min-h-[120px] resize-none text-sm border-slate-300 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20 bg-white mb-2"
                  dir="rtl"
                />
                {/* Submit Button - Below textarea, aligned to right (left in RTL) */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white px-6 py-2"
                  >
                    {isSubmitting ? 'שומר...' : 'שמור דיווח'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

