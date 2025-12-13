import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  Clock,
  FileText,
  Edit,
  Target,
  Trash2
} from 'lucide-react';
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { NutritionTemplateForm } from './NutritionTemplateForm';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { NutritionPlan } from '@/hooks/useNutritionPlan';

interface NutritionPlanCardProps {
  nutritionPlan: NutritionPlan;
  onUpdate?: (plan: Partial<NutritionPlan>) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}

const MACRO_COLORS = {
  calories: '#f97316', // orange
  protein: '#ef4444',  // red
  carbs: '#3b82f6',    // blue
  fat: '#f59e0b',      // amber
  fiber: '#22c55e',    // green
};

export const NutritionPlanCard = ({ 
  nutritionPlan, 
  onUpdate,
  onDelete,
  isEditable = true 
}: NutritionPlanCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const startDate = new Date(nutritionPlan.start_date);
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

  // Calculate macro percentages
  const macroPercentages = () => {
    const proteinCalories = nutritionPlan.targets.protein * 4;
    const carbsCalories = nutritionPlan.targets.carbs * 4;
    const fatCalories = nutritionPlan.targets.fat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
    
    if (totalMacroCalories === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }
    
    return {
      protein: Math.round((proteinCalories / totalMacroCalories) * 100),
      carbs: Math.round((carbsCalories / totalMacroCalories) * 100),
      fat: Math.round((fatCalories / totalMacroCalories) * 100),
    };
  };

  const percentages = macroPercentages();

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-600" />
              תוכנית תזונה
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className="bg-orange-50 text-orange-700 border-orange-200 font-semibold px-3 py-1"
              >
                <Clock className="h-4 w-4 mr-1" />
                {getTimeInPlan()} בתוכנית
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-slate-100 text-slate-700 border-slate-300"
              >
                <Calendar className="h-3 w-3 mr-1" />
                התחלה: {format(startDate, 'dd/MM/yyyy', { locale: he })}
              </Badge>
            </div>
          </div>
          {isEditable && (
            <div className="flex items-center gap-2">
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden" 
                  dir="rtl"
                >
                  <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
                    <DialogTitle className="text-lg">עריכת תוכנית תזונה</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden min-h-0">
                    <NutritionTemplateForm
                      mode="user"
                      initialData={nutritionPlan}
                      onSave={(data) => {
                        onUpdate?.({
                          ...nutritionPlan,
                          ...data,
                        });
                        setIsEditOpen(false);
                      }}
                      onCancel={() => setIsEditOpen(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>מחיקת תוכנית תזונה</AlertDialogTitle>
                    <AlertDialogDescription>
                      האם אתה בטוח שברצונך למחוק את תוכנית התזונה? פעולה זו לא ניתנת לביטול.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDelete?.();
                        setIsDeleteOpen(false);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      מחק
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Description */}
        {nutritionPlan.description && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <p className="text-slate-700 leading-relaxed">{nutritionPlan.description}</p>
            </div>
          </div>
        )}

        {/* Macro Targets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Calories */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-200 rounded-lg">
                <Flame className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600">קלוריות</p>
                <p className="text-2xl font-bold text-orange-900">{nutritionPlan.targets.calories}</p>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-2">קק״ל יומי</p>
          </div>

          {/* Protein */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-200 rounded-lg">
                <Beef className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">חלבון</p>
                <p className="text-2xl font-bold text-red-900">{nutritionPlan.targets.protein}</p>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">{percentages.protein}% • גרם יומי</p>
          </div>

          {/* Carbs */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Wheat className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">פחמימות</p>
                <p className="text-2xl font-bold text-blue-900">{nutritionPlan.targets.carbs}</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">{percentages.carbs}% • גרם יומי</p>
          </div>

          {/* Fat */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border-2 border-amber-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Droplets className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">שומן</p>
                <p className="text-2xl font-bold text-amber-900">{nutritionPlan.targets.fat}</p>
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">{percentages.fat}% • גרם יומי</p>
          </div>

          {/* Fiber */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-200 rounded-lg">
                <Leaf className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">סיבים</p>
                <p className="text-2xl font-bold text-green-900">{nutritionPlan.targets.fiber}</p>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">גרם יומי</p>
          </div>
        </div>

        {/* Macro Distribution Summary */}
        <div className="mt-6 pt-6 border-t-2 border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            התפלגות מקרו-נוטריאנטים
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium text-slate-700">חלבון</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{percentages.protein}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${percentages.protein}%` }}
                />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-slate-700">פחמימות</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{percentages.carbs}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${percentages.carbs}%` }}
                />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium text-slate-700">שומן</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{percentages.fat}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${percentages.fat}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
