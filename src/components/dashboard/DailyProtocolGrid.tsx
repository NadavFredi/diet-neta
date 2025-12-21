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
    <Card className="p-5 border-2 border-gray-200/60 bg-white rounded-2xl shadow-md">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-[#5B6FB9] flex items-center justify-center">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-base font-bold text-gray-900">פרוטוקול יומי</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Steps Status Tile - High-end Fitness Widget */}
        <div className="relative bg-cyan-50 rounded-xl border-2 border-cyan-200/60 p-4 overflow-hidden">
          <Footprints className="absolute -top-2 -right-2 h-16 w-16 text-cyan-200/40" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shadow-sm">
                <Footprints className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs text-cyan-700 font-semibold">יעד צעדים</p>
            </div>
            <p className="text-2xl font-bold text-cyan-900 mb-1">
              {stepsGoal > 0 ? (stepsGoal / 1000).toFixed(1) + 'K' : '-'}
            </p>
            {stepsGoal > 0 && (
              <p className="text-[10px] text-cyan-600 font-medium">{stepsGoal.toLocaleString('he-IL')} צעדים</p>
            )}
          </div>
        </div>
        {/* Workouts Status Tile - High-end Fitness Widget */}
        <div className="relative bg-orange-50 rounded-xl border-2 border-orange-200/60 p-4 overflow-hidden">
          <Dumbbell className="absolute -top-2 -right-2 h-16 w-16 text-orange-200/40" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
                <Dumbbell className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs text-orange-700 font-semibold">אימונים/שבוע</p>
            </div>
            <p className="text-2xl font-bold text-orange-900 mb-1">{workoutGoal || '-'}</p>
            {workoutGoal > 0 && (
              <p className="text-[10px] text-orange-600 font-medium">אימונים שבועיים</p>
            )}
          </div>
        </div>
        {/* Calories Status Tile - High-end Fitness Widget */}
        <div className="relative bg-red-50 rounded-xl border-2 border-red-200/60 p-4 overflow-hidden">
          <Flame className="absolute -top-2 -right-2 h-16 w-16 text-red-200/40" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shadow-sm">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs text-red-700 font-semibold">קלוריות יומיות</p>
            </div>
            <p className="text-2xl font-bold text-red-900 mb-1">{calories || '-'}</p>
            {calories > 0 && (
              <p className="text-[10px] text-red-600 font-medium">קלוריות</p>
            )}
          </div>
        </div>
        {/* Supplements Status Tile - High-end Fitness Widget */}
        <div className="relative bg-green-50 rounded-xl border-2 border-green-200/60 p-4 overflow-hidden">
          <CheckCircle2 className="absolute -top-2 -right-2 h-16 w-16 text-green-200/40" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs text-green-700 font-semibold">תוספים</p>
            </div>
            <p className="text-2xl font-bold text-green-900 mb-1">{supplements.length || 0}</p>
            {supplements.length > 0 && (
              <p className="text-[10px] text-green-600 font-medium">תוספים יומיים</p>
            )}
          </div>
        </div>
      </div>
      {/* Supplements List - Enhanced */}
      {supplements.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">רשימת תוספים:</p>
          <div className="flex flex-wrap gap-2">
            {supplements.map((supplement: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-2 border-green-200 text-xs px-3 py-1.5 font-medium">
                <CheckCircle2 className="h-3 w-3 ml-1.5" />
                {supplement}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
