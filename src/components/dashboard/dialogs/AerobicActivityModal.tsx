/**
 * AerobicActivityModal Component
 * 
 * Modal for viewing and editing aerobic activity (cardio_training) from budget
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Trash2, Plus, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateBudget } from '@/hooks/useBudgets';
import { useSaveActionPlan, createBudgetSnapshot } from '@/hooks/useSavedActionPlans';
import type { CardioTraining } from '@/store/slices/budgetSlice';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface CardioTrainingWithId extends CardioTraining {
    id: string;
}

interface AerobicActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetId: string | null;
    cardioTraining: CardioTraining[] | null;
    leadId?: string | null;
}


export const AerobicActivityModal = ({
    isOpen,
    onClose,
    budgetId,
    cardioTraining,
    leadId,
}: AerobicActivityModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const updateBudget = useUpdateBudget();
    const saveActionPlan = useSaveActionPlan();
    const [isSaving, setIsSaving] = useState(false);
    const [workoutTrainings, setWorkoutTrainings] = useState<CardioTrainingWithId[]>([]);

    // Initialize workout trainings from cardio_training
    useEffect(() => {
        if (isOpen && cardioTraining) {
            if (Array.isArray(cardioTraining) && cardioTraining.length > 0) {
                const formatted: CardioTrainingWithId[] = cardioTraining.map((item, index) => ({
                    id: `workout-${Date.now()}-${index}`,
                    name: item.name || '',
                    type: (item.type || 'erobi') as 'erobi' | 'intervals',
                    duration_minutes: item.duration_minutes || 0,
                    workouts_per_week: item.workouts_per_week || 0,
                    period_type: item.period_type || 'לשבוע',
                    notes: item.notes || '',
                }));
                setWorkoutTrainings(formatted);
            } else {
                setWorkoutTrainings([]);
            }
        } else if (isOpen && !cardioTraining) {
            setWorkoutTrainings([]);
        }
    }, [isOpen, cardioTraining]);

    const addWorkoutTraining = () => {
        const newWorkout: CardioTrainingWithId = {
            id: `workout-${Date.now()}-${workoutTrainings.length}`,
            name: '',
            type: 'erobi',
            duration_minutes: 0,
            workouts_per_week: 0,
            period_type: 'לשבוע',
            notes: '',
        };
        setWorkoutTrainings([...workoutTrainings, newWorkout]);
    };

    const updateWorkoutTraining = (id: string, field: string, value: string | number) => {
        setWorkoutTrainings((prev) =>
            prev.map((workout) =>
                workout.id === id ? { ...workout, [field]: value } : workout
            )
        );
    };

    const removeWorkoutTraining = (id: string) => {
        setWorkoutTrainings((prev) => prev.filter((workout) => workout.id !== id));
    };

    const handleSave = async () => {
        if (!budgetId) {
            toast({
                title: 'שגיאה',
                description: 'חסר מזהה תכנית פעולה',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            // Fetch current budget to preserve other fields
            const { data: currentBudget, error: fetchError } = await supabase
                .from('budgets')
                .select('*')
                .eq('id', budgetId)
                .single();

            if (fetchError) throw fetchError;
            if (!currentBudget) {
                throw new Error('תכנית פעולה לא נמצאה');
            }

            // Filter out empty workouts (no name and no duration)
            const validWorkouts = workoutTrainings.filter(
                (w) => w.name.trim() || w.duration_minutes > 0
            );

            // Prepare cardio_training array (only aerobic activities, type === 'erobi')
            const cardioTrainingData = validWorkouts
                .filter((w) => w.type === 'erobi')
                .map(({ id, ...rest }) => rest); // Remove temporary id

            // Update budget
            await updateBudget.mutateAsync({
                budgetId,
                name: currentBudget.name,
                description: currentBudget.description || null,
                nutrition_template_id: currentBudget.nutrition_template_id,
                nutrition_targets: currentBudget.nutrition_targets,
                steps_goal: currentBudget.steps_goal,
                steps_instructions: currentBudget.steps_instructions || null,
                workout_template_id: currentBudget.workout_template_id,
                supplement_template_id: currentBudget.supplement_template_id,
                supplements: currentBudget.supplements || [],
                eating_order: currentBudget.eating_order || null,
                eating_rules: currentBudget.eating_rules || null,
                cardio_training: cardioTrainingData.length > 0 ? cardioTrainingData : null,
                interval_training: currentBudget.interval_training || null,
            });

            // Get updated budget and templates for snapshot
            const { data: updatedBudget } = await supabase
                .from('budgets')
                .select('*')
                .eq('id', budgetId)
                .single();

            let nutritionTemplate = null;
            if (updatedBudget?.nutrition_template_id) {
                const { data } = await supabase
                    .from('nutrition_templates')
                    .select('*')
                    .eq('id', updatedBudget.nutrition_template_id)
                    .single();
                nutritionTemplate = data;
            }

            let workoutTemplate = null;
            if (updatedBudget?.workout_template_id) {
                const { data } = await supabase
                    .from('workout_templates')
                    .select('*')
                    .eq('id', updatedBudget.workout_template_id)
                    .single();
                workoutTemplate = data;
            }

            // Save action plan snapshot
            if (updatedBudget) {
                const snapshot = createBudgetSnapshot(updatedBudget, nutritionTemplate, workoutTemplate);
                await saveActionPlan.mutateAsync({
                    budget_id: budgetId,
                    lead_id: leadId,
                    name: updatedBudget.name,
                    description: updatedBudget.description || null,
                    snapshot,
                });
            }

            // Invalidate queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['budget', budgetId] }),
                queryClient.invalidateQueries({ queryKey: ['budgets'] }),
                queryClient.invalidateQueries({ queryKey: ['plans-history'] }),
            ]);

            // Refetch to ensure UI updates immediately
            await queryClient.refetchQueries({ queryKey: ['budget', budgetId] });
            await queryClient.refetchQueries({ queryKey: ['plans-history'] });

            toast({
                title: 'הצלחה',
                description: 'פעילות אירובית עודכנה ונשמרה בהצלחה',
            });
            onClose();
        } catch (error: any) {
            toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל בעדכון פעילות אירובית',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto min-w-[1200px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        עריכת פעילות אירובית
                    </DialogTitle>
                    <DialogDescription>
                        הוסף וערוך פעילויות אירוביות לתכנית הפעולה
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {workoutTrainings.filter((w) => w.type === 'erobi').length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-400 mb-3">אין פעילות אירובית</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addWorkoutTraining}
                                className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                            >
                                <Plus className="h-4 w-4 ml-1" />
                                הוסף פעילות אירובית
                            </Button>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="[&>th]:py-2">
                                        <TableHead className="text-right px-2">שם האימון</TableHead>
                                        <TableHead className="text-center w-[120px] px-2">דקות/אימון</TableHead>
                                        <TableHead className="text-center w-[80px] px-2">פעמים בשבוע</TableHead>
                                        <TableHead className="text-right px-4">הנחיות</TableHead>
                                        <TableHead className="text-center w-[50px] px-2"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workoutTrainings
                                        .filter((w) => w.type === 'erobi')
                                        .map((workout) => (
                                            <TableRow key={workout.id} className="[&>td]:py-1.5">
                                                <TableCell className="px-2">
                                                    <Input
                                                        value={workout.name}
                                                        onChange={(e) => updateWorkoutTraining(workout.id, 'name', e.target.value)}
                                                        placeholder="שם האימון"
                                                        className="h-9 text-sm"
                                                        dir="rtl"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={workout.duration_minutes || ''}
                                                        onChange={(e) => updateWorkoutTraining(workout.id, 'duration_minutes', parseInt(e.target.value) || 0)}
                                                        placeholder="דקות"
                                                        className="h-9 text-sm text-center w-full"
                                                        dir="ltr"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={workout.workouts_per_week || ''}
                                                        onChange={(e) => updateWorkoutTraining(workout.id, 'workouts_per_week', parseInt(e.target.value) || 0)}
                                                        placeholder="פעמים בשבוע"
                                                        className="h-9 text-sm text-center w-full"
                                                        dir="ltr"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-4">
                                                    <Textarea
                                                        value={workout.notes}
                                                        onChange={(e) => updateWorkoutTraining(workout.id, 'notes', e.target.value)}
                                                        placeholder="הנחיות"
                                                        className="text-sm min-h-[36px] resize-none w-full"
                                                        dir="rtl"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            removeWorkoutTraining(workout.id);
                                                        }}
                                                        className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                            <div className="p-3 border-t">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addWorkoutTraining}
                                    className="w-full text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                                >
                                    <Plus className="h-4 w-4 ml-1" />
                                    הוסף פעילות אירובית נוספת
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-row-reverse justify-end gap-2 pt-4 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-10 px-6 bg-gradient-to-r from-[#5B6FB9] to-[#5B6FB9]/90 text-white font-semibold text-sm hover:from-[#5B6FB9]/90 hover:to-[#5B6FB9]"
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-10 px-5 text-sm"
                    >
                        <X className="h-4 w-4 ml-2" />
                        ביטול
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
