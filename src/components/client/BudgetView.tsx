/**
 * Budget View Component
 * 
 * Compact, professional view-only display of active budget for client portal.
 * Optimized for minimal scrolling with high-density layout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useActiveBudgetForLead, useActiveBudgetForCustomer, useActiveBudgetForCustomerOrLeads, useBudget } from '@/hooks/useBudgets';
import { useSupplementTemplates } from '@/hooks/useSupplementTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkoutPlanCard } from '@/components/dashboard/WorkoutPlanCard';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { useSupplementPlan } from '@/hooks/useSupplementPlan';
import { usePlansHistory } from '@/hooks/usePlansHistory';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { useNavigate } from 'react-router-dom';
import { useNutritionTemplate } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { supabase } from '@/lib/supabaseClient';
import { BudgetPrintContent } from '@/components/dashboard/BudgetPrintContent';
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
  Dumbbell,
  ListOrdered,
  ScrollText,
  Link as LinkIcon,
  Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface BudgetViewProps {
  leadId?: string | null;
  customerId?: string | null;
  leadIds?: string[]; // Array of all lead IDs for this customer
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  leadId,
  customerId,
  leadIds = [],
}) => {
  const navigate = useNavigate();

  // Fetch active budget - check specific lead first, then customer and all leads
  const { data: leadBudget } = useActiveBudgetForLead(leadId || null);
  const { data: customerOrLeadsBudget } = useActiveBudgetForCustomerOrLeads(customerId || null, leadIds);
  
  // Priority: specific leadBudget > customerOrLeadsBudget
  const budgetAssignment = leadBudget || customerOrLeadsBudget;
  const budget = budgetAssignment?.budget;

  // Fetch full budget data for print content
  const { data: fullBudget } = useBudget(budget?.id || null);
  
  // Fetch templates
  const { data: nutritionTemplate } = useNutritionTemplate(
    fullBudget?.nutrition_template_id || null
  );
  const { data: workoutTemplate } = useWorkoutTemplate(
    fullBudget?.workout_template_id || null
  );

  // Fetch workout plan for customer
  const { workoutPlan, isLoading: isLoadingWorkoutPlan } = useWorkoutPlan(customerId || null);

  // Fetch nutrition plan for customer
  const { nutritionPlan, isLoading: isLoadingNutritionPlan } = useNutritionPlan(customerId || null);
  
  // State for workout plan and client info for print content
  const [workoutPlanForPrint, setWorkoutPlanForPrint] = useState<any>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  
  // Fetch workout plan associated with budget if no template exists
  useEffect(() => {
    const fetchWorkoutPlanForPrint = async () => {
      if (!fullBudget?.id || workoutTemplate) {
        setWorkoutPlanForPrint(null);
        return;
      }

      try {
        let query = supabase
          .from('workout_plans')
          .select('*')
          .eq('budget_id', fullBudget.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (customerId) {
          query = query.eq('customer_id', customerId);
        } else if (leadId) {
          query = query.eq('lead_id', leadId);
        }

        const { data: plans } = await query.maybeSingle();
        if (plans) {
          setWorkoutPlanForPrint(plans);
        }
      } catch (error) {
        console.error('Error fetching workout plan for print:', error);
      }
    };

    fetchWorkoutPlanForPrint();
  }, [fullBudget?.id, workoutTemplate, customerId, leadId]);
  
  // Set client name
  useEffect(() => {
    if (customerId) {
      supabase
        .from('customers')
        .select('full_name')
        .eq('id', customerId)
        .single()
        .then(({ data }) => {
          if (data) {
            setClientName(data.full_name);
          }
        });
    }
  }, [customerId]);
  
  // Determine which workout data to use: template or plan
  const workoutData = workoutTemplate 
    ? {
        name: workoutTemplate.name,
        description: workoutTemplate.description,
        goal_tags: workoutTemplate.goal_tags,
        weeklyWorkout: workoutTemplate.routine_data?.weeklyWorkout,
      }
    : workoutPlanForPrint
    ? {
        name: workoutPlanForPrint.name || 'תוכנית אימונים',
        description: workoutPlanForPrint.description,
        goal_tags: [],
        weeklyWorkout: workoutPlanForPrint.custom_attributes?.data?.weeklyWorkout,
      }
    : null;

  // Fetch supplement plan for customer
  const { supplementPlan } = useSupplementPlan(customerId || null);
  
  // Fetch supplement templates to use as fallback for links
  const { data: supplementTemplatesData } = useSupplementTemplates();
  const supplementTemplates = supplementTemplatesData?.data || [];

  // Fetch plans history to get the latest steps goal and other live data
  const { data: plansHistory } = usePlansHistory(customerId || undefined, leadId || undefined);
  const activeSteps = plansHistory?.stepsHistory?.find(s => s.is_active) || plansHistory?.stepsHistory?.[0];

  // Create a map of supplement names to links from templates for fallback
  const supplementLinksMap = useMemo(() => {
    const map = new Map<string, { link1?: string; link2?: string }>();
    if (!supplementTemplates || supplementTemplates.length === 0) return map;
    
    supplementTemplates.forEach(template => {
      (template.supplements || []).forEach(sup => {
        if (sup.name && (sup.link1 || sup.link2)) {
          // Only add if not already in map or if current entry has more links
          const existing = map.get(sup.name);
          if (!existing || (!existing.link1 && sup.link1) || (!existing.link2 && sup.link2)) {
            map.set(sup.name, { 
              link1: sup.link1 || existing?.link1, 
              link2: sup.link2 || existing?.link2 
            });
          }
        }
      });
    });
    return map;
  }, [supplementTemplates]);

  // Priority for steps: use values from steps_plans table (active live data)
  // Fall back to budget object if plan table is missing
  const stepsGoal = activeSteps?.target || budget?.steps_goal;
  const stepsInstructions = activeSteps?.stepsInstructions || budget?.steps_instructions;

  if (!budgetAssignment || !budget) {
    return (
      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            אין תכנית פעולה פעילה
          </p>
          <p className="text-xs text-gray-400">
            המאמן שלך יוסיף תכנית פעולה בקרוב
          </p>
        </CardContent>
      </Card>
    );
  }

  // Priority: use values from specific plan tables (active live data)
  // Fall back to budget object if plan tables are missing
  const nutritionTargets = (nutritionPlan?.targets && Object.keys(nutritionPlan.targets).length > 0 && nutritionPlan.targets.calories > 0)
    ? nutritionPlan.targets
    : (budget.nutrition_targets as any || {});
    
  const fiberValue = nutritionTargets.fiber_min || nutritionTargets.fiber;
  
  const supplements = (supplementPlan?.supplements && supplementPlan.supplements.length > 0)
    ? supplementPlan.supplements
    : ((budget.supplements || []) as any[]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print Button - Only visible on screen */}
      {fullBudget && (
        <div className="print:hidden fixed bottom-6 left-6 z-50">
          <Button
            onClick={handlePrint}
            size="lg"
            className="text-white shadow-lg hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: "#5B6FB9",
            }}
          >
            <Printer className="h-5 w-5 mr-2" />
            הדפס עכשיו
          </Button>
        </div>
      )}

      {/* Use BudgetPrintContent component directly */}
      {fullBudget && (
        <div className="budget-print-content">
          <BudgetPrintContent
            budget={fullBudget}
            nutritionTemplate={nutritionTemplate}
            workoutTemplate={workoutTemplate}
            workoutPlan={workoutPlanForPrint}
            workoutData={workoutData}
            clientName={clientName}
            assignedDate={budgetAssignment?.assigned_at || null}
          />
        </div>
      )}
      
      {/* Legacy content - Hidden for now */}
      <div className="hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nutrition Targets - Left Side */}
            <div>
              {nutritionPlan ? (
                <NutritionPlanCard
                  nutritionPlan={nutritionPlan}
                  isEditable={false}
                />
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-[#5B6FB9]" />
                    יעדי תזונה
                  </div>
                  <div className="grid grid-cols-3 gap-2">
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
                    {fiberValue && (
                      <div className="p-2.5 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-[10px] font-medium text-green-700 mb-0.5">סיבים</div>
                        <div className="text-base font-bold text-green-900">{fiberValue}</div>
                        <div className="text-[9px] text-green-600">גרם</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Supplements - Right Side */}
            {supplements.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-[#5B6FB9]" />
                  תוספי תזונה
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {supplements.map((supplement, index) => {
                    // Fallback links from templates if missing in plan
                    const fallbackLinks = supplementLinksMap.get(supplement.name) || {};
                    const sLink1 = supplement.link1 || fallbackLinks.link1;
                    const sLink2 = supplement.link2 || fallbackLinks.link2;
                    
                    return (
                      <div
                        key={index}
                        className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200"
                      >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-emerald-900 mb-1">
                            {supplement.name}
                          </div>
                          {supplement.dosage && (
                            <div className="text-xs text-emerald-700 mb-1">
                              מינון: {supplement.dosage}
                            </div>
                          )}
                          {supplement.timing && (
                            <div className="text-xs text-emerald-600 mb-1">
                              מתי לקחת: {supplement.timing}
                            </div>
                          )}
                          {(sLink1 || sLink2) && (
                            <div className="mt-2 pt-2 border-t border-emerald-200/60 space-y-1.5">
                              {sLink1 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                                    <LinkIcon className="h-3 w-3" />
                                    קישור 1
                                  </div>
                                  <a
                                    href={sLink1}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                                    dir="ltr"
                                  >
                                    {sLink1}
                                  </a>
                                </div>
                              )}
                              {sLink2 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                                    <LinkIcon className="h-3 w-3" />
                                    קישור 2
                                  </div>
                                  <a
                                    href={sLink2}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                                    dir="ltr"
                                  >
                                    {sLink2}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Workout Plan Section */}
      {budget.workout_template_id && (
        <div className="space-y-4">
          {isLoadingWorkoutPlan ? (
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-gray-400 animate-pulse" />
                <p className="text-sm font-medium text-gray-500">טוען תוכנית אימונים...</p>
              </CardContent>
            </Card>
          ) : workoutPlan ? (
            <WorkoutPlanCard
              workoutPlan={workoutPlan}
              isEditable={false}
            />
          ) : (
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-500 mb-1">
                  אין תוכנית אימונים פעילה
                </p>
                <p className="text-xs text-gray-400">
                  תוכנית האימונים תוצג כאן כאשר תהיה זמינה
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          /* Hide all fixed/sticky elements (buttons, sidebars, etc.) */
          [class*="fixed"],
          [class*="sticky"],
          button,
          nav,
          aside,
          .print\\:hidden {
            display: none !important;
          }
          
          /* Hide everything by default, then show only budget print content */
          /* Use a more specific approach - hide parent containers */
          body > div:first-child {
            display: contents !important;
          }
          
          /* Show only the budget print content */
          .budget-print-content {
            display: block !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: auto !important;
          }
          
          /* Hide all siblings of budget-print-content */
          .budget-print-content ~ * {
            display: none !important;
          }
          
          /* Hide parent wrappers that don't contain budget-print-content */
          /* This targets the space-y-4 div and other wrappers */
          div.space-y-4 > *:not(.budget-print-content) {
            display: none !important;
          }
          
          /* Remove all margins and padding from body/html when printing */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure parent containers don't interfere */
          body > div,
          body > div > div {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:bg-gray-50 {
            background: #f9fafb !important;
          }
          
          .print\\:shadow-xl {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          }
          
          .print\\:rounded-xl {
            border-radius: 0.75rem !important;
          }
          
          .print\\:p-4 {
            padding: 1rem !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print-header-bg {
            background: #E96A8F !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve all colors and backgrounds */
          [class*="bg-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve borders */
          [class*="border"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Preserve text colors */
          [class*="text-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .print\\:break-inside-auto {
            break-inside: auto;
            page-break-inside: auto;
          }
          
          .print\\:break-after-avoid {
            break-after: avoid;
            page-break-after: avoid;
          }
          
          .print\\:break-after-auto {
            break-after: auto;
            page-break-after: auto;
          }
          
          .print\\:w-24 {
            width: 6rem !important;
          }
          
          .print\\:h-24 {
            height: 6rem !important;
          }
          
          /* Allow tables to break across pages but keep rows together */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          .page-number::after {
            content: counter(page);
          }
          
          /* Page counter setup */
          body {
            counter-reset: page;
          }
          
          @page {
            counter-increment: page;
          }
        }
      `}</style>
    </div>
  );
};

