/**
 * Budget View Component
 * 
 * Beautiful view-only display of active budget for client portal.
 * Shows nutrition targets, steps goal, supplements, and eating guidelines.
 */

import React from 'react';
import { useActiveBudgetForLead, useActiveBudgetForCustomer } from '@/hooks/useBudgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Flame,
  Footprints,
  Pill,
  UtensilsCrossed,
  Droplets,
  Leaf,
  Beef,
  Wheat,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BudgetViewProps {
  leadId?: string | null;
  customerId?: string | null;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  leadId,
  customerId,
}) => {
  // Fetch active budget
  const { data: leadBudget } = useActiveBudgetForLead(leadId || null);
  const { data: customerBudget } = useActiveBudgetForCustomer(customerId || null);
  const budgetAssignment = leadBudget || customerBudget;
  const budget = budgetAssignment?.budget;

  if (!budgetAssignment || !budget) {
    return (
      <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-base font-medium text-gray-500 mb-2">
            אין תקציב פעיל
          </p>
          <p className="text-sm text-gray-400">
            המאמן שלך יוסיף תקציב בקרוב
          </p>
        </CardContent>
      </Card>
    );
  }

  const nutritionTargets = budget.nutrition_targets as any || {};
  const supplements = (budget.supplements || []) as any[];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="rounded-3xl border-2 border-[#5B6FB9]/20 bg-gradient-to-br from-[#5B6FB9]/5 to-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="h-6 w-6 text-[#5B6FB9]" />
                {budget.name}
              </CardTitle>
              {budget.description && (
                <div className="bg-white/60 rounded-xl p-4 border border-slate-200/50 mt-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-700 leading-relaxed text-sm">{budget.description}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap mt-3">
                <Badge 
                  variant="outline" 
                  className="bg-slate-100 text-slate-700 border-slate-300 px-3 py-1.5 text-sm"
                >
                  <Calendar className="h-3 w-3 mr-1.5" />
                  הוקצה: {format(new Date(budgetAssignment.assigned_at), 'dd/MM/yyyy', { locale: he })}
                </Badge>
                {budgetAssignment.notes && (
                  <Badge 
                    variant="outline" 
                    className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 text-sm"
                  >
                    {budgetAssignment.notes}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Nutrition Targets Card */}
      <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#5B6FB9]" />
            יעדי תזונה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Macros Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Calories */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-orange-600" />
                <div className="text-xs font-semibold text-orange-700">קלוריות</div>
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {nutritionTargets.calories || '-'}
              </div>
              <div className="text-xs text-orange-600 mt-1">קק"ל</div>
            </div>

            {/* Protein */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Beef className="h-4 w-4 text-red-600" />
                <div className="text-xs font-semibold text-red-700">חלבון</div>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {nutritionTargets.protein || '-'}
              </div>
              <div className="text-xs text-red-600 mt-1">גרם</div>
            </div>

            {/* Carbs */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Wheat className="h-4 w-4 text-blue-600" />
                <div className="text-xs font-semibold text-blue-700">פחמימות</div>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {nutritionTargets.carbs || '-'}
              </div>
              <div className="text-xs text-blue-600 mt-1">גרם</div>
            </div>

            {/* Fat */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-amber-600" />
                <div className="text-xs font-semibold text-amber-700">שומן</div>
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {nutritionTargets.fat || '-'}
              </div>
              <div className="text-xs text-amber-600 mt-1">גרם</div>
            </div>
          </div>

          {/* Additional Targets */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {nutritionTargets.fiber_min && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <div className="text-xs font-semibold text-green-700">סיבים (מינימום)</div>
                </div>
                <div className="text-xl font-bold text-green-900">
                  {nutritionTargets.fiber_min} גרם
                </div>
              </div>
            )}
            {nutritionTargets.water_min && (
              <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-cyan-600" />
                  <div className="text-xs font-semibold text-cyan-700">מים (מינימום)</div>
                </div>
                <div className="text-xl font-bold text-cyan-900">
                  {nutritionTargets.water_min} ליטר
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Goal Card */}
      {budget.steps_goal > 0 && (
        <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Footprints className="h-5 w-5 text-[#5B6FB9]" />
              יעד צעדים יומי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-purple-700 mb-1">יעד יומי</div>
                  <div className="text-3xl font-bold text-purple-900">
                    {budget.steps_goal.toLocaleString()}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">צעדים</div>
                </div>
                <Footprints className="h-12 w-12 text-purple-400 opacity-50" />
              </div>
              {budget.steps_instructions && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm text-purple-800 leading-relaxed" dir="rtl">
                    {budget.steps_instructions}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplements Card */}
      {supplements.length > 0 && (
        <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Pill className="h-5 w-5 text-[#5B6FB9]" />
              תוספי תזונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplements.map((supplement, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-emerald-900 mb-1">
                        {supplement.name}
                      </div>
                      {supplement.dosage && (
                        <div className="text-sm text-emerald-700 mb-1">
                          מינון: {supplement.dosage}
                        </div>
                      )}
                      {supplement.timing && (
                        <div className="text-sm text-emerald-600">
                          {supplement.timing}
                        </div>
                      )}
                    </div>
                    <Pill className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eating Guidelines Card */}
      {(budget.eating_order || budget.eating_rules) && (
        <Card className="rounded-3xl border-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-[#5B6FB9]" />
              הנחיות אכילה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budget.eating_order && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                <div className="text-sm font-semibold text-indigo-900 mb-2">סדר אכילה מומלץ</div>
                <p className="text-sm text-indigo-800 leading-relaxed" dir="rtl">
                  {budget.eating_order}
                </p>
              </div>
            )}
            {budget.eating_rules && (
              <div className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl border border-violet-200">
                <div className="text-sm font-semibold text-violet-900 mb-2">כללי אכילה</div>
                <p className="text-sm text-violet-800 leading-relaxed" dir="rtl">
                  {budget.eating_rules}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

