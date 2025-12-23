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
        <CardContent className="space-y-6">
          {/* Workout */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <Label className="text-base font-semibold text-slate-900">אימון</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                האם השלמת את האימון היומי שלך?
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="workout-completed"
                    checked={workoutCompleted}
                    onCheckedChange={(checked) => setWorkoutCompleted(checked === true)}
                  />
                  <Label htmlFor="workout-completed" className="cursor-pointer">
                    השלמתי את האימון
                  </Label>
                </div>
                {workoutCompleted && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    הושלם
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="h-5 w-5 text-green-600" />
                <Label className="text-base font-semibold text-slate-900">צעדים</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                יעד יומי: {stepsGoal.toLocaleString('he-IL')} צעדים
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="steps-goal-met"
                    checked={stepsGoalMet}
                    onCheckedChange={(checked) => setStepsGoalMet(checked === true)}
                  />
                  <Label htmlFor="steps-goal-met" className="cursor-pointer">
                    השגתי את היעד
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="steps-actual" className="text-sm text-gray-600 min-w-[100px]">
                    מספר צעדים בפועל:
                  </Label>
                  <Input
                    id="steps-actual"
                    type="number"
                    value={stepsActual}
                    onChange={(e) => setStepsActual(e.target.value)}
                    placeholder="הכנס מספר צעדים"
                    className="max-w-[200px]"
                    dir="ltr"
                  />
                </div>
                {stepsGoalMet && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    יעד הושג
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                <Label className="text-base font-semibold text-slate-900">תזונה</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                האם עמדת ביעדי התזונה שלך היום?
              </p>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="nutrition-goal-met"
                  checked={nutritionGoalMet}
                  onCheckedChange={(checked) => setNutritionGoalMet(checked === true)}
                />
                <Label htmlFor="nutrition-goal-met" className="cursor-pointer">
                  עמדתי ביעדי התזונה
                </Label>
                {nutritionGoalMet && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    הושג
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Supplements */}
          {supplementsList.length > 0 && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-5 w-5 text-purple-600" />
                  <Label className="text-base font-semibold text-slate-900">תוספי תזונה</Label>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  אילו תוספים לקחת היום?
                </p>
                <div className="flex flex-wrap gap-2">
                  {supplementsList.map((supplement: string) => (
                    <Badge
                      key={supplement}
                      variant={supplements.includes(supplement) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
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
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-slate-900">הערות (אופציונלי)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות על היום שלך..."
              className="min-h-[100px] resize-none"
              dir="rtl"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white px-8"
            >
              {isSubmitting ? 'שומר...' : 'שמור דיווח'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

