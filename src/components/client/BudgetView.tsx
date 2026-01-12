/**
 * Budget View Component
 * 
 * Compact, professional view-only display of active budget for client portal.
 * Optimized for minimal scrolling with high-density layout.
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
      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            אין תקציב פעיל
          </p>
          <p className="text-xs text-gray-400">
            המאמן שלך יוסיף תקציב בקרוב
          </p>
        </CardContent>
      </Card>
    );
  }

  const nutritionTargets = budget.nutrition_targets as any || {};
  const supplements = (budget.supplements || []) as any[];

  return (
    <div className="space-y-4">
      {/* Single Compact Card with All Information */}
      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-[#5B6FB9]" />
              {budget.name}
            </CardTitle>
            <Badge 
              variant="outline" 
              className="bg-slate-50 text-slate-600 border-slate-300 text-xs px-2 py-0.5"
            >
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(budgetAssignment.assigned_at), 'dd/MM/yyyy', { locale: he })}
            </Badge>
          </div>
          {budget.description && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed" dir="rtl">
              {budget.description}
            </p>
          )}
          {budgetAssignment.notes && (
            <p className="text-xs text-blue-600 mt-2" dir="rtl">
              {budgetAssignment.notes}
            </p>
          )}
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-4">
          {/* Nutrition Targets - Compact Grid */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-[#5B6FB9]" />
              יעדי תזונה
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {nutritionTargets.calories && (
                <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-[10px] font-medium text-orange-700 mb-0.5">קלוריות</div>
                  <div className="text-base font-bold text-orange-900">{nutritionTargets.calories}</div>
                  <div className="text-[9px] text-orange-600">קק"ל</div>
                </div>
              )}
              {nutritionTargets.protein && (
                <div className="p-2.5 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-[10px] font-medium text-red-700 mb-0.5">חלבון</div>
                  <div className="text-base font-bold text-red-900">{nutritionTargets.protein}</div>
                  <div className="text-[9px] text-red-600">גרם</div>
                </div>
              )}
              {nutritionTargets.carbs && (
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-[10px] font-medium text-blue-700 mb-0.5">פחמימות</div>
                  <div className="text-base font-bold text-blue-900">{nutritionTargets.carbs}</div>
                  <div className="text-[9px] text-blue-600">גרם</div>
                </div>
              )}
              {nutritionTargets.fat && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-[10px] font-medium text-amber-700 mb-0.5">שומן</div>
                  <div className="text-base font-bold text-amber-900">{nutritionTargets.fat}</div>
                  <div className="text-[9px] text-amber-600">גרם</div>
                </div>
              )}
              {nutritionTargets.fiber_min && (
                <div className="p-2.5 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-[10px] font-medium text-green-700 mb-0.5">סיבים</div>
                  <div className="text-base font-bold text-green-900">{nutritionTargets.fiber_min}</div>
                  <div className="text-[9px] text-green-600">גרם</div>
                </div>
              )}
              {nutritionTargets.water_min && (
                <div className="p-2.5 bg-cyan-50 rounded-lg border border-cyan-200">
                  <div className="text-[10px] font-medium text-cyan-700 mb-0.5">מים</div>
                  <div className="text-base font-bold text-cyan-900">{nutritionTargets.water_min}</div>
                  <div className="text-[9px] text-cyan-600">ליטר</div>
                </div>
              )}
            </div>
          </div>

          {/* Steps Goal - Inline with Supplements */}
          {budget.steps_goal > 0 && (
            <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 min-w-[140px]">
                <Footprints className="h-4 w-4 text-[#5B6FB9] flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-600">יעד צעדים</div>
                  <div className="text-base font-bold text-slate-900">{budget.steps_goal.toLocaleString()}</div>
                </div>
              </div>
              {budget.steps_instructions && (
                <div className="flex-1 text-xs text-slate-600 leading-relaxed" dir="rtl">
                  {budget.steps_instructions}
                </div>
              )}
            </div>
          )}

          {/* Supplements and Eating Guidelines - Side by Side */}
          {(supplements.length > 0 || budget.eating_order || budget.eating_rules) && (
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplements - Compact List */}
                {supplements.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Pill className="h-4 w-4 text-[#5B6FB9]" />
                      תוספי תזונה
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {supplements.map((supplement, index) => (
                        <div
                          key={index}
                          className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-emerald-900 mb-0.5">
                                {supplement.name}
                              </div>
                              {supplement.dosage && (
                                <div className="text-[10px] text-emerald-700 mb-0.5">
                                  {supplement.dosage}
                                </div>
                              )}
                              {supplement.timing && (
                                <div className="text-[10px] text-emerald-600">
                                  {supplement.timing}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eating Guidelines - Compact */}
                {(budget.eating_order || budget.eating_rules) && (
                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                      <UtensilsCrossed className="h-4 w-4 text-[#5B6FB9]" />
                      הנחיות אכילה
                    </div>
                    <div className="space-y-2">
                      {budget.eating_order && (
                        <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="text-[10px] font-semibold text-indigo-900 mb-1">סדר אכילה מומלץ</div>
                          <p className="text-xs text-indigo-800 leading-relaxed" dir="rtl">
                            {budget.eating_order}
                          </p>
                        </div>
                      )}
                      {budget.eating_rules && (
                        <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-200">
                          <div className="text-[10px] font-semibold text-violet-900 mb-1">כללי אכילה</div>
                          <p className="text-xs text-violet-800 leading-relaxed" dir="rtl">
                            {budget.eating_rules}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

