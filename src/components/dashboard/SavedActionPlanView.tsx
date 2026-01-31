/**
 * SavedActionPlanView Component
 * 
 * Read-only view of a saved action plan with all sections displayed
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSavedActionPlan } from '@/hooks/useSavedActionPlans';
import { Loader2, X, Dumbbell, Heart, Zap, Apple, Pill, Footprints, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface SavedActionPlanViewProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SavedActionPlanView = ({ planId, isOpen, onClose }: SavedActionPlanViewProps) => {
  const { data: plan, isLoading } = useSavedActionPlan(planId);

  if (!isOpen) return null;

  const snapshot = plan?.snapshot || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent 
        className="!max-w-6xl w-[95vw] !max-h-[85vh] flex flex-col p-0 overflow-hidden" 
        dir="rtl"
      >
        <DialogHeader className="px-5 py-4 border-b border-slate-200 flex-shrink-0 bg-slate-50">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
              {plan?.name || 'תכנית פעולה שמורה'}
            </DialogTitle>
            {plan?.saved_at && (
              <p className="text-sm text-slate-500 mt-1">
                נשמר ב-{format(new Date(plan.saved_at), 'dd/MM/yyyy HH:mm', { locale: he })}
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-base text-slate-600">טוען נתונים...</p>
              </div>
            </div>
          ) : !plan ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-base font-semibold text-slate-700 mb-1">תכנית פעולה לא נמצאה</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-base h-full overflow-y-auto font-sans" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {/* Description */}
              {snapshot.description && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-slate-600 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">תיאור</h3>
                  </div>
                  <p className="text-base text-slate-700 leading-relaxed">{snapshot.description}</p>
                </div>
              )}

              {/* Training Plan */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-blue-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">תוכנית אימונים</h3>
                </div>
                {snapshot.workout_template || snapshot.workout_template_id ? (
                  <div className="space-y-2">
                    {snapshot.workout_template && (
                      <>
                        <div>
                          <span className="text-sm font-semibold text-slate-500">שם: </span>
                          <span className="text-base font-semibold text-slate-900">{snapshot.workout_template.name}</span>
                        </div>
                        {snapshot.workout_template.description && (
                          <div>
                            <span className="text-sm font-semibold text-slate-500">תיאור: </span>
                            <span className="text-base text-slate-700">{snapshot.workout_template.description}</span>
                          </div>
                        )}
                        {snapshot.workout_template.routine_data?.weeklyWorkout?.days && (
                          <div>
                            <span className="text-sm font-semibold text-slate-500 block mb-1.5">לוח זמנים שבועי:</span>
                            <div className="space-y-1.5">
                              {(() => {
                                const days = snapshot.workout_template.routine_data.weeklyWorkout.days;
                                const dayLabels: Record<string, string> = {
                                  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי',
                                  thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
                                };
                                const activeDays = Object.keys(days).filter(day =>
                                  days[day]?.isActive && days[day]?.exercises?.length > 0
                                ).map(day => {
                                  const dayData = days[day];
                                  const dayName = dayLabels[day] || day;
                                  const exercises = dayData.exercises || [];
                                  const exerciseNames = exercises.map((ex: any) => ex.name || ex.exercise_name || 'תרגיל').filter(Boolean);
                                  return { dayName, exerciseNames };
                                });

                                if (activeDays.length === 0) {
                                  return <p className="text-base text-slate-500">אין ימים פעילים</p>;
                                }

                                return activeDays.map(({ dayName, exerciseNames }, idx) => (
                                  <div key={idx} className="text-base text-slate-700">
                                    <span className="font-semibold">{dayName}:</span>
                                    <span className="mr-1"> {exerciseNames.join(', ')}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {!snapshot.workout_template && snapshot.workout_template_id && (
                      <p className="text-base text-slate-700">תכנית אימונים (מזהה: {snapshot.workout_template_id})</p>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין תוכנית אימונים</p>
                )}
              </div>

              {/* Cardio */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-red-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">אימון אירובי</h3>
                </div>
                {snapshot.cardio_training && Array.isArray(snapshot.cardio_training) && snapshot.cardio_training.length > 0 ? (
                  <div className="space-y-1.5">
                    {snapshot.cardio_training.map((cardio: any, idx: number) => (
                      <div key={idx} className="text-base text-slate-700">
                        <span className="font-semibold">{cardio.name || 'אירובי'}</span>
                        {cardio.duration_minutes && <span className="mr-1"> • {cardio.duration_minutes} דקות</span>}
                        {cardio.period_type && <span className="mr-1"> • {cardio.period_type}</span>}
                        {cardio.notes && <span className="mr-1"> • ({cardio.notes})</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין אימונים אירוביים</p>
                )}
              </div>

              {/* Intervals */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">אימון אינטרוולים</h3>
                </div>
                {snapshot.interval_training && Array.isArray(snapshot.interval_training) && snapshot.interval_training.length > 0 ? (
                  <div className="space-y-1.5">
                    {snapshot.interval_training.map((interval: any, idx: number) => (
                      <div key={idx} className="text-base text-slate-700">
                        <span className="font-semibold">{interval.activity_type || interval.name || 'אינטרוול'}</span>
                        {interval.activity_duration_seconds && (
                          <span className="mr-1"> • {interval.activity_duration_seconds} שניות פעילות</span>
                        )}
                        {interval.rest_duration_seconds && (
                          <span className="mr-1"> • {interval.rest_duration_seconds} שניות מנוחה</span>
                        )}
                        {interval.sets && <span className="mr-1"> • {interval.sets} סטים</span>}
                        {interval.workouts_per_week && (
                          <span className="mr-1"> • {interval.workouts_per_week} פעמים בשבוע</span>
                        )}
                        {interval.notes && <span className="mr-1"> • ({interval.notes})</span>}
                        {/* Backward compatibility: support old format */}
                        {!interval.activity_type && interval.duration_minutes && (
                          <span className="mr-1"> • {interval.duration_minutes} דקות</span>
                        )}
                        {!interval.activity_type && interval.period_type && (
                          <span className="mr-1"> • {interval.period_type}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין אימוני אינטרוולים</p>
                )}
              </div>

              {/* Nutrition */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Apple className="h-4 w-4 text-green-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">תזונה</h3>
                </div>
                {snapshot.nutrition_targets || snapshot.nutrition_template ? (
                  <div className="space-y-1.5">
                    {snapshot.nutrition_template && (
                      <div className="text-base">
                        <span className="text-sm font-semibold text-slate-500">תבנית: </span>
                        <span className="font-semibold text-slate-900">{snapshot.nutrition_template.name}</span>
                      </div>
                    )}
                    <div className="text-base text-slate-700">
                      {[
                        snapshot.nutrition_targets?.calories && `${snapshot.nutrition_targets.calories} קק"ל`,
                        snapshot.nutrition_targets?.protein && `${snapshot.nutrition_targets.protein} גרם חלבון`,
                        snapshot.nutrition_targets?.carbs && `${snapshot.nutrition_targets.carbs} גרם פחמימה`,
                        snapshot.nutrition_targets?.fat && `${snapshot.nutrition_targets.fat} גרם שומן`
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין יעדי תזונה</p>
                )}
              </div>

              {/* Supplements */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-purple-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">תוספים</h3>
                </div>
                {snapshot.supplements && Array.isArray(snapshot.supplements) && snapshot.supplements.length > 0 ? (
                  <div className="space-y-1.5">
                    {snapshot.supplements.map((supplement: any, idx: number) => {
                      // Handle both object format {name, dosage, timing} and string format
                      const name = typeof supplement === 'string' ? supplement : (supplement.name || '—');
                      const dosage = typeof supplement === 'object' ? supplement.dosage : null;
                      const timing = typeof supplement === 'object' ? supplement.timing : null;
                      
                      return (
                        <div key={idx} className="text-base text-slate-700">
                          <span className="font-semibold">{name}</span>
                          {dosage && <span className="mr-1"> • מינון: {dosage}</span>}
                          {timing && <span className="mr-1"> • זמן: {timing}</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין תוספים</p>
                )}
              </div>

              {/* Eating Guidelines */}
              {(snapshot.eating_order || snapshot.eating_rules) && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-slate-600 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">הנחיות אכילה</h3>
                  </div>
                  <div className="space-y-1.5">
                    {snapshot.eating_order && (
                      <div className="text-base text-slate-700">
                        <span className="text-sm font-semibold text-slate-500">סדר אכילה: </span>
                        <span>{snapshot.eating_order}</span>
                      </div>
                    )}
                    {snapshot.eating_rules && (
                      <div className="text-base text-slate-700">
                        <span className="text-sm font-semibold text-slate-500">כללי אכילה: </span>
                        <span>{snapshot.eating_rules}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Steps Goal */}
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200 shadow-sm col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="h-4 w-4 text-cyan-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">יעד צעדים</h3>
                </div>
                {snapshot.steps_goal || snapshot.steps_min || snapshot.steps_max ? (
                  <div className="space-y-1.5">
                    <div className="text-base text-slate-700">
                      {snapshot.steps_min && snapshot.steps_max ? (
                        <span className="font-semibold">
                          {snapshot.steps_min.toLocaleString()} - {snapshot.steps_max.toLocaleString()} צעדים
                        </span>
                      ) : snapshot.steps_min ? (
                        <span className="font-semibold">
                          מינימום: {snapshot.steps_min.toLocaleString()} צעדים
                        </span>
                      ) : snapshot.steps_max ? (
                        <span className="font-semibold">
                          מקסימום: {snapshot.steps_max.toLocaleString()} צעדים
                        </span>
                      ) : snapshot.steps_goal ? (
                        <span className="font-semibold">
                          {snapshot.steps_goal.toLocaleString()} צעדים
                        </span>
                      ) : null}
                    </div>
                    {snapshot.steps_instructions && (
                      <div className="text-base text-slate-600">
                        <span className="text-sm font-semibold text-slate-500">הוראות: </span>
                        <span>{snapshot.steps_instructions}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-slate-500">אין יעד צעדים</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
