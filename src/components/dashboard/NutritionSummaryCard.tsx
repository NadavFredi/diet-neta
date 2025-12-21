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
      className="p-5 border-2 border-gray-200/60 bg-white rounded-2xl cursor-pointer hover:border-orange-400 hover:shadow-lg transition-all duration-300 shadow-md"
      onClick={nutritionPlan ? onViewDetails : onAddPlan}
    >
      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
        </div>
      ) : nutritionPlan ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">תוכנית תזונה</h3>
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
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between p-2 bg-red-50/50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs font-semibold text-gray-700">חלבון</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{nutritionPlan?.targets?.protein || 0}ג</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-semibold text-gray-700">פחמימות</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{nutritionPlan?.targets?.carbs || 0}ג</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-xs font-semibold text-gray-700">שומן</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{nutritionPlan?.targets?.fat || 0}ג</span>
              </div>
              <div className="pt-2.5 border-t-2 border-gray-100">
                <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border-2 border-orange-200/50">
                  <span className="text-xs font-bold text-gray-800">סה"כ קלוריות</span>
                  <span className="text-lg font-bold text-orange-900">{nutritionPlan?.targets?.calories || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Flame className="h-10 w-10 text-orange-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">אין תוכנית תזונה</h3>
          <p className="text-xs text-gray-500 mb-4">צור תוכנית תזונה מותאמת אישית</p>
          <Button 
            size="lg"
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white rounded-xl px-6 py-2.5"
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
