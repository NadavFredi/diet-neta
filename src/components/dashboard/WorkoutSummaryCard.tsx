/**
 * WorkoutSummaryCard Component
 * 
 * Reusable component for displaying workout plan summary.
 * Used in both CustomerProfile and LeadDetails pages.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Download } from 'lucide-react';
import { useWorkoutPlan, type WorkoutPlan } from '@/hooks/useWorkoutPlan';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface WorkoutSummaryCardProps {
  customerId: string;
  onViewDetails?: () => void;
  onAddPlan?: () => void;
}

// Helper to get top 3 exercises from workout plan
const getTopExercises = (plan: WorkoutPlan | null): string[] => {
  if (!plan?.custom_attributes?.data?.weeklyWorkout) return [];
  
  const weeklyWorkout = plan.custom_attributes.data.weeklyWorkout;
  const allExercises: Array<{ name: string; count: number }> = [];
  
  Object.values(weeklyWorkout.days || {}).forEach((day: any) => {
    if (day.isActive && day.exercises) {
      day.exercises.forEach((exercise: any) => {
        if (exercise.name) {
          const existing = allExercises.find(e => e.name === exercise.name);
          if (existing) {
            existing.count++;
          } else {
            allExercises.push({ name: exercise.name, count: 1 });
          }
        }
      });
    }
  });
  
  return allExercises
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(e => e.name);
};

export const WorkoutSummaryCard = ({ customerId, onViewDetails, onAddPlan }: WorkoutSummaryCardProps) => {
  const { workoutPlan, isLoading, fetchWorkoutPlan } = useWorkoutPlan(customerId);
  const { toast } = useToast();

  const handleStatusChange = async (value: string) => {
    if (!workoutPlan) return;
    
    try {
      const { error } = await supabase
        .from('workout_plans')
        .update({
          is_active: value === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutPlan.id);

      if (error) throw error;
      await fetchWorkoutPlan();
      toast({
        title: 'הצלחה',
        description: 'הסטטוס עודכן בהצלחה',
      });
    } catch (error: any) {
      console.error('Failed to update workout plan status:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון הסטטוס',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card 
      className="p-5 border-2 border-gray-200/60 bg-white rounded-2xl cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-300 shadow-md"
      onClick={workoutPlan ? onViewDetails : onAddPlan}
    >
      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      ) : workoutPlan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900">תוכנית אימונים</h3>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={workoutPlan.is_active !== false ? 'active' : 'inactive'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-7 w-24 border-0 p-0 bg-transparent hover:bg-transparent">
                  <SelectValue>
                    {workoutPlan.is_active !== false ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        פעילה
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                        לא פעילה
                      </Badge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="active">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      פעילה
                    </Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                      לא פעילה
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200/60 p-4 text-center shadow-sm hover:shadow-md transition-all">
              <p className="text-xs text-blue-700 font-semibold mb-1.5">כוח</p>
              <p className="text-2xl font-bold text-blue-900">{workoutPlan.strength}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200/60 p-4 text-center shadow-sm hover:shadow-md transition-all">
              <p className="text-xs text-red-700 font-semibold mb-1.5">קרדיו</p>
              <p className="text-2xl font-bold text-red-900">{workoutPlan.cardio}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200/60 p-4 text-center shadow-sm hover:shadow-md transition-all">
              <p className="text-xs text-purple-700 font-semibold mb-1.5">אינטרוולים</p>
              <p className="text-2xl font-bold text-purple-900">{workoutPlan.intervals}</p>
            </div>
          </div>
          {/* Top 3 Exercises Preview */}
          {getTopExercises(workoutPlan).length > 0 && (
            <div className="pt-4 border-t-2 border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2.5">תרגילים מובילים:</p>
              <ul className="space-y-2">
                {getTopExercises(workoutPlan).map((exercise, idx) => (
                  <li key={idx} className="text-sm font-medium text-gray-800 flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                    {exercise}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-lg">
            <Dumbbell className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">אין תוכנית אימונים</h3>
          <p className="text-xs text-gray-500 mb-4">צור תוכנית אימונים מותאמת אישית</p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 px-6 py-2.5"
            onClick={(e) => {
              e.stopPropagation();
              onAddPlan?.();
            }}
          >
            <Download className="h-4 w-4 ml-2" />
            הוסף תוכנית
          </Button>
        </div>
      )}
    </Card>
  );
};
