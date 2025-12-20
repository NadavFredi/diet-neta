/**
 * LeadHistoryTabs Component
 * 
 * Displays workout history and steps history for a single lead.
 * Used in ActionDashboard for the active lead interaction.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Footprints, UtensilsCrossed, Pill, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/utils/dashboard';

interface WorkoutHistoryItem {
  name?: string;
  startDate?: string;
  validUntil?: string;
  duration?: string;
  description?: string;
  strengthCount?: number;
  split?: {
    strength?: number;
    cardio?: number;
    intervals?: number;
  };
  strength?: number;
  cardio?: number;
  intervals?: number;
}

interface StepsHistoryItem {
  weekNumber?: string;
  week?: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  target?: number;
}

interface NutritionHistoryItem {
  id?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  template_id?: string;
  targets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  created_at?: string;
}

interface SupplementsHistoryItem {
  startDate?: string;
  endDate?: string;
  supplements?: string[];
  description?: string;
  created_at?: string;
}

interface LeadHistoryTabsProps {
  workoutHistory?: WorkoutHistoryItem[] | null;
  stepsHistory?: StepsHistoryItem[] | null;
  nutritionHistory?: NutritionHistoryItem[] | null;
  supplementsHistory?: SupplementsHistoryItem[] | null;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAddSupplementsPlan: () => void;
}

export const LeadHistoryTabs = ({ 
  workoutHistory, 
  stepsHistory, 
  nutritionHistory, 
  supplementsHistory,
  onAddWorkoutPlan,
  onAddDietPlan,
  onAddSupplementsPlan,
}: LeadHistoryTabsProps) => {
  const [activeTab, setActiveTab] = useState('workouts');

  const hasWorkoutHistory = workoutHistory && workoutHistory.length > 0;
  const hasStepsHistory = stepsHistory && stepsHistory.length > 0;
  const hasNutritionHistory = nutritionHistory && nutritionHistory.length > 0;
  const hasSupplementsHistory = supplementsHistory && supplementsHistory.length > 0;

  // Handler functions
  const handleWorkoutClick = () => {
    onAddWorkoutPlan();
  };

  const handleDietClick = () => {
    onAddDietPlan();
  };

  const handleSupplementsClick = () => {
    // Supplements plan - placeholder for now (empty as requested)
    onAddSupplementsPlan();
  };

  // Get the appropriate button for the active tab
  const getActionButton = () => {
    switch (activeTab) {
      case 'workouts':
      case 'steps':
        return (
          <Button 
            size="sm" 
            onClick={handleWorkoutClick}
            type="button"
            className="gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            הוסף תכנית אימונים
          </Button>
        );
      case 'nutrition':
        return (
          <Button 
            size="sm" 
            onClick={handleDietClick}
            type="button"
            className="gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            הוסף תכנית תזונה
          </Button>
        );
      case 'supplements':
        return (
          <Button 
            size="sm" 
            onClick={handleSupplementsClick}
            type="button"
            className="gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            הוסף תכנית תוספים
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            onClick={handleWorkoutClick}
            type="button"
            className="gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            הוסף תכנית אימונים
          </Button>
        );
    }
  };

  // Always show tabs, even if empty
  return (
    <Card className="p-3 border border-slate-100 rounded-lg shadow-sm bg-white mt-3">
      {/* Header Toolbar with Context-Aware Add Button */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
        {getActionButton()}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 h-10 bg-gray-100 rounded-lg p-1">
          <TabsTrigger 
            value="workouts" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            יומן אימונים
          </TabsTrigger>
          <TabsTrigger 
            value="steps" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            יומן צעדים
          </TabsTrigger>
          <TabsTrigger 
            value="nutrition" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            תכניות תזונה
          </TabsTrigger>
          <TabsTrigger 
            value="supplements" 
            className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            תכניות תוספים
          </TabsTrigger>
        </TabsList>

        {/* Workout History Tab */}
        <TabsContent value="workouts" className="mt-0">
          {!hasWorkoutHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תוכניות אימון</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onAddWorkoutPlan()}
                type="button"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                הוסף תכנית אימונים
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">כוח</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">קרדיו</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">אינטרוולים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workoutHistory.map((workout, index) => {
                    const strength = workout.split?.strength || workout.strengthCount || workout.strength || 0;
                    const cardio = workout.split?.cardio || workout.cardioCount || workout.cardio || 0;
                    const intervals = workout.split?.intervals || workout.intervalsCount || workout.intervals || 0;

                    return (
                      <TableRow
                        key={index}
                        className={`transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-blue-50 hover:shadow-sm border-b border-gray-100`}
                      >
                        <TableCell className="text-xs font-semibold text-gray-900 py-3">
                          {workout.startDate ? formatDate(workout.startDate) : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate font-semibold text-gray-900 py-3">
                          {workout.description || workout.name || '-'}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 font-semibold">
                            {strength}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 font-semibold">
                            {cardio}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 font-semibold">
                            {intervals}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Steps History Tab */}
        <TabsContent value="steps" className="mt-0">
          {!hasStepsHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-200 flex items-center justify-center">
                <Footprints className="h-6 w-6 text-cyan-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">אין היסטוריית צעדים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(stepsHistory || []).map((step: any, index: number) => {
                const isCurrent = index === (stepsHistory || []).length - 1;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 shadow-md hover:shadow-lg'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                        isCurrent ? 'bg-gradient-to-br from-cyan-500 to-cyan-600' : 'bg-gradient-to-br from-gray-300 to-gray-400'
                      }`}>
                        <Footprints className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                            {step.weekNumber || step.week || `שבוע ${index + 1}`}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-0 text-xs px-2 py-0.5 font-semibold">
                              פעיל
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {step.startDate ? formatDate(step.startDate) : step.dates || ''} 
                          {step.endDate ? ` - ${formatDate(step.endDate)}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                      {(step.target || 0).toLocaleString('he-IL')} צעדים
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Nutrition History Tab */}
        <TabsContent value="nutrition" className="mt-0">
          {!hasNutritionHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תזונה</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onAddDietPlan()}
                type="button"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                הוסף תכנית תזונה
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך סיום</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">קלוריות</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">חלבון</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">פחמימות</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">שומן</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nutritionHistory.map((nutrition, index) => (
                    <TableRow
                      key={index}
                      className={`transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-orange-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {nutrition.startDate ? formatDate(nutrition.startDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {nutrition.endDate ? formatDate(nutrition.endDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate font-semibold text-gray-900 py-3">
                        {nutrition.description || '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.calories || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.protein ? `${nutrition.targets.protein}ג` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.carbs ? `${nutrition.targets.carbs}ג` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 font-semibold">
                          {nutrition.targets?.fat ? `${nutrition.targets.fat}ג` : '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Supplements History Tab */}
        <TabsContent value="supplements" className="mt-0">
          {!hasSupplementsHistory ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <Pill className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-3">אין היסטוריה של תכניות תוספים</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Supplements plan - placeholder for now (empty as requested)
                  onAddSupplementsPlan();
                }}
                type="button"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                הוסף תכנית תוספים
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תאריך סיום</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תיאור</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-900 py-3">תוספים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplementsHistory.map((supplement, index) => (
                    <TableRow
                      key={index}
                      className={`transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-green-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {supplement.startDate ? formatDate(supplement.startDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 py-3">
                        {supplement.endDate ? formatDate(supplement.endDate) : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate font-semibold text-gray-900 py-3">
                        {supplement.description || '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {(supplement.supplements || []).map((sup: string, idx: number) => (
                            <Badge 
                              key={idx}
                              variant="outline" 
                              className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 font-semibold"
                            >
                              {sup}
                            </Badge>
                          ))}
                          {(!supplement.supplements || supplement.supplements.length === 0) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};


