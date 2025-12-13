import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Copy, Save, X } from 'lucide-react';
import type { WorkoutPlan } from './WorkoutPlanCard';
import type { WeeklyWorkout, DayWorkout } from './WeeklyWorkoutBuilder';
import { SessionBuilder } from './SessionBuilder';
import { WorkoutBuilderHeader } from './WorkoutBuilderHeader';
import { useWorkoutBuilder, type WorkoutBuilderMode } from '@/hooks/useWorkoutBuilder';

// Days ordered for RTL - Sunday on far right (first in array with justify-start)
const DAYS = [
  { key: 'sunday', label: 'ראשון', short: 'א' },
  { key: 'monday', label: 'שני', short: 'ב' },
  { key: 'tuesday', label: 'שלישי', short: 'ג' },
  { key: 'wednesday', label: 'רביעי', short: 'ד' },
  { key: 'thursday', label: 'חמישי', short: 'ה' },
  { key: 'friday', label: 'שישי', short: 'ו' },
  { key: 'saturday', label: 'שבת', short: 'ש' },
] as const;

interface WorkoutBuilderFormProps {
  mode: WorkoutBuilderMode;
  initialData?: WorkoutPlan | { routine_data?: any };
  onSave: (data: Partial<WorkoutPlan> | { name: string; description: string; goal_tags: string[]; routine_data: any }) => void;
  onCancel: () => void;
  leadId?: string;
}

export const WorkoutBuilderForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
  leadId,
}: WorkoutBuilderFormProps) => {
  const {
    activeTab,
    startDate,
    description,
    generalGoals,
    weeklyWorkout,
    setActiveTab,
    setStartDate,
    setDescription,
    setGeneralGoals,
    updateDay,
    duplicateDay,
    copyFromTemplate,
    getWorkoutData,
  } = useWorkoutBuilder(mode, initialData, leadId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = getWorkoutData();
      
      if (mode === 'user') {
        onSave(data.planData);
      } else {
        onSave(data.templateData!);
      }
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירת התוכנית');
    }
  };

  const activeDaysCount = Object.values(weeklyWorkout.days).filter((d) => d.isActive).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" style={{ height: '100%' }} dir="rtl">
      {/* Header - Fixed, Never Shrinks */}
      <div className="flex-shrink-0" style={{ flexShrink: 0 }}>
        <WorkoutBuilderHeader
          startDate={startDate}
          setStartDate={setStartDate}
          description={description}
          setDescription={setDescription}
          generalGoals={generalGoals}
          setGeneralGoals={setGeneralGoals}
          activeDaysCount={activeDaysCount}
        />
      </div>

      {/* Day Tabs - Flex Grow Container */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            const dayKey = value as keyof WeeklyWorkout['days'];
            // Auto-activate day when tab is selected
            const dayData = weeklyWorkout.days[dayKey];
            if (!dayData || (!dayData.isActive && dayData.exercises.length === 0)) {
              updateDay(dayKey, {
                isActive: true,
                exercises: dayData?.exercises || [],
              });
            }
            setActiveTab(value);
          }} 
          className="flex-1 flex flex-col min-h-0" 
          style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {/* Tabs Header - Fixed, Never Shrinks */}
          <div className="flex-shrink-0 border-b border-slate-200 bg-white" style={{ flexShrink: 0 }} dir="rtl">
            <TabsList className="w-full justify-start h-auto p-2 bg-transparent" dir="rtl">
              {DAYS.map((day) => {
                const dayData = weeklyWorkout.days[day.key as keyof WeeklyWorkout['days']];
                const exerciseCount = dayData?.exercises?.length || 0;
                return (
                  <TabsTrigger
                    key={day.key}
                    value={day.key}
                    className="flex flex-col items-center gap-1 px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                  >
                    <span className="text-xs font-medium">{day.short}</span>
                    <span className="text-sm font-semibold">{day.label}</span>
                    {dayData?.isActive && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        {exerciseCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Quick Actions Bar */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap" dir="rtl">
              <span className="text-xs font-medium text-slate-600">תבניות מהירות:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('push')}
                className="h-7 text-xs"
              >
                דחיפה
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('pull')}
                className="h-7 text-xs"
              >
                משיכה
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('legs')}
                className="h-7 text-xs"
              >
                רגליים
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('upper')}
                className="h-7 text-xs"
              >
                פלג עליון
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromTemplate('lower')}
                className="h-7 text-xs"
              >
                פלג תחתון
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentDay = activeTab as keyof WeeklyWorkout['days'];
                  const currentIndex = DAYS.findIndex((d) => d.key === currentDay);
                  const nextDayIndex = currentIndex + 1;
                  if (nextDayIndex < DAYS.length) {
                    duplicateDay(currentDay, DAYS[nextDayIndex].key as keyof WeeklyWorkout['days']);
                  }
                }}
                className="h-7 text-xs"
                dir="rtl"
              >
                <Copy className="h-3 w-3 ml-1" />
                העתק ליום הבא
              </Button>
            </div>
          </div>

          {/* Day Content - Scrollable Middle Section */}
          <div className="flex-1 overflow-hidden min-h-0" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
            {DAYS.map((day) => {
              const dayKey = day.key as keyof WeeklyWorkout['days'];
              const dayData = weeklyWorkout.days[dayKey];
              const safeDayData: DayWorkout = dayData || {
                day: dayKey,
                isActive: false,
                exercises: [],
              };
              return (
                <TabsContent
                  key={day.key}
                  value={day.key}
                  className="mt-0 p-6 h-full flex flex-col min-h-0 overflow-hidden"
                  style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  dir="rtl"
                >
                  <SessionBuilder
                    day={safeDayData}
                    onUpdate={(updates) => updateDay(dayKey, updates)}
                  />
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>

      {/* Footer Actions - Fixed, Never Shrinks */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4 flex gap-3" style={{ flexShrink: 0 }} dir="rtl">
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 ml-2" />
          {mode === 'user' ? 'שמור תוכנית' : 'שמור תבנית'}
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

