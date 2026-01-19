/**
 * DailyCheckInDetailModal Component
 * 
 * Modal for viewing and editing daily check-in details
 * Dynamically shows all fields from the checklist configuration
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckInFieldConfigurations } from '@/hooks/useCheckInFieldConfigurations';
import type { DailyCheckIn } from '@/store/slices/clientSlice';

interface DailyCheckInDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIn: DailyCheckIn | null;
  customerId?: string | null;
}

// Field ID to database column name mapping
const FIELD_TO_DB_COLUMN: Record<string, string> = {
  weight: 'weight',
  bellyCircumference: 'belly_circumference',
  waistCircumference: 'waist_circumference',
  thighCircumference: 'thigh_circumference',
  armCircumference: 'arm_circumference',
  neckCircumference: 'neck_circumference',
  stepsActual: 'steps_actual',
  exercisesCount: 'exercises_count',
  cardioAmount: 'cardio_amount',
  intervalsCount: 'intervals_count',
  caloriesDaily: 'calories_daily',
  proteinDaily: 'protein_daily',
  fiberDaily: 'fiber_daily',
  waterAmount: 'water_amount',
  stressLevel: 'stress_level',
  hungerLevel: 'hunger_level',
  energyLevel: 'energy_level',
  sleepHours: 'sleep_hours',
};

// Database column to field ID mapping (reverse)
const DB_COLUMN_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_DB_COLUMN).map(([key, value]) => [value, key])
);

export const DailyCheckInDetailModal = ({
  isOpen,
  onClose,
  checkIn,
  customerId,
}: DailyCheckInDetailModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get field configuration
  const { configuration: fieldConfig, isLoading: isLoadingConfig } = useCheckInFieldConfigurations(customerId);

  // Dynamic form state - stores all field values
  const [form, setForm] = useState<Record<string, string>>({
    check_in_date: '',
  });

  // Initialize form with all fields from check-in
  useEffect(() => {
    if (checkIn && fieldConfig) {
      const initialForm: Record<string, string> = {
        check_in_date: checkIn.check_in_date || '',
      };

      // Initialize all visible fields from configuration
      Object.entries(fieldConfig.fields).forEach(([fieldId, field]) => {
        if (field.visible) {
          const dbColumn = FIELD_TO_DB_COLUMN[fieldId];
          if (dbColumn && checkIn[dbColumn as keyof DailyCheckIn] !== undefined) {
            const value = checkIn[dbColumn as keyof DailyCheckIn];
            initialForm[fieldId] = value !== null && value !== undefined ? value.toString() : '';
          } else {
            initialForm[fieldId] = '';
          }
        }
      });

      setForm(initialForm);
      setIsEditing(false);
    }
  }, [checkIn, fieldConfig]);

  const handleSave = async () => {
    if (!checkIn?.id) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא מזהה דיווח',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build update object dynamically from form and field configuration
      const updateData: Record<string, any> = {
        check_in_date: form.check_in_date,
      };

      // Add all visible fields from configuration
      if (fieldConfig) {
        Object.entries(fieldConfig.fields).forEach(([fieldId, field]) => {
          if (field.visible) {
            const dbColumn = FIELD_TO_DB_COLUMN[fieldId];
            if (dbColumn) {
              const formValue = form[fieldId] || '';
              // Convert to appropriate type based on field
              if (formValue === '') {
                updateData[dbColumn] = null;
              } else if (fieldId === 'weight' || fieldId === 'waterAmount' || fieldId === 'sleepHours') {
                updateData[dbColumn] = parseFloat(formValue) || null;
              } else {
                updateData[dbColumn] = parseInt(formValue) || null;
              }
            }
          }
        });
      }

      await supabase
        .from('daily_check_ins')
        .update(updateData)
        .eq('id', checkIn.id);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['daily-check-ins'] });

      toast({
        title: 'הצלחה',
        description: 'הדיווח עודכן בהצלחה',
      });

      setIsEditing(false);
      onClose();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון הדיווח',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get sorted fields for each section
  const getSortedFieldsForSection = useCallback((sectionKey: 'body' | 'activity' | 'nutrition' | 'wellness') => {
    if (!fieldConfig?.fields) return [];
    return Object.entries(fieldConfig.fields)
      .filter(([_, field]) => field.section === sectionKey && field.visible)
      .sort(([_, a], [__, b]) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });
  }, [fieldConfig]);

  const bodyFields = useMemo(() => getSortedFieldsForSection('body'), [getSortedFieldsForSection]);
  const activityFields = useMemo(() => getSortedFieldsForSection('activity'), [getSortedFieldsForSection]);
  const nutritionFields = useMemo(() => getSortedFieldsForSection('nutrition'), [getSortedFieldsForSection]);
  const wellnessFields = useMemo(() => getSortedFieldsForSection('wellness'), [getSortedFieldsForSection]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setForm((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (fieldId: string, field: { label: string; unit: string; section: string }) => {
    const value = form[fieldId] || '';
    const isSliderField = fieldId === 'stressLevel' || fieldId === 'hungerLevel' || fieldId === 'energyLevel';

    if (isSliderField) {
      const numValue = value ? parseInt(value) : 5;
      return (
        <div className="space-y-2" key={fieldId}>
          <Label htmlFor={fieldId}>{field.label} ({field.unit})</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[numValue]}
              onValueChange={([val]) => handleFieldChange(fieldId, val.toString())}
              min={1}
              max={10}
              step={1}
              disabled={!isEditing}
              className="flex-1"
            />
            <span className="text-sm font-semibold text-[#5B6FB9] min-w-[30px] text-center">
              {numValue}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2" key={fieldId}>
        <Label htmlFor={fieldId}>
          {field.label} {field.unit ? `(${field.unit})` : ''}
        </Label>
        <Input
          id={fieldId}
          type="number"
          step={fieldId === 'weight' || fieldId === 'waterAmount' || fieldId === 'sleepHours' ? (fieldId === 'waterAmount' ? 0.25 : 0.1) : 1}
          min={fieldId === 'sleepHours' ? 0 : (isSliderField ? 1 : undefined)}
          max={fieldId === 'sleepHours' ? 24 : (isSliderField ? 10 : undefined)}
          value={value}
          onChange={(e) => handleFieldChange(fieldId, e.target.value)}
          disabled={!isEditing}
          className="bg-slate-50"
        />
      </div>
    );
  };

  if (!checkIn || isLoadingConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} dir="rtl">
      <DialogContent className="!max-w-[90vw] sm:!max-w-5xl max-h-[90vh] overflow-y-auto w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle>פרטי דיווח יומי</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date field */}
          <div className="space-y-2">
            <Label htmlFor="check_in_date">תאריך</Label>
            <Input
              id="check_in_date"
              type="date"
              value={form.check_in_date}
              onChange={(e) => handleFieldChange('check_in_date', e.target.value)}
              disabled={!isEditing}
              className="bg-slate-50"
            />
          </div>

          {/* Body measurements section */}
          {fieldConfig.sections.body.visible && bodyFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                {fieldConfig.sections.body.label}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {bodyFields.map(([fieldId, field]) => renderField(fieldId, field))}
              </div>
            </div>
          )}

          {/* Activity section */}
          {fieldConfig.sections.activity.visible && activityFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                {fieldConfig.sections.activity.label}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {activityFields.map(([fieldId, field]) => renderField(fieldId, field))}
              </div>
            </div>
          )}

          {/* Nutrition section */}
          {fieldConfig.sections.nutrition.visible && nutritionFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                {fieldConfig.sections.nutrition.label}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {nutritionFields.map(([fieldId, field]) => renderField(fieldId, field))}
              </div>
            </div>
          )}

          {/* Wellness section */}
          {fieldConfig.sections.wellness.visible && wellnessFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                {fieldConfig.sections.wellness.label}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {wellnessFields.map(([fieldId, field]) => renderField(fieldId, field))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {!isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                סגור
              </Button>
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
              >
                ערוך
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form - will be handled by useEffect when checkIn changes
                  if (checkIn && fieldConfig) {
                    const resetForm: Record<string, string> = {
                      check_in_date: checkIn.check_in_date || '',
                    };
                    Object.entries(fieldConfig.fields).forEach(([fieldId, field]) => {
                      if (field.visible) {
                        const dbColumn = FIELD_TO_DB_COLUMN[fieldId];
                        if (dbColumn && checkIn[dbColumn as keyof DailyCheckIn] !== undefined) {
                          const value = checkIn[dbColumn as keyof DailyCheckIn];
                          resetForm[fieldId] = value !== null && value !== undefined ? value.toString() : '';
                        } else {
                          resetForm[fieldId] = '';
                        }
                      }
                    });
                    setForm(resetForm);
                  }
                }}
                disabled={isSaving}
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

