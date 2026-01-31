/**
 * IntervalActivityModal Component
 * 
 * Modal for viewing and editing interval training (interval_training) from budget
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Trash2, Plus, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateBudget } from '@/hooks/useBudgets';
import type { IntervalTraining } from '@/store/slices/budgetSlice';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface IntervalTrainingWithId extends IntervalTraining {
    id: string;
}

interface IntervalActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetId: string | null;
    intervalTraining: IntervalTraining[] | null;
    leadId?: string | null;
}


export const IntervalActivityModal = ({
    isOpen,
    onClose,
    budgetId,
    intervalTraining,
    leadId,
}: IntervalActivityModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const updateBudget = useUpdateBudget();
    const [isSaving, setIsSaving] = useState(false);
    const [intervalTrainings, setIntervalTrainings] = useState<IntervalTrainingWithId[]>([]);

    // Initialize interval trainings from interval_training
    useEffect(() => {
        if (isOpen && intervalTraining) {
            if (Array.isArray(intervalTraining) && intervalTraining.length > 0) {
                const formatted: IntervalTrainingWithId[] = intervalTraining.map((item, index) => ({
                    id: `interval-${Date.now()}-${index}`,
                    activity_type: item.activity_type || '',
                    activity_duration_seconds: item.activity_duration_seconds || 0,
                    rest_duration_seconds: item.rest_duration_seconds || 0,
                    sets: item.sets || 0,
                    workouts_per_week: item.workouts_per_week || 0,
                    notes: item.notes || '',
                }));
                setIntervalTrainings(formatted);
            } else {
                setIntervalTrainings([]);
            }
        } else if (isOpen && !intervalTraining) {
            setIntervalTrainings([]);
        }
    }, [isOpen, intervalTraining]);

    const addIntervalTraining = () => {
        const newInterval: IntervalTrainingWithId = {
            id: `interval-${Date.now()}-${intervalTrainings.length}`,
            activity_type: '',
            activity_duration_seconds: 0,
            rest_duration_seconds: 0,
            sets: 0,
            workouts_per_week: 0,
            notes: '',
        };
        setIntervalTrainings([...intervalTrainings, newInterval]);
    };

    const updateIntervalTraining = (id: string, field: string, value: string | number) => {
        setIntervalTrainings((prev) =>
            prev.map((interval) =>
                interval.id === id ? { ...interval, [field]: value } : interval
            )
        );
    };

    const removeIntervalTraining = (id: string) => {
        setIntervalTrainings((prev) => prev.filter((interval) => interval.id !== id));
    };

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds} שניות`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (remainingSeconds === 0) {
            return `${minutes} דקות`;
        }
        return `${minutes} דקות ${remainingSeconds} שניות`;
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

            // Filter out empty intervals (no activity_type and no sets)
            const validIntervals = intervalTrainings.filter(
                (i) => i.activity_type.trim() || i.sets > 0
            );

            // Prepare interval_training array
            const intervalTrainingData = validIntervals
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
                cardio_training: currentBudget.cardio_training || null,
                interval_training: intervalTrainingData.length > 0 ? intervalTrainingData : null,
            });

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
                description: 'אימוני אינטרוולים עודכנו ונשמרו בהצלחה',
            });
            onClose();
        } catch (error: any) {
            toast({
                title: 'שגיאה',
                description: error?.message || 'נכשל בעדכון אימוני אינטרוולים',
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
                        <Zap className="h-5 w-5 text-yellow-600" />
                        עריכת אימוני אינטרוולים
                    </DialogTitle>
                    <DialogDescription>
                        הוסף וערוך אימוני אינטרוולים לתכנית הפעולה
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {intervalTrainings.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-400 mb-3">אין אימוני אינטרוולים</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addIntervalTraining}
                                className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                            >
                                <Plus className="h-4 w-4 ml-1" />
                                הוסף אימון אינטרוולים
                            </Button>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="[&>th]:py-2">
                                        <TableHead className="text-right px-2">איזו פעילות</TableHead>
                                        <TableHead className="text-center w-[150px] px-2">זמן פעילות (שניות)</TableHead>
                                        <TableHead className="text-center w-[150px] px-2">זמן מנוחה (שניות)</TableHead>
                                        <TableHead className="text-center w-[100px] px-2">סטים</TableHead>
                                        <TableHead className="text-center w-[120px] px-2">פעמים בשבוע</TableHead>
                                        <TableHead className="text-right px-4">הערות</TableHead>
                                        <TableHead className="text-center w-[50px] px-2"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {intervalTrainings.map((interval) => (
                                        <TableRow key={interval.id} className="[&>td]:py-1.5">
                                            <TableCell className="px-2">
                                                <Input
                                                    value={interval.activity_type}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'activity_type', e.target.value)}
                                                    placeholder="סוג הפעילות"
                                                    className="h-9 text-sm"
                                                    dir="rtl"
                                                />
                                            </TableCell>
                                            <TableCell className="px-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={interval.activity_duration_seconds || ''}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'activity_duration_seconds', parseInt(e.target.value) || 0)}
                                                    placeholder="שניות"
                                                    className="h-9 text-sm text-center w-full"
                                                    dir="ltr"
                                                />
                                            </TableCell>
                                            <TableCell className="px-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={interval.rest_duration_seconds || ''}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'rest_duration_seconds', parseInt(e.target.value) || 0)}
                                                    placeholder="שניות"
                                                    className="h-9 text-sm text-center w-full"
                                                    dir="ltr"
                                                />
                                            </TableCell>
                                            <TableCell className="px-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={interval.sets || ''}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'sets', parseInt(e.target.value) || 0)}
                                                    placeholder="סטים"
                                                    className="h-9 text-sm text-center w-full"
                                                    dir="ltr"
                                                />
                                            </TableCell>
                                            <TableCell className="px-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={interval.workouts_per_week || ''}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'workouts_per_week', parseInt(e.target.value) || 0)}
                                                    placeholder="פעמים בשבוע"
                                                    className="h-9 text-sm text-center w-full"
                                                    dir="ltr"
                                                />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Textarea
                                                    value={interval.notes || ''}
                                                    onChange={(e) => updateIntervalTraining(interval.id, 'notes', e.target.value)}
                                                    placeholder="הערות"
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
                                                        removeIntervalTraining(interval.id);
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
                                    onClick={addIntervalTraining}
                                    className="w-full text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
                                >
                                    <Plus className="h-4 w-4 ml-1" />
                                    הוסף אימון אינטרוולים נוסף
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
