/**
 * PrintBudgetPage Component
 * 
 * Print-optimized page for displaying budget details
 */

import { usePrintBudgetPage } from './PrintBudgetPage';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Pill, 
  UtensilsCrossed, 
  Dumbbell, 
  FileText, 
  Printer,
  ArrowRight,
  Calendar,
  User,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const PrintBudgetPage = () => {
  const navigate = useNavigate();
  const { budget, nutritionTemplate, workoutTemplate, clientName, assignedDate, isLoading } = usePrintBudgetPage();

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">תקציב לא נמצא</p>
          <p className="text-gray-600">התקציב המבוקש לא קיים או שאין לך הרשאה לצפות בו</p>
        </div>
      </div>
    );
  }

  const currentDate = format(new Date(), 'dd/MM/yyyy', { locale: he });
  const displayDate = assignedDate 
    ? format(new Date(assignedDate), 'dd/MM/yyyy', { locale: he })
    : currentDate;

  return (
    <>
      {/* Back Button - Only visible on screen */}
      <div className="print:hidden fixed top-6 right-6 z-50">
        <Button
          onClick={handleBack}
          size="lg"
          variant="outline"
          className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-lg"
        >
          <ArrowLeft className="h-5 w-5 ml-2" />
          חזור
        </Button>
      </div>

      {/* Print Now Button - Only visible on screen */}
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

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white" dir="rtl">
        <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-xl rounded-xl print:rounded-none overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 print:p-6 print:bg-purple-600">
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
                  <p className="text-2xl font-bold text-purple-900">{budget.steps_goal.toLocaleString()}</p>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                </div>
                {(budget.nutrition_targets?.fiber_min || nutritionTemplate?.targets?.fiber) && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">סיבים (גרם)</p>
                    <p className="text-lg font-bold text-blue-900">
                      {budget.nutrition_targets?.fiber_min || nutritionTemplate?.targets?.fiber || '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training Plan Section */}
          {workoutTemplate && (
            <div className="p-6 border-b border-gray-200 print:break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-bold text-gray-800">תוכנית אימונים</h3>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">{workoutTemplate.name}</p>
                {workoutTemplate.description && (
                  <p className="text-sm text-gray-600 mb-4">{workoutTemplate.description}</p>
                )}
                {workoutTemplate.goal_tags && workoutTemplate.goal_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {workoutTemplate.goal_tags.map((tag: string, idx: number) => (
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
              {workoutTemplate.routine_data?.weeklyWorkout && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">לוח זמנים שבועי</h4>
                  {workoutTemplate.routine_data.weeklyWorkout.generalGoals && (
                    <p className="text-sm text-green-700 mb-3 bg-green-100 p-2 rounded">
                      <strong>מטרות כלליות:</strong> {workoutTemplate.routine_data.weeklyWorkout.generalGoals}
                    </p>
                  )}
                  <div className="space-y-4 text-sm">
                    {Object.entries(workoutTemplate.routine_data.weeklyWorkout.days || {}).map(([dayKey, dayData]: [string, any]) => {
                      if (!dayData || !dayData.isActive || !dayData.exercises || dayData.exercises.length === 0) {
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
                        <div key={dayKey} className="bg-white rounded p-3 border border-green-200 print:break-inside-avoid">
                          <p className="font-semibold text-green-900 mb-3">{dayLabels[dayKey] || dayKey}</p>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse" dir="rtl">
                              <thead>
                                <tr className="border-b border-gray-300 bg-gray-50">
                                  <th className="p-2 text-right text-xs font-semibold text-gray-700 w-16">תמונה</th>
                                  <th className="p-2 text-right text-xs font-semibold text-gray-700 w-20">סטים</th>
                                  <th className="p-2 text-right text-xs font-semibold text-gray-700 w-24">חזרות</th>
                                  <th className="p-2 text-right text-xs font-semibold text-gray-700">תרגיל</th>
                                  <th className="p-2 text-right text-xs font-semibold text-gray-700 w-12">מס'</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dayData.exercises.map((exercise: any, idx: number) => {
                                  // Generate exercise identifier (A, B, C1, C2, etc.)
                                  const getExerciseId = (index: number): string => {
                                    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                    const letter = letters[Math.floor(index / 2)] || String.fromCharCode(65 + index);
                                    const subIndex = index % 2;
                                    return subIndex === 0 ? letter : `${letter}${subIndex + 1}`;
                                  };
                                  
                                  const exerciseId = getExerciseId(idx);
                                  
                                  // Normalize image_url and video_url - handle both empty strings and null/undefined
                                  const imageUrl = exercise.image_url && exercise.image_url.trim() ? exercise.image_url.trim() : null;
                                  const videoUrl = exercise.video_url && exercise.video_url.trim() ? exercise.video_url.trim() : null;
                                  
                                  return (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
                                      <td className="p-2 text-center">
                                        {imageUrl ? (
                                          <img
                                            src={imageUrl}
                                            alt={exercise.name || 'תרגיל'}
                                            className="w-16 h-16 object-cover mx-auto border border-gray-300 rounded"
                                            onError={(e) => {
                                              // Fallback if image fails to load - hide the broken image
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded mx-auto flex items-center justify-center">
                                            <span className="text-xs text-gray-400">אין תמונה</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2 text-center text-gray-700">
                                        {exercise.sets || '—'}
                                      </td>
                                      <td className="p-2 text-center text-gray-700">
                                        {exercise.reps || '—'}
                                      </td>
                                      <td className="p-2 text-right">
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
                                      <td className="p-2 text-center text-gray-500 font-medium text-xs">
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
                    })}
                  </div>
                </div>
              )}
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

          {/* Footer */}
          <div className="p-6 bg-gray-50 print:bg-white border-t border-gray-200 print:border-t-0">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <p>manager@dietneta.com</p>
              </div>
              <div className="hidden print:block">
                <p>עמוד <span className="page-number"></span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
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
          
          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
};

export default PrintBudgetPage;

