/**
 * MultiDayReportModal Component
 * 
 * Modal for batch reporting multiple days at once.
 * Spreadsheet-style table with dates as rows and key metrics as columns.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { batchUpsertCheckIns } from '@/store/slices/clientSlice';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { DailyCheckIn } from '@/store/slices/clientSlice';

interface MultiDayReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  leadId: string | null;
  existingCheckIns: DailyCheckIn[];
}

interface DayData {
  date: string;
  // Physical (6)
  weight: number | null;
  belly_circumference: number | null;
  waist_circumference: number | null;
  thigh_circumference: number | null;
  arm_circumference: number | null;
  neck_circumference: number | null;
  // Activity (4)
  steps_actual: number | null;
  exercises_count: number | null;
  cardio_amount: number | null;
  intervals_count: number | null;
  // Nutrition (4)
  calories_daily: number | null;
  protein_daily: number | null;
  fiber_daily: number | null;
  water_amount: number | null;
  // Wellness (4)
  stress_level: number | null;
  hunger_level: number | null;
  energy_level: number | null;
  sleep_hours: number | null;
  // Notes
  notes: string | null;
}

export const MultiDayReportModal: React.FC<MultiDayReportModalProps> = ({
  open,
  onOpenChange,
  customerId,
  leadId,
  existingCheckIns,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate last 7 days
  const days = useMemo(() => {
    const result: DayData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find existing check-in for this date
      const existing = existingCheckIns.find((ci) => ci.check_in_date === dateStr);
      
      result.push({
        date: dateStr,
        // Physical (6)
        weight: existing?.weight ?? null,
        belly_circumference: existing?.belly_circumference ?? null,
        waist_circumference: existing?.waist_circumference ?? null,
        thigh_circumference: existing?.thigh_circumference ?? null,
        arm_circumference: existing?.arm_circumference ?? null,
        neck_circumference: existing?.neck_circumference ?? null,
        // Activity (4)
        steps_actual: existing?.steps_actual ?? null,
        exercises_count: existing?.exercises_count ?? null,
        cardio_amount: existing?.cardio_amount ?? null,
        intervals_count: existing?.intervals_count ?? null,
        // Nutrition (4)
        calories_daily: existing?.calories_daily ?? null,
        protein_daily: existing?.protein_daily ?? null,
        fiber_daily: existing?.fiber_daily ?? null,
        water_amount: existing?.water_amount ?? null,
        // Wellness (4)
        stress_level: existing?.stress_level ?? null,
        hunger_level: existing?.hunger_level ?? null,
        energy_level: existing?.energy_level ?? null,
        sleep_hours: existing?.sleep_hours ?? null,
        // Notes
        notes: existing?.notes ?? null,
      });
    }
    
    return result;
  }, [existingCheckIns]);

  const [dayData, setDayData] = useState<DayData[]>(days);

  // Update dayData when days change
  useEffect(() => {
    setDayData(days);
  }, [days]);

  const updateDayData = (date: string, field: keyof DayData, value: number | string | null) => {
    setDayData((prev) =>
      prev.map((day) => (day.date === date ? { ...day, [field]: value } : day))
    );
  };

  const handleSaveAll = async () => {
    setIsSubmitting(true);
    try {
      const checkInsToSave = dayData
        .filter((day) => {
          // Only save days that have at least one field filled
          return (
            day.weight !== null ||
            day.belly_circumference !== null ||
            day.waist_circumference !== null ||
            day.thigh_circumference !== null ||
            day.arm_circumference !== null ||
            day.neck_circumference !== null ||
            day.steps_actual !== null ||
            day.exercises_count !== null ||
            day.cardio_amount !== null ||
            day.intervals_count !== null ||
            day.calories_daily !== null ||
            day.protein_daily !== null ||
            day.fiber_daily !== null ||
            day.water_amount !== null ||
            day.stress_level !== null ||
            day.hunger_level !== null ||
            day.energy_level !== null ||
            day.sleep_hours !== null ||
            (day.notes !== null && day.notes.trim() !== '')
          );
        })
        .map((day) => ({
          customer_id: customerId,
          lead_id: leadId,
          check_in_date: day.date,
          // Physical (6)
          weight: day.weight,
          belly_circumference: day.belly_circumference,
          waist_circumference: day.waist_circumference,
          thigh_circumference: day.thigh_circumference,
          arm_circumference: day.arm_circumference,
          neck_circumference: day.neck_circumference,
          // Activity (4)
          steps_actual: day.steps_actual,
          exercises_count: day.exercises_count,
          cardio_amount: day.cardio_amount,
          intervals_count: day.intervals_count,
          // Nutrition (4)
          calories_daily: day.calories_daily,
          protein_daily: day.protein_daily,
          fiber_daily: day.fiber_daily,
          water_amount: day.water_amount,
          // Wellness (4)
          stress_level: day.stress_level,
          hunger_level: day.hunger_level,
          energy_level: day.energy_level,
          sleep_hours: day.sleep_hours,
          // Notes
          notes: day.notes?.trim() || null,
          // Set defaults for required fields
          workout_completed: false,
          steps_goal_met: false,
          nutrition_goal_met: false,
          supplements_taken: [],
        }));

      if (checkInsToSave.length === 0) {
        toast({
          title: 'אין נתונים לשמירה',
          description: 'אנא מלא לפחות שדה אחד באחד הימים',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      await dispatch(batchUpsertCheckIns(checkInsToSave)).unwrap();

      toast({
        title: 'בוצע בהצלחה',
        description: `נשמרו ${checkInsToSave.length} דיווחים`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן היה לשמור את הדיווחים',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentDate: string,
    currentField: keyof DayData,
    fieldIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      // Find next field
      const currentDayIndex = dayData.findIndex((d) => d.date === currentDate);
      const fields: Array<keyof DayData> = [
        // Physical (6)
        'weight',
        'belly_circumference',
        'waist_circumference',
        'thigh_circumference',
        'arm_circumference',
        'neck_circumference',
        // Activity (4)
        'steps_actual',
        'exercises_count',
        'cardio_amount',
        'intervals_count',
        // Nutrition (4)
        'calories_daily',
        'protein_daily',
        'fiber_daily',
        'water_amount',
        // Wellness (4)
        'stress_level',
        'hunger_level',
        'energy_level',
        'sleep_hours',
      ];
      
      const currentFieldIndex = fields.indexOf(currentField);
      let nextFieldIndex = currentFieldIndex + 1;
      let nextDayIndex = currentDayIndex;
      
      // Move to next day if at end of fields
      if (nextFieldIndex >= fields.length) {
        nextFieldIndex = 0;
        nextDayIndex = currentDayIndex + 1;
      }
      
      // Move to previous day if at start and going backwards
      if (e.shiftKey && currentFieldIndex === 0 && currentDayIndex > 0) {
        nextDayIndex = currentDayIndex - 1;
        nextFieldIndex = fields.length - 1;
      }
      
      if (nextDayIndex >= 0 && nextDayIndex < dayData.length) {
        const nextField = fields[nextFieldIndex];
        const nextInput = document.querySelector(
          `input[data-date="${dayData[nextDayIndex].date}"][data-field="${nextField}"]`
        ) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-black">דיווח מרובה ימים</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full border-collapse min-w-max" dir="rtl">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-right sticky right-0 bg-slate-50 min-w-[120px]">
                    תאריך
                  </th>
                  {/* Physical (6) */}
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    משקל (ק״ג)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    היקף בטן (ס״מ)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    היקף מותן (ס״מ)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    היקף ירכיים (ס״מ)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    היקף יד (ס״מ)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    היקף צוואר (ס״מ)
                  </th>
                  {/* Activity (4) */}
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    צעדים
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    תרגילים
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    אירובי (דקות)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    אינטרוולים
                  </th>
                  {/* Nutrition (4) */}
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    קלוריות
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    חלבון (גרם)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    סיבים (גרם)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    מים (ליטר)
                  </th>
                  {/* Wellness (4) */}
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    לחץ (1-10)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    רעב (1-10)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    אנרגיה (1-10)
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[80px]">
                    שינה (שעות)
                  </th>
                  {/* Notes */}
                  <th className="border border-slate-200 px-3 py-2 text-xs uppercase tracking-widest text-black font-bold text-center min-w-[150px]">
                    הערות
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayData.map((day, dayIndex) => {
                  const dateObj = new Date(day.date);
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <tr key={day.date} className={isToday ? 'bg-blue-50' : ''}>
                      <td className="border border-slate-200 px-3 py-2 text-sm font-medium text-black sticky right-0 bg-white z-0">
                        {format(dateObj, 'd בMMMM', { locale: he })}
                        {isToday && ' (היום)'}
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="weight"
                          value={day.weight ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'weight', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'weight', 0)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          step="0.1"
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="steps_actual"
                          value={day.steps_actual ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'steps_actual', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'steps_actual', 1)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="calories_daily"
                          value={day.calories_daily ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'calories_daily', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'calories_daily', 2)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="protein_daily"
                          value={day.protein_daily ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'protein_daily', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'protein_daily', 3)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="exercises_count"
                          value={day.exercises_count ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'exercises_count', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'exercises_count', 4)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="stress_level"
                          value={day.stress_level ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val === null || (val >= 1 && val <= 10)) {
                              updateDayData(day.date, 'stress_level', val);
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'stress_level', 5)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          min={1}
                          max={10}
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="hunger_level"
                          value={day.hunger_level ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val === null || (val >= 1 && val <= 10)) {
                              updateDayData(day.date, 'hunger_level', val);
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'hunger_level', 6)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          min={1}
                          max={10}
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="energy_level"
                          value={day.energy_level ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val === null || (val >= 1 && val <= 10)) {
                              updateDayData(day.date, 'energy_level', val);
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'energy_level', 7)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          min={1}
                          max={10}
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="sleep_hours"
                          value={day.sleep_hours ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'sleep_hours', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'sleep_hours', 8)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          min={0}
                          max={24}
                          step={0.5}
                        />
                      </td>
                      <td className="border border-slate-200 p-0">
                        <input
                          type="number"
                          data-date={day.date}
                          data-field="water_amount"
                          value={day.water_amount ?? ''}
                          onChange={(e) =>
                            updateDayData(day.date, 'water_amount', e.target.value === '' ? null : parseFloat(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, day.date, 'water_amount', 9)}
                          className="w-full h-10 px-2 text-sm text-black border-0 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] text-center"
                          placeholder="—"
                          min={0}
                          max={10}
                          step={0.25}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isSubmitting}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
          >
            {isSubmitting ? 'שומר...' : 'שמור הכל'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

