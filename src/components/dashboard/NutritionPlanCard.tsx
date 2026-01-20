import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Flame,
  UtensilsCrossed,
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
import { BudgetLinkBadge } from './BudgetLinkBadge';
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
    <Card className="bg-white border-2 border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-600" />
              תוכנית תזונה
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
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
              <BudgetLinkBadge budgetId={nutritionPlan.budget_id} />
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
                  className="max-w-[98vw] w-[98vw] h-[96vh] flex flex-col p-0 overflow-hidden" 
                  dir="rtl"
                >
                  <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="text-xl font-semibold">עריכת תוכנית תזונה</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden min-h-0 px-6 pb-6">
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
                    <AlertDialogAction
                      onClick={() => {
                        onDelete?.();
                        setIsDeleteOpen(false);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      מחק
                    </AlertDialogAction>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Nutrition Plan Section - Print Budget Design */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">תוכנית תזונה</h3>
          </div>
          
          {nutritionPlan.description && (
            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-2">{nutritionPlan.description}</p>
            </div>
          )}

          {/* Nutrition Targets */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">יעדי מקרו-נוטריאנטים</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-blue-600 mb-1">קלוריות</p>
                <p className="text-lg font-bold text-blue-900">
                  {nutritionPlan.targets.calories || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-1">חלבון (גרם)</p>
                <p className="text-lg font-bold text-blue-900">
                  {nutritionPlan.targets.protein || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-1">פחמימות (גרם)</p>
                <p className="text-lg font-bold text-blue-900">
                  {nutritionPlan.targets.carbs || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-1">שומן (גרם)</p>
                <p className="text-lg font-bold text-blue-900">
                  {nutritionPlan.targets.fat || '—'}
                </p>
              </div>
            </div>
            {nutritionPlan.targets.fiber && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 mb-1">סיבים (גרם)</p>
                <p className="text-lg font-bold text-blue-900">
                  {nutritionPlan.targets.fiber || '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


