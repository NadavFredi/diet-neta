/**
 * DailyProtocolGrid Component
 * 
 * Reusable component for displaying daily protocol status tiles.
 * Used in both CustomerProfile and LeadDetails pages.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footprints, Dumbbell, Flame, CheckCircle2, Activity } from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomers';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';

interface DailyProtocolGridProps {
  customerId: string;
}

export const DailyProtocolGrid = ({ customerId }: DailyProtocolGridProps) => {
  const { data: customer } = useCustomer(customerId);
  const { nutritionPlan } = useNutritionPlan(customerId);

  if (!customer?.daily_protocol) {
    return null;
  }

  const dailyProtocol = customer.daily_protocol || {};
  const stepsGoal = dailyProtocol.stepsGoal || 0;
  const workoutGoal = dailyProtocol.workoutGoal || 0;
  const supplements = dailyProtocol.supplements || [];
  const calories = nutritionPlan?.targets?.calories || 0;

  return (
    <Card className="p-5 border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900">פרוטוקול יומי</h2>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {/* Steps Status Tile */}
        <div className="relative bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border-2 border-cyan-200 p-4 overflow-hidden">
          <Footprints className="absolute top-2 left-2 h-16 w-16 text-cyan-200 opacity-30" />
          <div className="relative">
            <Footprints className="h-5 w-5 text-cyan-600 mb-2" />
            <p className="text-xs text-cyan-700 mb-1 font-medium">יעד צעדים</p>
            <p className="text-3xl font-bold text-cyan-900">
              {stepsGoal > 0 ? (stepsGoal / 1000).toFixed(1) + 'K' : '-'}
            </p>
            {stepsGoal > 0 && (
              <p className="text-[10px] text-cyan-600 mt-1">{stepsGoal.toLocaleString('he-IL')} צעדים</p>
            )}
          </div>
        </div>
        {/* Workouts Status Tile */}
        <div className="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 p-4 overflow-hidden">
          <Dumbbell className="absolute top-2 left-2 h-16 w-16 text-orange-200 opacity-30" />
          <div className="relative">
            <Dumbbell className="h-5 w-5 text-orange-600 mb-2" />
            <p className="text-xs text-orange-700 mb-1 font-medium">אימונים/שבוע</p>
            <p className="text-3xl font-bold text-orange-900">{workoutGoal || '-'}</p>
            {workoutGoal > 0 && (
              <p className="text-[10px] text-orange-600 mt-1">אימונים שבועיים</p>
            )}
          </div>
        </div>
        {/* Calories Status Tile */}
        <div className="relative bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200 p-4 overflow-hidden">
          <Flame className="absolute top-2 left-2 h-16 w-16 text-red-200 opacity-30" />
          <div className="relative">
            <Flame className="h-5 w-5 text-red-600 mb-2" />
            <p className="text-xs text-red-700 mb-1 font-medium">קלוריות יומיות</p>
            <p className="text-3xl font-bold text-red-900">{calories || '-'}</p>
            {calories > 0 && (
              <p className="text-[10px] text-red-600 mt-1">קלוריות</p>
            )}
          </div>
        </div>
        {/* Supplements Status Tile */}
        <div className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4 overflow-hidden">
          <CheckCircle2 className="absolute top-2 left-2 h-16 w-16 text-green-200 opacity-30" />
          <div className="relative">
            <CheckCircle2 className="h-5 w-5 text-green-600 mb-2" />
            <p className="text-xs text-green-700 mb-1 font-medium">תוספים</p>
            <p className="text-3xl font-bold text-green-900">{supplements.length || 0}</p>
            {supplements.length > 0 && (
              <p className="text-[10px] text-green-600 mt-1">תוספים יומיים</p>
            )}
          </div>
        </div>
      </div>
      {/* Supplements List */}
      {supplements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">רשימת תוספים:</p>
          <div className="flex flex-wrap gap-2">
            {supplements.map((supplement: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-1">
                <CheckCircle2 className="h-3 w-3 ml-1" />
                {supplement}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
