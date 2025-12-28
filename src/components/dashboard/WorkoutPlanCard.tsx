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
            <div className="flex items-center gap-2 mt-2">
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
                  className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" 
                  style={{ height: '95vh', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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
        {/* Description */}
        {workoutPlan.description && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <p className="text-slate-700 leading-relaxed">{workoutPlan.description}</p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
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

        {/* Weekly Workout Schedule */}
        {workoutPlan.custom_attributes?.data?.weeklyWorkout && (
          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              תוכנית שבועית
            </h3>
            {workoutPlan.custom_attributes.data.weeklyWorkout.generalGoals && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {workoutPlan.custom_attributes.data.weeklyWorkout.generalGoals}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(workoutPlan.custom_attributes.data.weeklyWorkout.days || {}).map(([dayKey, dayData]: [string, any]) => {
                if (!dayData.isActive || !dayData.exercises || dayData.exercises.length === 0) return null;
                
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
                  <Card key={dayKey} className="border-2 border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{dayLabels[dayKey] || dayKey}</h4>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {dayData.exercises.length} תרגילים
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {dayData.exercises.slice(0, 3).map((ex: any, idx: number) => (
                          <div key={idx} className="text-sm text-slate-700">
                            <span className="font-medium">{ex.name}</span>
                            <span className="text-slate-500 mr-2">
                              {' '}• {ex.sets}x{ex.reps}
                            </span>
                          </div>
                        ))}
                        {dayData.exercises.length > 3 && (
                          <p className="text-xs text-slate-500">
                            +{dayData.exercises.length - 3} תרגילים נוספים
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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

