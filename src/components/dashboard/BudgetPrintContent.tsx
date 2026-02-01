/**
 * BudgetPrintContent Component
 * 
 * Reusable component that displays budget details in a print-optimized format
 * Can be used both in PrintBudgetPage and embedded in other views
 */

import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Target, 
  Pill, 
  UtensilsCrossed, 
  Dumbbell, 
  FileText, 
  ArrowRight,
  Calendar,
  User,
  Zap,
  Heart
} from 'lucide-react';

interface BudgetPrintContentProps {
  budget: any;
  nutritionTemplate?: any;
  workoutTemplate?: any;
  workoutPlan?: any;
  workoutData?: any;
  clientName?: string | null;
  assignedDate?: string | null;
}

export const BudgetPrintContent: React.FC<BudgetPrintContentProps> = ({
  budget,
  nutritionTemplate,
  workoutTemplate,
  workoutPlan,
  workoutData,
  clientName,
  assignedDate,
}) => {
  const currentDate = format(new Date(), 'dd/MM/yyyy', { locale: he });
  const displayDate = assignedDate 
    ? format(new Date(assignedDate), 'dd/MM/yyyy', { locale: he })
    : currentDate;

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-4 print:bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white print:shadow-xl print:rounded-xl shadow-xl rounded-xl overflow-hidden">
        
        {/* Header */}
        <div className="text-white p-8 print:p-6 print-header-bg" style={{ backgroundColor: '#E96A8F' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src="https://dietneta.com/wp-content/uploads/2025/08/logo.svg" 
                  alt="DietNeta Logo" 
                  className="h-10 print:h-8 filter brightness-0 invert"
                />
              </div>
              <p className="text-purple-100 text-sm">תוכנית תזונה ואימונים מותאמת אישית</p>
            </div>
            <div className="text-left">
              {clientName && (
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-semibold">{clientName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-purple-100">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">תאריך הוצאה: {displayDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Name */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">{budget.name}</h2>
          {budget.description && (
            <p className="text-gray-600 mt-2">{budget.description}</p>
          )}
        </div>

        {/* Daily Targets Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-800">יעדים יומיים</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steps Goal */}
            {budget.steps_goal && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-800">יעד צעדים יומי</span>
                </div>
                {budget.steps_min && budget.steps_max ? (
                  <p className="text-2xl font-bold text-purple-900">
                    {budget.steps_min.toLocaleString()} - {budget.steps_max.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-purple-900">{budget.steps_goal.toLocaleString()}</p>
                )}
                {budget.steps_instructions && (
                  <p className="text-sm text-purple-700 mt-2">{budget.steps_instructions}</p>
                )}
              </div>
            )}

            {/* Supplements */}
            {budget.supplements && budget.supplements.length > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-pink-600" />
                  <span className="font-semibold text-pink-800">תוספים</span>
                </div>
                <div className="space-y-2">
                  {budget.supplements.map((supplement: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium text-pink-900">{supplement.name}</span>
                      {supplement.dosage && (
                        <span className="text-pink-700"> - {supplement.dosage}</span>
                      )}
                      {supplement.timing && (
                        <span className="text-pink-600 text-xs block mt-1">{supplement.timing}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nutrition Plan Section */}
        {(nutritionTemplate || budget.nutrition_targets) && (
          <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <UtensilsCrossed className="h-5 w-5 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-800">תוכנית תזונה</h3>
            </div>
            
            {nutritionTemplate && (
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">{nutritionTemplate.name}</p>
                {nutritionTemplate.description && (
                  <p className="text-sm text-gray-600 mb-4">{nutritionTemplate.description}</p>
                )}
              </div>
            )}

            {/* Nutrition Targets */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">יעדי מקרו-נוטריאנטים</h4>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-blue-600 mb-1">קלוריות</p>
                  <p className="text-lg font-bold text-blue-900">
                    {budget.nutrition_targets?.calories || nutritionTemplate?.targets?.calories || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">חלבון (גרם)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {budget.nutrition_targets?.protein || nutritionTemplate?.targets?.protein || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">פחמימות (גרם)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {budget.nutrition_targets?.carbs || nutritionTemplate?.targets?.carbs || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">שומן (גרם)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {budget.nutrition_targets?.fat || nutritionTemplate?.targets?.fat || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">סיבים (גרם)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {budget.nutrition_targets?.fiber_min || nutritionTemplate?.targets?.fiber || '—'}
                  </p>
                </div>
              </div>
            </div>
            {/* Nutrition Notes */}
            {nutritionTemplate?.nutrition_notes && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">הערות והנחיות תזונה</h4>
                <p className="text-sm text-blue-900 whitespace-pre-line">{nutritionTemplate.nutrition_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Training Plan Section */}
        {(workoutData || budget.workout_template_id || workoutPlan) && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4 print:break-after-avoid">
              <Dumbbell className="h-5 w-5 text-green-600" />
              <h3 className="text-xl font-bold text-gray-800">תוכנית אימונים</h3>
            </div>
            
            {workoutData ? (
              <>
                <div className="mb-4 print:break-after-avoid">
                  <p className="font-semibold text-gray-700 mb-2">{workoutData.name}</p>
                  {workoutData.description && (
                    <p className="text-sm text-gray-600 mb-4">{workoutData.description}</p>
                  )}
                  {workoutData.goal_tags && workoutData.goal_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {workoutData.goal_tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weekly Schedule */}
                {workoutData.weeklyWorkout ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">לוח זמנים שבועי</h4>
                {workoutData.weeklyWorkout.generalGoals && (
                  <p className="text-sm text-green-700 mb-3 bg-green-100 p-2 rounded">
                    <strong>מטרות כלליות:</strong> {workoutData.weeklyWorkout.generalGoals}
                  </p>
                )}
                <div className="space-y-4 text-sm">
                  {(() => {
                    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const days = workoutData.weeklyWorkout.days || {};
                    
                    // Sort days by the predefined order
                    const daysEntries = dayOrder
                      .map(dayKey => [dayKey, days[dayKey]] as [string, any])
                      .filter(([_, dayData]) => dayData); // Only include days that exist
                    
                    return daysEntries.map(([dayKey, dayData]: [string, any]) => {
                      // Show exercises if they exist, even if isActive is not explicitly true
                      if (!dayData || !dayData.exercises || dayData.exercises.length === 0) {
                        return null;
                      }
                    
                    const dayLabels: Record<string, string> = {
                      sunday: 'ראשון',
                      monday: 'שני',
                      tuesday: 'שלישי',
                      wednesday: 'רביעי',
                      thursday: 'חמישי',
                      friday: 'שישי',
                      saturday: 'שבת',
                    };
                    
                    return (
                      <div key={dayKey} className="bg-white rounded p-3 border border-green-200 print:break-inside-avoid print:break-after-auto">
                        <p className="font-semibold text-green-900 mb-3">{dayLabels[dayKey] || dayKey}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse print:break-inside-auto" dir="rtl">
                            <thead>
                              <tr className="border-b border-gray-300 bg-gray-50 print:break-inside-avoid">
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-40">תמונה</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-20">סטים</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-24">חזרות</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700">תרגיל</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-12">מס'</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayData.exercises.map((exercise: any, idx: number) => {
                                // Use the order field from the exercise if it exists and is not empty, 
                                // otherwise generate exercise identifier (A, B, C1, C2, etc.)
                                const getExerciseId = (index: number, order?: string): string => {
                                  if (order && order.trim()) {
                                    return order.trim();
                                  }
                                  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                  const letter = letters[Math.floor(index / 2)] || String.fromCharCode(65 + index);
                                  const subIndex = index % 2;
                                  return subIndex === 0 ? letter : `${letter}${subIndex + 1}`;
                                };
                                
                                const exerciseId = getExerciseId(idx, exercise.order);
                                
                                // Normalize image_url and video_url - handle both empty strings and null/undefined
                                const imageUrl = exercise.image_url && exercise.image_url.trim() ? exercise.image_url.trim() : null;
                                const videoUrl = exercise.video_url && exercise.video_url.trim() ? exercise.video_url.trim() : null;
                                
                                return (
                                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent print:break-inside-avoid">
                                    <td className="p-4 text-center">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={exercise.name || 'תרגיל'}
                                          className="w-32 h-32 object-cover mx-auto border border-gray-300 rounded print:w-24 print:h-24"
                                          onError={(e) => {
                                            // Fallback if image fails to load - hide the broken image
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-32 h-32 bg-gray-100 border border-gray-300 rounded mx-auto flex items-center justify-center print:w-24 print:h-24">
                                          <span className="text-sm text-gray-400">אין תמונה</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4 text-center text-gray-700 text-base">
                                      {exercise.sets || '—'}
                                    </td>
                                    <td className="p-4 text-center text-gray-700 text-base">
                                      {exercise.reps || '—'}
                                    </td>
                                    <td className="p-4 text-right">
                                      {videoUrl ? (
                                        <a
                                          href={videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-blue-600 hover:text-blue-800 underline print:text-blue-700"
                                          style={{ textDecorationColor: '#9333ea' }}
                                        >
                                          {exercise.name || 'תרגיל ללא שם'}
                                        </a>
                                      ) : (
                                        <span className="font-medium text-gray-800">
                                          {exercise.name || 'תרגיל ללא שם'}
                                        </span>
                                      )}
                                      {exercise.notes && (
                                        <span className="text-gray-600 text-xs block mt-1">({exercise.notes})</span>
                                      )}
                                    </td>
                                    <td className="p-4 text-center text-gray-500 font-medium text-base">
                                      {exerciseId}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                    });
                  })()}
                </div>
              </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700">
                      אין נתוני אימונים זמינים. workoutData: {JSON.stringify(workoutData)}, weeklyWorkout: {JSON.stringify(workoutData?.weeklyWorkout)}
                    </p>
                  </div>
                )}
              </>
            ) : budget.workout_template_id ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">טוען תוכנית אימונים...</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">לא הוגדרה תוכנית אימונים</p>
              </div>
            )}
          </div>
        )}

        {/* Interval Training Section */}
        {budget.interval_training && budget.interval_training.length > 0 && (
          <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-600" />
              <h3 className="text-xl font-bold text-gray-800">אימוני אינטרוולים</h3>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              {budget.interval_training.map((interval: any, idx: number) => (
                <div key={idx} className="bg-white rounded p-4 border border-yellow-200">
                  {interval.activity_type && (
                    <p className="font-semibold text-yellow-900 mb-3">{interval.activity_type}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">זמן פעילות</p>
                      <p className="text-base font-bold text-yellow-900">
                        {interval.activity_duration_seconds ? `${interval.activity_duration_seconds} שניות` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">זמן מנוחה</p>
                      <p className="text-base font-bold text-yellow-900">
                        {interval.rest_duration_seconds ? `${interval.rest_duration_seconds} שניות` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">סטים</p>
                      <p className="text-base font-bold text-yellow-900">
                        {interval.sets || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">פעמים בשבוע</p>
                      <p className="text-base font-bold text-yellow-900">
                        {interval.workouts_per_week || '—'}
                      </p>
                    </div>
                  </div>
                  {interval.notes && (
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <p className="text-xs text-yellow-600 mb-1">הערות</p>
                      <p className="text-sm text-yellow-900">{interval.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aerobic Activity Section */}
        {budget.cardio_training && budget.cardio_training.length > 0 && (
          <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-red-600" />
              <h3 className="text-xl font-bold text-gray-800">פעילות אירובית</h3>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
              {budget.cardio_training.map((cardio: any, idx: number) => (
                <div key={idx} className="bg-white rounded p-4 border border-red-200">
                  {cardio.name && (
                    <p className="font-semibold text-red-900 mb-3">{cardio.name}</p>
                  )}
                  {cardio.type && (
                    <p className="text-sm text-red-700 mb-3">סוג: {cardio.type}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-red-600 mb-1">דקות</p>
                      <p className="text-base font-bold text-red-900">
                        {cardio.duration_minutes || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600 mb-1">תדירות</p>
                      <p className="text-base font-bold text-red-900">
                        {cardio.period_type || 'לשבוע'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600 mb-1">פעמים בשבוע</p>
                      <p className="text-base font-bold text-red-900">
                        {cardio.workouts_per_week || '—'}
                      </p>
                    </div>
                  </div>
                  {cardio.notes && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs text-red-600 mb-1">הערות</p>
                      <p className="text-sm text-red-900">{cardio.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Instructions Section */}
        {(budget.eating_order || budget.eating_rules) && (
          <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-800">הנחיות מקצועיות</h3>
            </div>
            
            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 space-y-4">
              {budget.eating_order && (
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">סדר אכילה</h4>
                  <p className="text-sm text-orange-900 whitespace-pre-line">{budget.eating_order}</p>
                </div>
              )}
              {budget.eating_rules && (
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">כללי אכילה</h4>
                  <p className="text-sm text-orange-900 whitespace-pre-line">{budget.eating_rules}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other Notes */}
        {budget.other_notes && (
          <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-800">הערות נוספות לתכנית</h3>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900 whitespace-pre-line">{budget.other_notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-gray-50 print:bg-white border-t border-gray-200 print:border-t-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="hidden print:block">
              <p>עמוד <span className="page-number"></span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
