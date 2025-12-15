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
      className="p-5 border border-gray-200 bg-white cursor-pointer hover:border-blue-300 transition-colors shadow-sm"
      onClick={workoutPlan ? onViewDetails : onAddPlan}
    >
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : workoutPlan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-blue-600" />
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
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">כוח</p>
              <p className="text-xl font-bold text-blue-900">{workoutPlan.strength}</p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center">
              <p className="text-xs text-red-600 mb-1">קרדיו</p>
              <p className="text-xl font-bold text-red-900">{workoutPlan.cardio}</p>
            </div>
            <div className="bg-purple-50 rounded-lg border border-purple-100 p-3 text-center">
              <p className="text-xs text-purple-600 mb-1">אינטרוולים</p>
              <p className="text-xl font-bold text-purple-900">{workoutPlan.intervals}</p>
            </div>
          </div>
          {/* Top 3 Exercises Preview */}
          {getTopExercises(workoutPlan).length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">תרגילים מובילים:</p>
              <ul className="space-y-1">
                {getTopExercises(workoutPlan).map((exercise, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    {exercise}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Dumbbell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-2">אין תוכנית אימונים</h3>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
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
