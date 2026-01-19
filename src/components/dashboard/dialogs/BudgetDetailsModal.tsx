/**
 * BudgetDetailsModal Component
 * 
 * High-Density Professional Dashboard "Command Center" View
 * Compact, data-dense layout optimized for quick information scanning
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
  Clock,
  Image as ImageIcon,
  Video,
  PlayCircle,
  X
} from 'lucide-react';
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
  const [selectedDayData, setSelectedDayData] = useState<{ dayKey: string; dayLabel: string; exercises: any[] } | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  if (!isOpen || !budgetId) return null;

  // Helper component for compact metric display
  const MetricCard = ({ label, value, icon: Icon, iconColor = "text-blue-600" }: { 
    label: string; 
    value: string | number | null; 
    icon?: React.ElementType;
    iconColor?: string;
  }) => (
    <div className="flex flex-col items-center text-center w-full flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1 justify-center">
        {Icon && <Icon className={cn("h-3 w-3 flex-shrink-0", iconColor)} />}
        <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">{label}</span>
      </div>
      <span className="text-base font-semibold text-slate-900 break-words">{value !== null && value !== undefined ? value : '—'}</span>
    </div>
  );

  // Helper component for compact field display
  const CompactField = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className="flex flex-col items-start text-right w-full">
      <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value !== null && value !== undefined ? value : '—'}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="!max-w-5xl w-[90vw] max-w-[90vw] !max-h-[90vh] flex flex-col p-0 overflow-hidden" 
        dir="rtl"
      >
        <DialogHeader className="px-4 py-3 border-b border-slate-200 flex-shrink-0 bg-slate-50">
          <DialogTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">תצוגה מהירה - פרטי תקציב</DialogTitle>
        </DialogHeader>

        {/* Main Content - Fixed height with custom scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 w-full" style={{ maxHeight: 'calc(90vh - 80px)' }}>
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
            <div className="w-full max-w-full mx-0">
              <div className="space-y-4 w-full">
                {/* Section 1: Nutritional Summary - Macros in Horizontal Row (Full Width) */}
                <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                  <CardContent className="p-4 w-full">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-100">
                        <UtensilsCrossed className="h-3 w-3 text-blue-600" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">יעדי מקרו-נוטריאנטים</h3>
                    </div>
                    
                    {/* Macros in Single Horizontal Row - Full Width Distribution */}
                    <div className="grid grid-cols-5 gap-3 w-full">
                      <MetricCard 
                        label="קלוריות" 
                        value={budget.nutrition_targets?.calories || nutritionTemplate?.targets?.calories || null}
                      />
                      <MetricCard 
                        label="חלבון (גרם)" 
                        value={budget.nutrition_targets?.protein || nutritionTemplate?.targets?.protein || null}
                      />
                      <MetricCard 
                        label="פחמימות (גרם)" 
                        value={budget.nutrition_targets?.carbs || nutritionTemplate?.targets?.carbs || null}
                      />
                      <MetricCard 
                        label="שומן (גרם)" 
                        value={budget.nutrition_targets?.fat || nutritionTemplate?.targets?.fat || null}
                      />
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

                {/* 2-Column Layout for Plans and Details */}
                <div className="grid grid-cols-2 gap-4 w-full items-start">
                  {/* Left Column */}
                  <div className="space-y-3 w-full">
                    {/* Section 2: Detailed Nutrition Plan */}
                    {nutritionTemplate ? (
                      <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                        <CardContent className="p-4 w-full">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-100">
                              <UtensilsCrossed className="h-3 w-3 text-blue-600" />
                            </div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">תוכנית תזונה מפורטת</h3>
                          </div>
                          <div className="space-y-3">
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

                            {/* Detailed Targets */}
                            {nutritionTemplate.targets && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-2">יעדי מקרו-נוטריאנטים מפורטים</span>
                                <div className="grid grid-cols-2 gap-2">
                                  {nutritionTemplate.targets.calories && (
                                    <CompactField 
                                      label="קלוריות" 
                                      value={`${nutritionTemplate.targets.calories} קק"ל`}
                                    />
                                  )}
                                  {nutritionTemplate.targets.protein && (
                                    <CompactField 
                                      label="חלבון" 
                                      value={`${nutritionTemplate.targets.protein} גרם`}
                                    />
                                  )}
                                  {nutritionTemplate.targets.carbs && (
                                    <CompactField 
                                      label="פחמימות" 
                                      value={`${nutritionTemplate.targets.carbs} גרם`}
                                    />
                                  )}
                                  {nutritionTemplate.targets.fat && (
                                    <CompactField 
                                      label="שומן" 
                                      value={`${nutritionTemplate.targets.fat} גרם`}
                                    />
                                  )}
                                  {nutritionTemplate.targets.fiber && (
                                    <CompactField 
                                      label="סיבים" 
                                      value={`${nutritionTemplate.targets.fiber} גרם`}
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Activity Entries (METs) */}
                            {nutritionTemplate.activity_entries && Array.isArray(nutritionTemplate.activity_entries) && nutritionTemplate.activity_entries.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-2">פעילות גופנית (METS)</span>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                  {nutritionTemplate.activity_entries.map((activity: any, idx: number) => (
                                    <div key={activity.id || idx} className="text-xs bg-slate-50 rounded-md px-2 py-1.5 border border-slate-200">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-slate-900">{activity.activityType || 'פעילות'}</span>
                                        <div className="flex items-center gap-2 text-slate-600">
                                          {activity.mets && (
                                            <span className="text-[10px]">METS: {activity.mets}</span>
                                          )}
                                          {activity.minutesPerWeek && (
                                            <span className="text-[10px]">{activity.minutesPerWeek} דק'/שבוע</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Manual Fields */}
                            {nutritionTemplate.manual_fields && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-2">שדות ידניים</span>
                                <div className="space-y-1.5">
                                  {nutritionTemplate.manual_fields.steps && (
                                    <CompactField 
                                      label="יעד צעדים" 
                                      value={nutritionTemplate.manual_fields.steps.toLocaleString()}
                                    />
                                  )}
                                  {nutritionTemplate.manual_fields.workouts && (
                                    <div>
                                      <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">אימונים</span>
                                      <p className="text-xs font-semibold text-slate-900">{nutritionTemplate.manual_fields.workouts}</p>
                                    </div>
                                  )}
                                  {nutritionTemplate.manual_fields.supplements && (
                                    <div>
                                      <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">תוספים</span>
                                      <p className="text-xs font-semibold text-slate-900">{nutritionTemplate.manual_fields.supplements}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Manual Override Info */}
                            {nutritionTemplate.manual_override && Object.keys(nutritionTemplate.manual_override).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wide block mb-2">שדות שנעלו ידנית</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {nutritionTemplate.manual_override.calories && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                                      קלוריות
                                    </Badge>
                                  )}
                                  {nutritionTemplate.manual_override.protein && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                                      חלבון
                                    </Badge>
                                  )}
                                  {nutritionTemplate.manual_override.carbs && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                                      פחמימות
                                    </Badge>
                                  )}
                                  {nutritionTemplate.manual_override.fat && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                                      שומן
                                    </Badge>
                                  )}
                                  {nutritionTemplate.manual_override.fiber && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0.5">
                                      סיבים
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                        <CardContent className="p-4 w-full">
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

                    {/* Section 4: Instructions - Compact Scrollable */}
                    {(budget.eating_order || budget.eating_rules) && (
                      <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                        <CardContent className="p-4 w-full">
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
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3 w-full">
                    {/* Section 3: Detailed Workout Plan */}
                    {workoutTemplate ? (
                  <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                    <CardContent className="p-4 w-full">
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
                          <div className="grid grid-cols-7 gap-2 w-full">
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
                              
                              const handleDayClick = () => {
                                if (isActive && dayData?.exercises) {
                                  setSelectedDayData({
                                    dayKey,
                                    dayLabel: dayLabels[dayKey],
                                    exercises: dayData.exercises
                                  });
                                }
                              };
                              
                              return (
                                <button
                                  key={dayKey}
                                  type="button"
                                  onClick={handleDayClick}
                                  disabled={!isActive}
                                  className={cn(
                                    "rounded-md p-2 border text-center transition-colors w-full",
                                    isActive
                                      ? "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 cursor-pointer"
                                      : "bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
                                  )}
                                  title={isActive ? `${dayLabels[dayKey]}: ${dayData.exercises.length} תרגילים - לחץ לצפייה` : `${dayLabels[dayKey]}: אין אימון`}
                                >
                                  <div className="text-[10px] font-bold text-slate-700 mb-1">{dayLabels[dayKey]}</div>
                                  {isActive ? (
                                    <div className="text-[9px] text-green-700 font-semibold">
                                      {dayData.exercises.length} תרגילים
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-slate-400">—</div>
                                  )}
                                </button>
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
                    <CardContent className="p-4 w-full">
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

                    {/* Additional Info Section */}
                    {budget.description && (
                      <Card className="border border-slate-200 rounded-lg shadow-sm w-full">
                        <CardContent className="p-4 w-full">
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
                        <CardContent className="p-4 w-full">
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
            </div>
          )}
        </div>
      </DialogContent>

      {/* Day Exercises Popup Modal */}
      <Dialog 
        open={selectedDayData !== null} 
        onOpenChange={(open) => !open && setSelectedDayData(null)}
        modal={true}
      >
        <DialogContent 
          className="!max-w-3xl w-[90vw] max-w-[90vw] !max-h-[85vh] flex flex-col p-0 overflow-hidden" 
          dir="rtl"
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 flex-shrink-0 bg-slate-50">
            <DialogTitle className="text-lg font-bold text-slate-900">
              תרגילי יום {selectedDayData?.dayLabel} ({selectedDayData?.exercises.length || 0} תרגילים)
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 w-full" style={{ maxHeight: 'calc(85vh - 100px)' }}>
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
            
            {selectedDayData?.exercises && selectedDayData.exercises.length > 0 ? (
              <div className="space-y-3">
                {selectedDayData.exercises.map((exercise: any, index: number) => (
                  <Card key={exercise.id || index} className="border border-slate-200 rounded-lg shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-slate-900 mb-2">{exercise.name || `תרגיל ${index + 1}`}</h4>
                          <div className="flex items-center gap-4 text-sm">
                            {exercise.sets && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">סטים:</span>
                                <span className="text-slate-900 font-semibold">{exercise.sets}</span>
                              </div>
                            )}
                            {exercise.reps && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">חזרות:</span>
                                <span className="text-slate-900 font-semibold">{exercise.reps}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Media Icons */}
                        {(exercise.image_url || exercise.video_url) && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {exercise.image_url && (
                              <button
                                type="button"
                                onClick={() => setSelectedMediaUrl({ url: exercise.image_url, type: 'image' })}
                                className="p-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                title="צפה בתמונה"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </button>
                            )}
                            {exercise.video_url && (
                              <button
                                type="button"
                                onClick={() => setSelectedMediaUrl({ url: exercise.video_url, type: 'video' })}
                                className="p-2 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                                title="צפה בווידאו"
                              >
                                <PlayCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {exercise.notes && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-500 block mb-1">הערות:</span>
                          <p className="text-sm text-slate-900 whitespace-pre-line">{exercise.notes}</p>
                        </div>
                      )}

                      {/* Media Preview Thumbnails */}
                      {(exercise.image_url || exercise.video_url) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                          {exercise.image_url && (
                            <div className="relative group">
                              <img
                                src={exercise.image_url}
                                alt={`${exercise.name} - תמונה`}
                                className="h-16 w-16 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedMediaUrl({ url: exercise.image_url, type: 'image' })}
                              />
                            </div>
                          )}
                          {exercise.video_url && (
                            <div className="relative group">
                              <div
                                className="h-16 w-16 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
                                onClick={() => setSelectedMediaUrl({ url: exercise.video_url, type: 'video' })}
                              >
                                <PlayCircle className="h-6 w-6 text-slate-600" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Dumbbell className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">אין תרגילים ליום זה</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Full-Screen Modal */}
      <Dialog 
        open={selectedMediaUrl !== null} 
        onOpenChange={(open) => !open && setSelectedMediaUrl(null)}
        modal={true}
      >
        <DialogContent 
          className="!max-w-5xl w-[95vw] max-w-[95vw] !max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black/95" 
          dir="rtl"
        >
          <DialogHeader className="px-6 pt-4 pb-2 flex-shrink-0 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold text-white">
                {selectedMediaUrl?.type === 'image' ? 'תמונה' : 'וידאו'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMediaUrl(null)}
                className="text-white hover:bg-white/20 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            {selectedMediaUrl?.type === 'image' ? (
              <img
                src={selectedMediaUrl?.url || ''}
                alt="תמונה"
                className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg"
              />
            ) : selectedMediaUrl ? (
              <video
                src={selectedMediaUrl.url}
                controls
                className="max-w-full max-h-[calc(90vh-120px)] rounded-lg"
              >
                הדפדפן שלך לא תומך בתגית וידאו.
              </video>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
