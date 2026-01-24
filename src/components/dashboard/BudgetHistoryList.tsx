import React from 'react';
import { useBudgetHistory, BudgetHistoryItem } from '@/hooks/useBudgetHistory';
import { formatDate } from '@/utils/dashboard';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, ArrowLeft } from 'lucide-react';

interface BudgetHistoryListProps {
  budgetId?: string | null;
}

export const BudgetHistoryList: React.FC<BudgetHistoryListProps> = ({ budgetId }) => {
  const { data: history, isLoading } = useBudgetHistory(budgetId);

  if (!budgetId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
        <History className="h-10 w-10 mb-3 text-gray-300" />
        <p>לא נבחר תקציב להצגה</p>
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
        <p>אין היסטוריית שינויים עבור תקציב זה</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full pr-4">
      <div className="space-y-4">
        {history.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </div>
    </ScrollArea>
  );
};

const HistoryItem = ({ item }: { item: BudgetHistoryItem }) => {
  const changes = getReadableChanges(item);

  return (
    <Card className="p-3 border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
            {formatDate(item.changed_at)}
            {' '}
            {new Date(item.changed_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </Badge>
          <span className="text-xs text-gray-500">עודכן על ידי: {item.changer_name}</span>
        </div>
        <Badge 
          className={
            item.change_type === 'create' 
              ? 'bg-green-100 text-green-700 hover:bg-green-100' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
          }
        >
          {item.change_type === 'create' ? 'יצירה' : 'עדכון'}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        {item.change_type === 'create' ? (
          <div className="text-gray-600">נוצר תקציב חדש: {item.snapshot?.name}</div>
        ) : (
          <div className="space-y-1">
            {changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-2 text-gray-700 bg-slate-50 p-2 rounded text-xs">
                <span className="font-semibold min-w-[80px]">{getFieldLabel(change.field)}:</span>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <span className="text-red-500 line-through opacity-70 bg-white px-1 rounded">{formatValue(change.oldVal)}</span>
                  <ArrowLeft className="h-3 w-3 text-slate-400" />
                  <span className="text-green-600 font-medium bg-white px-1 rounded border border-green-100">{formatValue(change.newVal)}</span>
                </div>
              </div>
            ))}
            {changes.length === 0 && <div className="text-gray-400 italic">ללא שינויים מהותיים</div>}
          </div>
        )}
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
    eating_order: 'סדר ארוחות',
    eating_rules: 'כללי אכילה',
    supplements: 'תוספים',
    is_public: 'ציבורי',
    workout_template_id: 'תבנית אימון',
    nutrition_template_id: 'תבנית תזונה'
  };
  return labels[field] || field;
};

const formatValue = (val: any): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'object') return JSON.stringify(val); // Simplified for objects
  if (typeof val === 'boolean') return val ? 'כן' : 'לא';
  return String(val);
};

const getReadableChanges = (item: BudgetHistoryItem) => {
  const changes: { field: string, oldVal: any, newVal: any }[] = [];
  const oldData = item.changes?.old;
  const newData = item.changes?.new;

  if (!oldData || !newData) return [];

  const ignoreFields = ['id', 'created_at', 'updated_at', 'created_by'];
  
  Object.keys(newData).forEach(key => {
    if (ignoreFields.includes(key)) return;
    
    // Simple comparison
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
       // Special handling for objects if needed, for now just push
       changes.push({
         field: key,
         oldVal: oldData[key],
         newVal: newData[key]
       });
    }
  });

  return changes;
};
