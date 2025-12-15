/**
 * NutritionSummaryCard Component
 * 
 * Reusable component for displaying nutrition plan summary with donut chart.
 * Used in both CustomerProfile and LeadDetails pages.
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Download } from 'lucide-react';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';

interface NutritionSummaryCardProps {
  customerId: string;
  onViewDetails?: () => void;
  onAddPlan?: () => void;
}

// Simple CSS-based donut chart component
const NutritionChart = ({ 
  protein, 
  carbs, 
  fat, 
  calories 
}: { 
  protein: number; 
  carbs: number; 
  fat: number; 
  calories: number; 
}) => {
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const totalCal = proteinCal + carbsCal + fatCal;

  if (totalCal <= 0) {
    return (
      <div className="h-[140px] w-[140px] flex items-center justify-center rounded-full border-6 border-gray-200">
        <div className="text-center text-gray-400">
          <Flame className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-[10px]">אין נתונים</p>
        </div>
      </div>
    );
  }

  const proteinPercent = (proteinCal / totalCal) * 100;
  const carbsPercent = (carbsCal / totalCal) * 100;
  const fatPercent = (fatCal / totalCal) * 100;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const proteinDash = (proteinPercent / 100) * circumference;
  const carbsDash = (carbsPercent / 100) * circumference;
  const fatDash = (fatPercent / 100) * circumference;
  
  const carbsOffset = -proteinDash;
  const fatOffset = -(proteinDash + carbsDash);

  return (
    <div className="h-[140px] w-[140px] flex-shrink-0 relative flex items-center justify-center">
      <svg className="transform -rotate-90" width="140" height="140" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="20"
        />
        {proteinPercent > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="20"
            strokeDasharray={`${proteinDash} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        )}
        {carbsPercent > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="20"
            strokeDasharray={`${carbsDash} ${circumference}`}
            strokeDashoffset={carbsOffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        )}
        {fatPercent > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="20"
            strokeDasharray={`${fatDash} ${circumference}`}
            strokeDashoffset={fatOffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        )}
      </svg>
    </div>
  );
};

export const NutritionSummaryCard = ({ customerId, onViewDetails, onAddPlan }: NutritionSummaryCardProps) => {
  const { nutritionPlan, isLoading } = useNutritionPlan(customerId);

  const chartData = useMemo(() => {
    if (!nutritionPlan?.targets || isLoading) {
      return null;
    }
    
    const { protein, carbs, fat, calories } = nutritionPlan.targets;
    
    if (!isFinite(protein) || !isFinite(carbs) || !isFinite(fat) || !isFinite(calories) ||
        protein < 0 || carbs < 0 || fat < 0 || calories <= 0) {
      return null;
    }
    
    return { protein, carbs, fat, calories };
  }, [nutritionPlan?.targets?.protein, nutritionPlan?.targets?.carbs, nutritionPlan?.targets?.fat, nutritionPlan?.targets?.calories, isLoading]);

  return (
    <Card 
      className="p-3 border border-gray-200 bg-white cursor-pointer hover:border-orange-300 transition-colors shadow-sm"
      onClick={nutritionPlan ? onViewDetails : onAddPlan}
    >
      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
        </div>
      ) : nutritionPlan ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-bold text-gray-900">תוכנית תזונה</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-[140px] w-[140px] relative">
              {chartData ? (
                <NutritionChart 
                  protein={chartData.protein}
                  carbs={chartData.carbs}
                  fat={chartData.fat}
                  calories={chartData.calories}
                />
              ) : (
                <div className="h-[140px] w-[140px] flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Flame className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-[10px]">{isLoading ? 'טוען נתונים...' : 'אין נתונים'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-[10px] text-gray-600">חלבון</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{nutritionPlan?.targets?.protein || 0}ג</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] text-gray-600">פחמימות</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{nutritionPlan?.targets?.carbs || 0}ג</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] text-gray-600">שומן</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{nutritionPlan?.targets?.fat || 0}ג</span>
              </div>
              <div className="pt-1.5 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">סה"כ קלוריות</span>
                  <span className="text-sm font-bold text-orange-900">{nutritionPlan?.targets?.calories || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Flame className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-xs font-semibold text-gray-900 mb-1.5">אין תוכנית תזונה</h3>
          <Button 
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white mt-1.5 text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onAddPlan?.();
            }}
          >
            <Download className="h-3 w-3 ml-1.5" />
            הוסף תוכנית
          </Button>
        </div>
      )}
    </Card>
  );
};
