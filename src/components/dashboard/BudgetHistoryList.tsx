import React, { useMemo } from 'react';
import { useBudgetHistory, BudgetHistoryItem } from '@/hooks/useBudgetHistory';
import { formatDate } from '@/utils/dashboard';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, ArrowLeft } from 'lucide-react';
import { useNutritionTemplates } from '@/hooks/useNutritionTemplates';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useSupplementTemplates } from '@/hooks/useSupplementTemplates';

interface BudgetHistoryListProps {
  budgetId?: string | null;
  leadId?: string | null;
}

export const BudgetHistoryList: React.FC<BudgetHistoryListProps> = ({ budgetId, leadId }) => {
  const { data: history, isLoading } = useBudgetHistory(budgetId, leadId);
  
  // Fetch all templates for ID to name resolution
  const { data: nutritionTemplatesData } = useNutritionTemplates();
  const { data: workoutTemplatesData } = useWorkoutTemplates();
  const { data: supplementTemplatesData } = useSupplementTemplates();
  
  // Create lookup maps for template IDs to names
  const templateNameMap = useMemo(() => {
    const map = new Map<string, string>();
    
    // Nutrition templates
    nutritionTemplatesData?.data?.forEach(template => {
      map.set(template.id, template.name);
    });
    
    // Workout templates
    workoutTemplatesData?.data?.forEach(template => {
      map.set(template.id, template.name);
    });
    
    // Supplement templates
    supplementTemplatesData?.data?.forEach(template => {
      map.set(template.id, template.name);
    });
    
    return map;
  }, [nutritionTemplatesData, workoutTemplatesData, supplementTemplatesData]);

  if (!budgetId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
        <History className="h-10 w-10 mb-3 text-gray-300" />
        <p>לא נבחרה תכנית פעולה להצגה</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
        <History className="h-10 w-10 mb-3 text-gray-300" />
        <p>אין היסטוריית שינויים עבור תכנית פעולה זו</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full pl-4" dir="rtl">
      <div className="space-y-4">
        {history.map((item) => (
          <HistoryItem key={item.id} item={item} templateNameMap={templateNameMap} />
        ))}
      </div>
    </ScrollArea>
  );
};

const HistoryItem = ({ item, templateNameMap }: { item: BudgetHistoryItem; templateNameMap: Map<string, string> }) => {
  const changes = getReadableChanges(item, templateNameMap);
  const changeTypeMap: Record<string, string> = {
    'create': 'יצירה',
    'update': 'עדכון',
    'nutrition_create': 'יצירת תוכנית תזונה',
    'nutrition_update': 'עדכון תוכנית תזונה',
    'workout_create': 'יצירת תוכנית אימונים',
    'workout_update': 'עדכון תוכנית אימונים'
  };

  return (
    <Card className="px-4 py-2 border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Badge */}
        <Badge 
          variant="outline"
          className={
            item.change_type.includes('create')
              ? 'bg-green-50 text-green-700 border-green-200 shrink-0' 
              : 'bg-blue-50 text-blue-700 border-blue-200 shrink-0'
          }
        >
          {changeTypeMap[item.change_type] || item.change_type}
        </Badge>

        {/* Content */}
        <div className="flex-1 flex justify-start items-center overflow-hidden">
          {item.change_type === 'create' ? (
            <span className="text-xs text-slate-600 truncate">נוצרה תכנית פעולה חדשה: {item.snapshot?.name}</span>
          ) : item.change_type.includes('create') ? (
             <span className="text-xs text-slate-600 truncate">נוצרה תוכנית חדשה</span>
          ) : (
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide no-scrollbar px-2">
              {changes.map((change, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-700">{getFieldLabel(change.field)}:</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    <span className="text-slate-400 line-through opacity-70 whitespace-normal break-words">{formatValue(change.oldVal, change.field, templateNameMap)}</span>
                    <ArrowLeft className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="text-slate-900 font-medium whitespace-normal break-words">{formatValue(change.newVal, change.field, templateNameMap)}</span>
                  </div>
                  {idx < changes.length - 1 && <span className="text-slate-300">|</span>}
                </div>
              ))}
              {changes.length === 0 && <span className="text-xs text-slate-400 italic">ללא שינויים מהותיים</span>}
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span>{formatDate(item.changed_at)}</span>
          <span>{new Date(item.changed_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-slate-300">|</span>
          <span>{item.changer_name}</span>
        </div>
      </div>
    </Card>
  );
};

// Helper functions
const getFieldLabel = (field: string) => {
  const labels: Record<string, string> = {
    name: 'שם',
    description: 'תיאור',
    steps_goal: 'יעד צעדים',
    steps_instructions: 'הנחיות צעדים',
    nutrition_targets: 'ערכים תזונתיים',
    targets: 'יעדים',
    eating_order: 'סדר ארוחות',
    eating_rules: 'כללי אכילה',
    supplements: 'תוספים',
    is_public: 'ציבורי',
    workout_template_id: 'תבנית אימון',
    nutrition_template_id: 'תבנית תזונה',
    supplement_template_id: 'תבנית תוספים',
    start_date: 'תאריך התחלה',
    strength: 'אימוני כוח',
    cardio: 'אימוני אירובי',
    intervals: 'אימוני אינטרוולים',
    custom_attributes: 'פרטים נוספים',
    workout_goals: 'מטרות האימון',
    workout_day_sunday: 'אימון ראשון',
    workout_day_monday: 'אימון שני',
    workout_day_tuesday: 'אימון שלישי',
    workout_day_wednesday: 'אימון רביעי',
    workout_day_thursday: 'אימון חמישי',
    workout_day_friday: 'אימון שישי',
    workout_day_saturday: 'אימון שבת',
  };
  return labels[field] || field;
};

const formatValue = (val: any, field?: string, templateNameMap?: Map<string, string>): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'כן' : 'לא';
  
  // Check if this is a template ID field and resolve to name
  if (typeof val === 'string' && templateNameMap && field) {
    const templateIdFields = ['workout_template_id', 'nutrition_template_id', 'supplement_template_id'];
    if (templateIdFields.includes(field)) {
      const templateName = templateNameMap.get(val);
      if (templateName) {
        return templateName;
      }
      // If template not found, return the ID but truncated
      return val.length > 20 ? `${val.substring(0, 20)}...` : val;
    }
  }
  
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return 'אין';
      // Supplements array
      if (val[0] && typeof val[0] === 'object' && 'name' in val[0]) {
        return val.map((s: any) => `${s.name} (${s.dosage || '-'}, ${s.timing || '-'})`).join(', ');
      }
      return JSON.stringify(val);
    }
    
    // Nutrition targets
    if ('calories' in val || 'protein' in val) {
       const parts = [];
       if (val.calories) parts.push(`${val.calories} קלוריות`);
       if (val.protein) parts.push(`${val.protein}ג חלבון`);
       if (val.carbs) parts.push(`${val.carbs}ג פחמימה`);
       if (val.fat) parts.push(`${val.fat}ג שומן`);
       if (val.fiber_min) parts.push(`${val.fiber_min}ג סיבים`);
       return parts.length > 0 ? parts.join(', ') : JSON.stringify(val);
    }

    // Workout Plan (custom_attributes) - fallback if not handled by detailed diff
    if ('schema' in val && 'data' in val) {
       if (val.data && val.data.weeklyWorkout) {
         return 'עודכן לוח זמנים שבועי';
       }
       return 'עודכנו פרטים בתוכנית';
    }
    
    return JSON.stringify(val); 
  }
  
  return String(val);
};

const getWeeklyWorkoutChanges = (oldWeekly: any, newWeekly: any) => {
  const changes: { field: string, oldVal: any, newVal: any }[] = [];
  
  // Check General Goals
  const oldGoals = oldWeekly?.generalGoals || '';
  const newGoals = newWeekly?.generalGoals || '';
  if (oldGoals !== newGoals) {
    changes.push({
      field: 'workout_goals',
      oldVal: oldGoals || '-',
      newVal: newGoals || '-'
    });
  }

  // Check Days
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  days.forEach(day => {
    const oldDay = oldWeekly?.days?.[day];
    const newDay = newWeekly?.days?.[day];
    
    // Skip if both are missing/empty
    if (!oldDay && !newDay) return;
    
    // Helper to format day summary
    const formatDay = (d: any) => {
      if (!d || !d.isActive) return 'יום מנוחה';
      const count = d.exercises?.length || 0;
      if (count === 0) return 'ללא תרגילים';
      
      const exercises = d.exercises.map((e: any) => e.name).filter(Boolean).join(', ');
      return `${count} תרגילים: ${exercises}`;
    };

    const oldSummary = formatDay(oldDay);
    const newSummary = formatDay(newDay);
    
    // Detect changes
    // We check deeper to catch updates even if summary is similar (though summary includes names so it captures adds/removes/renames)
    // If we want to catch changes in sets/reps, we need a smarter check.
    
    const isDifferent = JSON.stringify(oldDay) !== JSON.stringify(newDay);
    
    if (isDifferent) {
      // If summary is the same but details changed (e.g. reps changed), append "(עודכן)"
      let finalNewSummary = newSummary;
      if (oldSummary === newSummary && isDifferent) {
         finalNewSummary += ' (עודכנו סטים/חזרות)';
      }
      
      changes.push({
        field: `workout_day_${day}`,
        oldVal: oldSummary,
        newVal: finalNewSummary
      });
    }
  });

  return changes;
};

const getReadableChanges = (item: BudgetHistoryItem, templateNameMap: Map<string, string>) => {
  const changes: { field: string, oldVal: any, newVal: any }[] = [];
  const oldData = item.changes?.old;
  const newData = item.changes?.new;

  if (!oldData || !newData) return [];

  const ignoreFields = ['id', 'created_at', 'updated_at', 'created_by'];
  
  Object.keys(newData).forEach(key => {
    if (ignoreFields.includes(key)) return;
    
    // Special handling for workout plan details
    if (key === 'custom_attributes') {
      const oldWeekly = oldData[key]?.data?.weeklyWorkout;
      const newWeekly = newData[key]?.data?.weeklyWorkout;
      
      if (oldWeekly || newWeekly) {
        const weeklyChanges = getWeeklyWorkoutChanges(oldWeekly, newWeekly);
        if (weeklyChanges.length > 0) {
          changes.push(...weeklyChanges);
          return;
        }
      }
    }
    
    // Simple comparison
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
       // If we already handled custom_attributes above, we don't want to add it again
       // But if getWeeklyWorkoutChanges returned empty (no visible changes in weekly workout), 
       // but custom_attributes changed in some other way (e.g. schema), we might want to show it.
       // For now, if it's custom_attributes and we didn't return above, we assume no meaningful weekly workout change 
       // or it's a non-weekly-workout change.
       
       if (key === 'custom_attributes') {
          // If we are here, it means either:
          // 1. Not a weekly workout update
          // 2. Weekly workout update but no detected changes (unlikely if stringify differs)
          
          // Let's fallback to default behavior ONLY if it's NOT weekly workout data
          // If it IS weekly workout data but getWeeklyWorkoutChanges found nothing, then we shouldn't show a confusing generic message.
          const isWeeklyWorkout = oldData[key]?.data?.weeklyWorkout || newData[key]?.data?.weeklyWorkout;
          if (isWeeklyWorkout) return; // Skip generic message for weekly workout
       }

       changes.push({
         field: key,
         oldVal: oldData[key],
         newVal: newData[key]
       });
    }
  });

  return changes;
};
