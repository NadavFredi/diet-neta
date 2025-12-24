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
    <div className="space-y-6" dir="rtl">
      {/* Header with Stats */}
      <Card className="border-2 border-slate-200 bg-gradient-to-br from-[#5B6FB9]/5 to-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-[#5B6FB9]" />
            דיווח יומי - {today}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">אימון</span>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{complianceStats.workout}%</div>
              <div className="text-xs text-gray-500 mt-1">7 ימים אחרונים</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">צעדים</span>
                <Footprints className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{complianceStats.steps}%</div>
              <div className="text-xs text-gray-500 mt-1">7 ימים אחרונים</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">תזונה</span>
                <UtensilsCrossed className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{complianceStats.nutrition}%</div>
              <div className="text-xs text-gray-500 mt-1">7 ימים אחרונים</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">כללי</span>
                <TrendingUp className="h-4 w-4 text-[#5B6FB9]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{complianceStats.overall}%</div>
              <div className="text-xs text-gray-500 mt-1">7 ימים אחרונים</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-In Form */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">
            מה השלמת היום?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Checkboxes Row - 3 fields in one row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Workout */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
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

            {/* Steps */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-semibold text-slate-900">צעדים</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="steps-goal-met"
                    checked={stepsGoalMet}
                    onCheckedChange={(checked) => setStepsGoalMet(checked === true)}
                  />
                  <Label htmlFor="steps-goal-met" className="cursor-pointer text-sm">
                    השגתי את היעד
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="steps-actual" className="text-xs text-gray-600 whitespace-nowrap">
                    בפועל:
                  </Label>
                  <Input
                    id="steps-actual"
                    type="number"
                    value={stepsActual}
                    onChange={(e) => setStepsActual(e.target.value)}
                    placeholder="מספר"
                    className="h-8 text-sm"
                    dir="ltr"
                  />
                </div>
                {stepsGoalMet && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit text-xs">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    יעד הושג
                  </Badge>
                )}
              </div>
            </div>

            {/* Nutrition */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
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
          </div>

          {/* Supplements */}
          {supplementsList.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
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

          {/* Notes - Full Width */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-lg border-2 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#5B6FB9]/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-[#5B6FB9]" />
              </div>
              <Label className="text-base font-semibold text-slate-900">הערות (אופציונלי)</Label>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות על היום שלך, איך הרגשת, מה היו האתגרים, או כל דבר אחר שתרצה לשתף..."
              className="min-h-[100px] resize-none text-sm border-slate-300 focus:border-[#5B6FB9] focus:ring-[#5B6FB9]/20 bg-white"
              dir="rtl"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-3 border-t border-slate-200">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white px-6 py-2"
            >
              {isSubmitting ? 'שומר...' : 'שמור דיווח'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

