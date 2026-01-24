import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Dumbbell, 
  Heart, 
  Zap, 
  Clock,
  FileText,
  Edit,
  Plus,
  Target,
  Trash2
} from 'lucide-react';
import { BudgetLinkBadge } from './BudgetLinkBadge';
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { WorkoutPlanForm } from './WorkoutPlanForm';
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
import type { WeeklyWorkout } from './WeeklyWorkoutBuilder';

export interface CustomField {
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean';
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  lead_id?: string; // DEPRECATED: Use customer_id instead
  customer_id?: string;
  template_id?: string;
  budget_id?: string | null;
  name?: string;
  start_date: string;
  description?: string;
  strength: number;
  cardio: number;
  intervals: number;
  custom_attributes: {
    schema: CustomField[];
    data: Record<string, any>;
  };
  is_active?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

interface WorkoutPlanCardProps {
  workoutPlan: WorkoutPlan;
  onUpdate?: (plan: Partial<WorkoutPlan>) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}

export const WorkoutPlanCard = ({ 
  workoutPlan, 
  onUpdate,
  onDelete,
  isEditable = true 
}: WorkoutPlanCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const startDate = new Date(workoutPlan.start_date);
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

  const renderCustomField = (field: CustomField, value: any) => {
    if (value === null || value === undefined) return null;

    switch (field.fieldType) {
      case 'date':
        return format(new Date(value), 'dd/MM/yyyy', { locale: he });
      case 'boolean':
        return value ? 'כן' : 'לא';
      case 'number':
        return value.toLocaleString('he-IL');
      default:
        return String(value);
    }
  };

  return (
    <Card className="bg-white border-2 border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-blue-600" />
              תוכנית אימונים
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge 
                variant="outline" 
                className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-3 py-1"
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
              <BudgetLinkBadge budgetId={workoutPlan.budget_id} />
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
                  className="!max-w-[100vw] !w-[100vw] !h-[100vh] !max-h-[100vh] flex flex-col p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !rounded-none !m-0" 
                  dir="rtl"
                >
                  <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0" style={{ flexShrink: 0 }}>
                    <DialogTitle>עריכת תוכנית אימונים</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
                    <WorkoutPlanForm
                      initialData={workoutPlan}
                      onSave={(updatedPlan) => {
                        onUpdate?.(updatedPlan);
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
                    <AlertDialogTitle>מחיקת תוכנית אימונים</AlertDialogTitle>
                    <AlertDialogDescription>
                      האם אתה בטוח שברצונך למחוק את תוכנית האימונים? פעולה זו לא ניתנת לביטול.
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
        {/* Workout Plan Section - Print Budget Design */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="h-5 w-5 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800">
              {workoutPlan.name || 'תוכנית אימונים'}
            </h3>
          </div>
          
          <div className="mb-4">
            {workoutPlan.description && (
              <p className="font-semibold text-gray-700 mb-2">{workoutPlan.description}</p>
            )}
          </div>

          {/* Weekly Schedule */}
          {(() => {
            // Get weekly workout data - check multiple possible locations
            // 1. custom_attributes.data.weeklyWorkout (from useWorkoutPlan fallback conversion)
            // 2. custom_attributes.weeklyWorkout (from budgetPlanSync direct storage - legacy)
            // 3. custom_attributes.data (if weeklyWorkout is at root of data)
            const customAttrs = workoutPlan.custom_attributes as any;
            const weeklyWorkout = 
              customAttrs?.data?.weeklyWorkout || 
              customAttrs?.['weeklyWorkout'] ||
              (customAttrs?.data?.days ? customAttrs.data : null);
            
            if (!weeklyWorkout || !weeklyWorkout.days || Object.keys(weeklyWorkout.days).length === 0) {
              return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-gray-600 text-center">אין תוכנית שבועית זמינה</p>
                </div>
              );
            }

            return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="bg-green-100 border border-green-200 rounded p-2 mb-3">
                <h4 className="font-semibold text-green-900">לוח זמנים שבועי</h4>
              </div>
              {weeklyWorkout.generalGoals && (
                <p className="text-sm text-green-700 mb-3 bg-green-100 p-2 rounded">
                  <strong>מטרות כלליות:</strong> {weeklyWorkout.generalGoals}
                </p>
              )}
              <div className="space-y-4 text-sm">
                {Object.entries(weeklyWorkout.days).map(([dayKey, dayData]: [string, any]) => {
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
                    <div key={dayKey} className="bg-white rounded border border-green-200">
                      {/* Day Header - Green Bar */}
                      <div className="bg-green-50 border-b border-green-200 p-3">
                        <p className="font-semibold text-green-900">{dayLabels[dayKey] || dayKey}</p>
                      </div>
                      {/* Day Content */}
                      <div className="p-3">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse" dir="rtl">
                            <thead>
                              <tr className="border-b border-gray-300 bg-gray-50">
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-40">תמונה</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-20">סטים</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-24">חזרות</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700">תרגיל</th>
                                <th className="p-4 text-right text-sm font-semibold text-gray-700 w-12">מס'</th>
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
                                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-4 text-center">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={exercise.name || 'תרגיל'}
                                          className="w-32 h-32 object-cover mx-auto border border-gray-300 rounded"
                                          onError={(e) => {
                                            // Fallback if image fails to load - hide the broken image
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-32 h-32 bg-gray-100 border border-gray-300 rounded mx-auto flex items-center justify-center">
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
                                          className="font-medium text-blue-600 hover:text-blue-800 underline"
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
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
        </div>

        {/* Metrics Grid - Hidden in view-only mode (client portal) */}
        {isEditable && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-200 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600">כוח</p>
                  <p className="text-2xl font-bold text-red-900">{workoutPlan.strength}</p>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2">אימונים בשבוע</p>
            </div>

            <div className="bg-green-50 rounded-xl p-5 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-200 rounded-lg">
                  <Heart className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">קרדיו</p>
                  <p className="text-2xl font-bold text-green-900">{workoutPlan.cardio}</p>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">אימונים בשבוע</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-5 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-200 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">אינטרוולים</p>
                  <p className="text-2xl font-bold text-purple-900">{workoutPlan.intervals}</p>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">אימונים בשבוע</p>
            </div>
          </div>
        )}

        {/* Custom Fields Section (Legacy) */}
        {workoutPlan.custom_attributes?.schema && workoutPlan.custom_attributes.schema.length > 0 && !workoutPlan.custom_attributes.data?.weeklyWorkout && (
          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-slate-600" />
              שדות מותאמים אישית
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workoutPlan.custom_attributes.schema.map((field) => {
                const value = workoutPlan.custom_attributes.data[field.fieldName];
                if (value === null || value === undefined) return null;

                return (
                  <div 
                    key={field.fieldName}
                    className="bg-white rounded-lg p-4 border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">
                          {field.fieldName}
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {renderCustomField(field, value)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {field.fieldType === 'text' && 'טקסט'}
                        {field.fieldType === 'number' && 'מספר'}
                        {field.fieldType === 'date' && 'תאריך'}
                        {field.fieldType === 'boolean' && 'כן/לא'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

