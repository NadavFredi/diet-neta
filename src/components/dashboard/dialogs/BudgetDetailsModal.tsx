/**
 * BudgetDetailsModal Component
 * 
 * High-Density Professional Dashboard "Command Center" View
 * Compact, data-dense layout optimized for quick information scanning
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBudgetDetails } from '@/hooks/useBudgetDetails';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Target, 
  Pill, 
  UtensilsCrossed, 
  Dumbbell, 
  FileText, 
  Loader2,
  X,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string | null;
}

export const BudgetDetailsModal = ({
  isOpen,
  onOpenChange,
  budgetId,
}: BudgetDetailsModalProps) => {
  const { budget, nutritionTemplate, workoutTemplate, clientName, assignedDate, isLoading } = useBudgetDetails(budgetId);

  if (!isOpen || !budgetId) return null;

  // Helper component for compact metric display
  const MetricCard = ({ label, value, icon: Icon, iconColor = "text-blue-600" }: { 
    label: string; 
    value: string | number | null; 
    icon?: React.ElementType;
    iconColor?: string;
  }) => (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1.5 mb-1 justify-center">
        {Icon && <Icon className={cn("h-3 w-3", iconColor)} />}
        <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide">{label}</span>
      </div>
      <span className="text-base font-semibold text-slate-900">{value !== null && value !== undefined ? value : '—'}</span>
    </div>
  );

  // Helper component for compact field display
  const CompactField = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className="flex flex-col items-start text-right">
      <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value !== null && value !== undefined ? value : '—'}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-5xl w-[95vw] max-h-[80vh] flex flex-col p-0 overflow-hidden" 
        dir="rtl"
      >
        <DialogHeader className="px-4 py-3 border-b border-slate-200 flex-shrink-0 bg-slate-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">תצוגה מהירה - פרטי תקציב</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content - Fixed height with custom scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          <style>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-600">טוען נתונים...</p>
              </div>
            </div>
          ) : !budget ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-1">תקציב לא נמצא</p>
                <p className="text-xs text-slate-600">התקציב המבוקש לא קיים או שאין לך הרשאה לצפות בו</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-full mx-auto">
              <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3 w-full">
                {/* Section 1: Nutritional Summary - Macros in Horizontal Row */}
                <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-100">
                        <UtensilsCrossed className="h-3 w-3 text-blue-600" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">יעדי מקרו-נוטריאנטים</h3>
                    </div>
                    
                    {/* Macros in Single Horizontal Row - Centered */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <MetricCard 
                        label="קלוריות" 
                        value={budget.nutrition_targets?.calories || nutritionTemplate?.targets?.calories || null}
                      />
                      <Separator orientation="vertical" className="h-8" />
                      <MetricCard 
                        label="חלבון (גרם)" 
                        value={budget.nutrition_targets?.protein || nutritionTemplate?.targets?.protein || null}
                      />
                      <Separator orientation="vertical" className="h-8" />
                      <MetricCard 
                        label="פחמימות (גרם)" 
                        value={budget.nutrition_targets?.carbs || nutritionTemplate?.targets?.carbs || null}
                      />
                      <Separator orientation="vertical" className="h-8" />
                      <MetricCard 
                        label="שומן (גרם)" 
                        value={budget.nutrition_targets?.fat || nutritionTemplate?.targets?.fat || null}
                      />
                      <Separator orientation="vertical" className="h-8" />
                      <MetricCard 
                        label="סיבים (גרם)" 
                        value={budget.nutrition_targets?.fiber_min || nutritionTemplate?.targets?.fiber || null}
                      />
                    </div>

                    {/* Supplements - Compact List */}
                    {budget.supplements && budget.supplements.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Pill className="h-3 w-3 text-slate-600" />
                          <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wide">תוספים</h4>
                        </div>
                        <div className="space-y-1.5">
                          {budget.supplements.map((supplement: any, idx: number) => (
                            <div key={idx} className="text-xs bg-slate-50 rounded-md px-2 py-1.5 border border-slate-200">
                              <span className="font-semibold text-slate-900">{supplement.name || supplement}</span>
                              {supplement.dosage && (
                                <span className="text-slate-700 mr-1.5"> - {supplement.dosage}</span>
                              )}
                              {supplement.timing && (
                                <span className="text-slate-600 text-[10px] block mt-0.5">{supplement.timing}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Steps Goal */}
                    {budget.steps_goal && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="h-3 w-3 text-slate-600" />
                          <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wide">יעד צעדים יומי</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">{budget.steps_goal.toLocaleString()}</span>
                        </div>
                        {budget.steps_instructions && (
                          <div className="mt-2 max-h-20 overflow-y-auto text-xs text-slate-600 bg-slate-50 rounded-md px-2 py-1.5 border border-slate-200">
                            {budget.steps_instructions}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 2: Detailed Nutrition Plan */}
                {nutritionTemplate ? (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-100">
                          <UtensilsCrossed className="h-3 w-3 text-blue-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תוכנית תזונה מפורטת</h3>
                      </div>
                      <div className="space-y-2">
                        <CompactField 
                          label="שם התבנית" 
                          value={nutritionTemplate.name}
                        />
                        {nutritionTemplate.description && (
                          <div className="mt-2">
                            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-1">תיאור</span>
                            <p className="text-xs font-semibold text-slate-900">{nutritionTemplate.description}</p>
                          </div>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                            אין נתונים מפורטים זמינים
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <UtensilsCrossed className="h-3 w-3 text-slate-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תוכנית תזונה מפורטת</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                        אין תכנית תזונה
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Section 3: Detailed Workout Plan */}
                {workoutTemplate ? (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-green-100">
                          <Dumbbell className="h-3 w-3 text-green-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תוכנית אימונים מפורטת</h3>
                      </div>
                      <div className="space-y-2 mb-3">
                        <CompactField 
                          label="שם התבנית" 
                          value={workoutTemplate.name}
                        />
                        {workoutTemplate.description && (
                          <div className="mt-2">
                            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-1">תיאור</span>
                            <p className="text-xs font-semibold text-slate-900">{workoutTemplate.description}</p>
                          </div>
                        )}
                        {workoutTemplate.goal_tags && workoutTemplate.goal_tags.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-1.5">תגיות מטרה</span>
                            <div className="flex flex-wrap gap-1.5">
                              {workoutTemplate.goal_tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] px-1.5 py-0.5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Weekly Schedule - 7-Day Grid - Centered */}
                      {workoutTemplate.routine_data?.weeklyWorkout ? (
                        <div className="mt-3 pt-3 border-t border-slate-100 w-full">
                          <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wide mb-2 text-right">לוח זמנים שבועי</h4>
                          {workoutTemplate.routine_data.weeklyWorkout.generalGoals && (
                            <div className="mb-2 p-2 bg-slate-50 rounded-md border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">מטרות כלליות</span>
                              <p className="text-xs font-semibold text-slate-900">{workoutTemplate.routine_data.weeklyWorkout.generalGoals}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-7 gap-2 justify-items-center w-full">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((dayKey) => {
                              const dayData = workoutTemplate.routine_data?.weeklyWorkout?.days?.[dayKey];
                              const dayLabels: Record<string, string> = {
                                sunday: 'א',
                                monday: 'ב',
                                tuesday: 'ג',
                                wednesday: 'ד',
                                thursday: 'ה',
                                friday: 'ו',
                                saturday: 'ש',
                              };
                              const isActive = dayData?.isActive && dayData?.exercises?.length > 0;
                              
                              return (
                                <div
                                  key={dayKey}
                                  className={cn(
                                    "rounded-md p-2 border text-center cursor-pointer transition-colors w-full",
                                    isActive
                                      ? "bg-green-50 border-green-200 hover:bg-green-100"
                                      : "bg-slate-50 border-slate-200"
                                  )}
                                  title={isActive ? `${dayLabels[dayKey]}: ${dayData.exercises.length} תרגילים` : `${dayLabels[dayKey]}: אין אימון`}
                                >
                                  <div className="text-[10px] font-bold text-slate-700 mb-1">{dayLabels[dayKey]}</div>
                                  {isActive ? (
                                    <div className="text-[9px] text-green-700 font-semibold">
                                      {dayData.exercises.length} תרגילים
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-slate-400">—</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300 mt-2">
                          אין לוח זמנים זמין
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <Dumbbell className="h-3 w-3 text-slate-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תוכנית אימונים מפורטת</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                        אין תכנית אימונים
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-3 w-full">

                {/* Section 4: Instructions - Compact Scrollable */}
                {(budget.eating_order || budget.eating_rules) && (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <FileText className="h-3 w-3 text-slate-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">הנחיות מקצועיות</h3>
                      </div>
                      <div className="space-y-3">
                        {budget.eating_order && (
                          <div>
                            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-1.5">סדר אכילה</span>
                            <div className="max-h-32 overflow-y-auto text-xs font-semibold text-slate-900 whitespace-pre-line bg-slate-50 rounded-md px-2 py-2 border border-slate-200">
                              {budget.eating_order}
                            </div>
                          </div>
                        )}
                        {budget.eating_rules && (
                          <div>
                            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-1.5">כללי אכילה</span>
                            <div className="max-h-32 overflow-y-auto text-xs font-semibold text-slate-900 whitespace-pre-line bg-slate-50 rounded-md px-2 py-2 border border-slate-200">
                              {budget.eating_rules}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Info Section */}
                {budget.description && (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-100">
                          <FileText className="h-3 w-3 text-slate-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תיאור</h3>
                      </div>
                      <div className="max-h-24 overflow-y-auto text-xs font-semibold text-slate-900 bg-slate-50 rounded-md px-2 py-2 border border-slate-200">
                        {budget.description}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assigned Date if available */}
                {assignedDate && (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3 w-3 text-slate-600" />
                        <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide">תאריך הקצאה</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {format(new Date(assignedDate), 'dd/MM/yyyy', { locale: he })}
                      </span>
                    </CardContent>
                  </Card>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
