import { useMemo } from 'react';
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Plus,
  GripVertical,
  X,
  Target,
  FileText,
  Copy,
  Zap,
  Dumbbell,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useWorkoutBoard, DAYS, type Exercise } from '@/hooks/useWorkoutBoard';
import { QuickAddExercise } from './QuickAddExercise';
import { cn } from '@/lib/utils';

interface WorkoutBoardProps {
  mode: 'user' | 'template';
  initialData?: any;
  leadId?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

interface ExerciseCardProps {
  exercise: Exercise;
  dayKey: string;
  onUpdate: (updates: Partial<Exercise>) => void;
  onRemove: () => void;
  isDragging?: boolean;
}

const ExerciseCard = ({ exercise, dayKey, onUpdate, onRemove, isDragging }: ExerciseCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `${dayKey}-${exercise.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 mb-2 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Input
              value={exercise.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-7 text-sm font-medium border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              placeholder="שם התרגיל"
              dir="rtl"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Input
              type="number"
              value={exercise.sets}
              onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 0 })}
              className="h-6 w-12 text-center border-gray-200 text-xs"
              dir="ltr"
            />
            <span>סטים</span>
            <span className="text-gray-300">×</span>
            <Input
              type="number"
              value={exercise.reps}
              onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
              className="h-6 w-12 text-center border-gray-200 text-xs"
              dir="ltr"
            />
            <span>חזרות</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface DayColumnProps {
  dayKey: string;
  dayLabel: string;
  dayShort: string;
  dayData: {
    day: string;
    isActive: boolean;
    exercises: Exercise[];
  };
  onAddExercise: (exercise: Exercise) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onActivateDay: () => void;
  onCopyTemplate: (template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => void;
  activeId: string | null;
}

const DayColumn = ({
  dayKey,
  dayLabel,
  dayShort,
  dayData,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onActivateDay,
  onCopyTemplate,
  activeId,
}: DayColumnProps) => {
  const exerciseIds = dayData.exercises.map((ex) => `${dayKey}-${ex.id}`);
  const totalSets = dayData.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `${dayKey}-column`,
  });

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[280px]" dir="rtl">
      <Card 
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col bg-gray-50 border-2 overflow-hidden transition-colors',
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
        )}
      >
        {/* Day Header */}
        <div className="p-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{dayLabel}</h3>
              <p className="text-xs text-gray-500">{dayShort}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {dayData.exercises.length} תרגילים
              </Badge>
              {totalSets > 0 && (
                <Badge variant="outline" className="text-xs">
                  {totalSets} סטים
                </Badge>
              )}
            </div>
          </div>
          {!dayData.isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onActivateDay}
              className="w-full text-xs"
            >
              <Plus className="h-3 w-3 ml-1" />
              הפעל יום
            </Button>
          )}
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {dayData.isActive ? (
            <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {dayData.exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    dayKey={dayKey}
                    onUpdate={(updates) => onUpdateExercise(exercise.id, updates)}
                    onRemove={() => onRemoveExercise(exercise.id)}
                    isDragging={activeId === `${dayKey}-${exercise.id}`}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
              <Dumbbell className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm mb-2">יום מנוחה</p>
              <p className="text-xs">לחץ על "הפעל יום" למעלה</p>
              <p className="text-xs">או הוסף תרגיל למטה</p>
            </div>
          )}

          {/* Empty State when active but no exercises */}
          {dayData.isActive && dayData.exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm mb-2">אין תרגילים</p>
              <p className="text-xs">גרור לכאן או לחץ למטה להוספה</p>
            </div>
          )}
        </div>

        {/* Quick Add Footer */}
        {dayData.isActive && (
          <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
            <QuickAddExercise
              onSelect={(name) => {
                onAddExercise({
                  id: `${Date.now()}-${Math.random()}`,
                  name: name || '',
                  sets: 3,
                  reps: 10,
                });
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export const WorkoutBoard = ({ mode, initialData, leadId, onSave, onCancel }: WorkoutBoardProps) => {
  const {
    startDate,
    description,
    generalGoals,
    weeklyWorkout,
    activeId,
    setStartDate,
    setDescription,
    setGeneralGoals,
    addExercise,
    updateExercise,
    removeExercise,
    updateDay,
    copyFromTemplate,
    duplicateDay,
    getWorkoutData,
    getDndContext,
  } = useWorkoutBoard(mode, initialData, leadId);

  const dndContext = getDndContext();
  const activeDaysCount = Object.values(weeklyWorkout.days).filter((d) => d.isActive).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = getWorkoutData();
      if (mode === 'user') {
        onSave(data.planData!);
      } else {
        onSave(data.templateData!);
      }
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירת התוכנית');
    }
  };

  const activeExercise = useMemo(() => {
    if (!activeId) return null;
    const [dayKey, exerciseId] = activeId.split('-');
    if (!dayKey || !exerciseId || dayKey === 'column') return null;
    const day = weeklyWorkout.days[dayKey as keyof typeof weeklyWorkout.days];
    return day?.exercises.find((ex) => ex.id === exerciseId) || null;
  }, [activeId, weeklyWorkout]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b-2 border-slate-200 shadow-sm">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="start_date" className="text-sm font-semibold text-slate-700">
                תאריך התחלה:
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 justify-start text-right font-normal"
                    disabled={mode === 'template'}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {activeDaysCount} ימים פעילים
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                {mode === 'template' ? 'שם התבנית' : 'תיאור כללי'}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={mode === 'template' ? 'שם התבנית...' : 'תיאור קצר של התוכנית...'}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="generalGoals" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                {mode === 'template' ? 'תיאור התבנית' : 'מטרות כלליות'}
              </Label>
              <Textarea
                id="generalGoals"
                value={generalGoals}
                onChange={(e) => setGeneralGoals(e.target.value)}
                placeholder={mode === 'template' ? 'תיאור התבנית...' : 'מטרות התוכנית...'}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap" dir="rtl">
        <span className="text-xs font-medium text-slate-600">תבניות מהירות:</span>
        {(['push', 'pull', 'legs', 'upper', 'lower'] as const).map((template) => (
          <Button
            key={template}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Apply to first active day or first day
              const firstActiveDay = DAYS.find((d) => weeklyWorkout.days[d.key as keyof typeof weeklyWorkout.days].isActive);
              const targetDay = firstActiveDay?.key || DAYS[0].key;
              copyFromTemplate(targetDay as any, template);
            }}
            className="h-7 text-xs"
          >
            {template === 'push' && 'דחיפה'}
            {template === 'pull' && 'משיכה'}
            {template === 'legs' && 'רגליים'}
            {template === 'upper' && 'פלג עליון'}
            {template === 'lower' && 'פלג תחתון'}
          </Button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0" style={{ flexGrow: 1, minHeight: 0 }}>
        <DndContext
          sensors={dndContext.sensors}
          collisionDetection={dndContext.collisionDetection}
          onDragStart={dndContext.onDragStart}
          onDragEnd={dndContext.onDragEnd}
        >
          <div className="flex gap-4 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {DAYS.map((day) => {
              const dayKey = day.key as keyof typeof weeklyWorkout.days;
              const dayData = weeklyWorkout.days[dayKey];
              
              return (
                <DayColumn
                  key={day.key}
                  dayKey={day.key}
                  dayLabel={day.label}
                  dayShort={day.short}
                  dayData={dayData}
                  onAddExercise={(exercise) => addExercise(dayKey, exercise)}
                  onUpdateExercise={(exerciseId, updates) => updateExercise(dayKey, exerciseId, updates)}
                  onRemoveExercise={(exerciseId) => removeExercise(dayKey, exerciseId)}
                  onActivateDay={() => updateDay(dayKey, { isActive: true })}
                  onCopyTemplate={(template) => copyFromTemplate(dayKey, template)}
                  activeId={activeId}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeExercise && (
              <Card className="p-3 bg-white border-2 border-blue-400 shadow-lg w-64">
                <div className="font-medium text-sm">{activeExercise.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {activeExercise.sets} סטים × {activeExercise.reps} חזרות
                </div>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4 flex gap-3" dir="rtl">
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          שמור {mode === 'user' ? 'תוכנית' : 'תבנית'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          <X className="h-4 w-4 ml-2" />
          ביטול
        </Button>
      </div>
    </form>
  );
};

