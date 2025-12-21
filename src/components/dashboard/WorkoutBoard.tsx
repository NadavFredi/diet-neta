import { useMemo, useState, useEffect } from 'react';
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
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useWorkoutBoard, DAYS, type Exercise } from '@/hooks/useWorkoutBoard';
import { QuickAddExercise } from './QuickAddExercise';
import { cn } from '@/lib/utils';

interface WorkoutBoardProps {
  mode: 'user' | 'template';
  initialData?: any;
  leadId?: string; // DEPRECATED: Use customerId instead
  customerId?: string;
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
        'p-2 mb-1.5 bg-white border border-gray-200 hover:border-blue-300 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-1.5">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <Input
              value={exercise.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-6 text-xs font-medium border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              placeholder="שם התרגיל"
              dir="rtl"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Input
              type="number"
              value={exercise.sets}
              onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 0 })}
              className="h-5 w-10 text-center border-gray-200 text-xs px-1"
              dir="ltr"
            />
            <span className="text-xs">סטים</span>
            <span className="text-gray-300 text-xs">×</span>
            <Input
              type="number"
              value={exercise.reps}
              onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
              className="h-5 w-10 text-center border-gray-200 text-xs px-1"
              dir="ltr"
            />
            <span className="text-xs">חזרות</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ManualExerciseInputProps {
  onAdd: (name: string) => void;
}

const ManualExerciseInput = ({ onAdd }: ManualExerciseInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exerciseName.trim()) {
      onAdd(exerciseName.trim());
      setExerciseName('');
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setExerciseName('');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} dir="rtl">
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-2 border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 h-10"
          dir="rtl"
        >
          <Edit className="h-4 w-4 ml-2" />
          הוסף תרגיל ידני
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" dir="rtl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="manual-exercise-name" className="text-sm font-medium mb-2 block">
              שם התרגיל
            </Label>
            <Input
              id="manual-exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="הזן שם תרגיל..."
              className="w-full"
              dir="rtl"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="flex-1"
              disabled={!exerciseName.trim()}
            >
              הוסף
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
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
    <div className="flex flex-col h-full flex-1 min-w-0" style={{ flex: '1 1 0%' }} dir="rtl">
      <Card 
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col bg-gray-50 border-2 overflow-hidden transition-colors',
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
        )}
      >
        {/* Day Header */}
        <div className="p-2 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{dayLabel}</h3>
              <p className="text-xs text-gray-500">{dayShort}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {dayData.exercises.length}
              </Badge>
              {totalSets > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {totalSets}
                </Badge>
              )}
            </div>
          </div>
          {!dayData.isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onActivateDay}
              className="w-full text-xs h-7"
            >
              <Plus className="h-3 w-3 ml-1" />
              הפעל יום
            </Button>
          )}
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
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
          <div className="p-2 border-t border-gray-200 bg-white flex-shrink-0 space-y-2">
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
            <ManualExerciseInput
              onAdd={(name) => {
                if (name.trim()) {
                  onAddExercise({
                    id: `${Date.now()}-${Math.random()}`,
                    name: name.trim(),
                    sets: 3,
                    reps: 10,
                  });
                }
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export const WorkoutBoard = ({ mode, initialData, leadId, customerId, onSave, onCancel }: WorkoutBoardProps) => {
  const {
    startDate,
    description,
    generalGoals,
    goalTags,
    weeklyWorkout,
    activeId,
    setStartDate,
    setDescription,
    setGeneralGoals,
    setGoalTags,
    addExercise,
    updateExercise,
    removeExercise,
    updateDay,
    copyFromTemplate,
    duplicateDay,
    getWorkoutData,
    getDndContext,
  } = useWorkoutBoard(mode, initialData, customerId || leadId); // Use customerId, fallback to leadId for backward compatibility

  // Local state for tags input to allow typing commas freely
  const [tagsInput, setTagsInput] = useState(goalTags.join(', '));

  // Sync tagsInput with goalTags when goalTags change (e.g., when editing existing template)
  useEffect(() => {
    setTagsInput(goalTags.join(', '));
  }, [goalTags]);

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
        <div className="p-3 space-y-3">
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
          {mode === 'template' && (
            <div>
              <Label htmlFor="goalTags" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                תגיות (מופרדות בפסיק)
              </Label>
              <div className="space-y-2">
                <Input
                  id="goalTags"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                  }}
                  onBlur={() => {
                    // Parse tags when user finishes typing
                    const tags = tagsInput
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    setGoalTags(tags);
                    setTagsInput(tags.join(', '));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Parse tags when user presses Enter
                      const tags = tagsInput
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                      setGoalTags(tags);
                      setTagsInput(tags.join(', '));
                    }
                  }}
                  placeholder="לדוגמה: חיטוב, כוח, סיבולת"
                  className="w-full"
                  dir="rtl"
                />
                {goalTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {goalTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap" dir="rtl">
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
      <div className="flex-1 overflow-hidden min-h-0" style={{ flexGrow: 1, minHeight: 0 }}>
        <DndContext
          sensors={dndContext.sensors}
          collisionDetection={dndContext.collisionDetection}
          onDragStart={dndContext.onDragStart}
          onDragEnd={dndContext.onDragEnd}
        >
          <div className="flex gap-2 p-2 h-full" style={{ width: '100%', justifyContent: 'space-between' }}>
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
              <Card className="p-3 bg-white border-2 border-blue-400 w-64">
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
      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 flex gap-3" dir="rtl">
        <Button
          type="submit"
          className="flex-1 bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white"
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

