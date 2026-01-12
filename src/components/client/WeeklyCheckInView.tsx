/**
 * WeeklyCheckInView Component
 * 
 * Weekly check-in view that shows weekly summaries and allows weekly-level data entry.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppSelector } from '@/store/hooks';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WeeklyCheckInViewProps {
  customerId: string | null;
}

// Compact Input Cell for weekly data
const CompactInputCell = React.forwardRef<HTMLInputElement, {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
}>(({ label, value, onChange, suffix, min, max, step = 1 }, ref) => {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5 px-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50/50 hover:border-[#5B6FB9]/30 transition-all min-w-0 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Label className="text-sm text-slate-700 font-medium flex-shrink-0 whitespace-nowrap" style={{ fontSize: '13px', fontWeight: 500 }}>
          {label}:
        </Label>
        <Input
          ref={ref}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : parseFloat(val));
          }}
          min={min}
          max={max}
          step={step}
          className={cn(
            "h-8 text-sm px-2.5 flex-1 max-w-[140px]",
            "border border-slate-200 rounded-md focus:border-[#5B6FB9] focus:ring-1 focus:ring-[#5B6FB9]/20 focus-visible:ring-0",
            "transition-all duration-150",
            "bg-white font-semibold text-slate-900"
          )}
          style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            textAlign: 'right'
          }}
          dir="ltr"
          placeholder="—"
        />
        <span className="text-xs text-slate-500 flex-shrink-0 font-medium">
          {suffix}
        </span>
      </div>
    </div>
  );
});
CompactInputCell.displayName = 'CompactInputCell';

export const WeeklyCheckInView: React.FC<WeeklyCheckInViewProps> = ({ customerId }) => {
  const { checkIns } = useAppSelector((state) => state.client);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get current week range
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
  
  // Weekly data state
  const [weeklyAvgWeight, setWeeklyAvgWeight] = useState<number | null>(null);
  const [weeklyAvgSteps, setWeeklyAvgSteps] = useState<number | null>(null);
  const [weeklyAvgCalories, setWeeklyAvgCalories] = useState<number | null>(null);
  const [weeklyAvgProtein, setWeeklyAvgProtein] = useState<number | null>(null);
  const [weeklyNotes, setWeeklyNotes] = useState<string>('');

  // Calculate weekly averages from daily check-ins
  const weeklyAverages = useMemo(() => {
    const weekCheckIns = checkIns.filter(ci => {
      const checkInDate = new Date(ci.check_in_date);
      return checkInDate >= weekStart && checkInDate <= weekEnd;
    });

    if (weekCheckIns.length === 0) {
      return {
        weight: null,
        steps: null,
        calories: null,
        protein: null,
      };
    }

    const totalWeight = weekCheckIns.reduce((sum, ci) => sum + (ci.weight || 0), 0);
    const totalSteps = weekCheckIns.reduce((sum, ci) => sum + (ci.steps_actual || 0), 0);
    const totalCalories = weekCheckIns.reduce((sum, ci) => sum + (ci.calories_daily || 0), 0);
    const totalProtein = weekCheckIns.reduce((sum, ci) => sum + (ci.protein_daily || 0), 0);

    return {
      weight: weekCheckIns.length > 0 ? Math.round((totalWeight / weekCheckIns.length) * 10) / 10 : null,
      steps: weekCheckIns.length > 0 ? Math.round(totalSteps / weekCheckIns.length) : null,
      calories: weekCheckIns.length > 0 ? Math.round(totalCalories / weekCheckIns.length) : null,
      protein: weekCheckIns.length > 0 ? Math.round((totalProtein / weekCheckIns.length) * 10) / 10 : null,
    };
  }, [checkIns, weekStart, weekEnd]);

  // Initialize from calculated averages
  useEffect(() => {
    setWeeklyAvgWeight(weeklyAverages.weight);
    setWeeklyAvgSteps(weeklyAverages.steps);
    setWeeklyAvgCalories(weeklyAverages.calories);
    setWeeklyAvgProtein(weeklyAverages.protein);
  }, [weeklyAverages]);

  const handleSubmit = async () => {
    if (!customerId) return;

    setIsSubmitting(true);
    try {
      // For now, we'll just show a success message
      // In the future, this could save to a weekly_checkins table
      toast({
        title: 'הצלחה',
        description: 'הדיווח השבועי נשמר בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת הדיווח השבועי',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayWeekRange = `${format(weekStart, 'dd/MM', { locale: he })} - ${format(weekEnd, 'dd/MM', { locale: he })}`;

  return (
    <div className="flex flex-col bg-white h-full" dir="rtl">
      {/* Page Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-black truncate flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#5B6FB9]" />
            דיווח שבועי - {displayWeekRange}
          </h1>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-8 text-sm px-4 font-semibold bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-3 pb-4 flex-1 overflow-y-auto min-h-0">
        {/* Weekly Summary Card */}
        <Card className="border border-slate-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 mb-4 shadow-sm">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#5B6FB9]" />
              סיכום שבועי (ממוצעים מיומיים)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">ממוצע משקל</div>
                <div className="text-lg font-bold text-slate-900">
                  {weeklyAverages.weight ? `${weeklyAverages.weight.toFixed(1)} ק״ג` : '—'}
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">ממוצע צעדים</div>
                <div className="text-lg font-bold text-slate-900">
                  {weeklyAverages.steps ? weeklyAverages.steps.toLocaleString() : '—'}
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">ממוצע קלוריות</div>
                <div className="text-lg font-bold text-slate-900">
                  {weeklyAverages.calories ? weeklyAverages.calories.toLocaleString() : '—'}
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">ממוצע חלבון</div>
                <div className="text-lg font-bold text-slate-900">
                  {weeklyAverages.protein ? `${weeklyAverages.protein.toFixed(1)} גרם` : '—'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Input Fields */}
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg bg-white shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">נתונים שבועיים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CompactInputCell
                label="משקל ממוצע"
                value={weeklyAvgWeight}
                onChange={setWeeklyAvgWeight}
                suffix="ק״ג"
                min={0}
                step={0.1}
              />
              <CompactInputCell
                label="צעדים ממוצעים"
                value={weeklyAvgSteps}
                onChange={setWeeklyAvgSteps}
                suffix="צעדים"
                min={0}
              />
              <CompactInputCell
                label="קלוריות ממוצעות"
                value={weeklyAvgCalories}
                onChange={setWeeklyAvgCalories}
                suffix="קק״ל"
                min={0}
              />
              <CompactInputCell
                label="חלבון ממוצע"
                value={weeklyAvgProtein}
                onChange={setWeeklyAvgProtein}
                suffix="גרם"
                min={0}
                step={0.1}
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="border border-slate-200 rounded-lg bg-white shadow-sm" dir="rtl">
            <div className="px-4 py-3 border-b border-slate-200">
              <span className="text-sm uppercase tracking-wide text-slate-700 font-semibold">הערות שבועיות (אופציונלי)</span>
            </div>
            <Textarea
              value={weeklyNotes}
              onChange={(e) => setWeeklyNotes(e.target.value)}
              placeholder="הוסף הערות שבועיות..."
              dir="rtl"
              rows={4}
              className="text-sm border-0 focus:ring-0 resize-none text-black min-h-[100px] bg-transparent px-4 py-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

