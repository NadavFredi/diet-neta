
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyActivityLog } from './DailyActivityLog';
import { WeeklyCheckInsList } from './WeeklyCheckInsList';
import { DailyCheckInDetailModal } from './dialogs/DailyCheckInDetailModal';

// Interfaces (keeping compatible for now, though many are unused in this component)
interface WorkoutHistoryItem {
  id?: string;
  name?: string;
  startDate?: string;
  validUntil?: string;
  duration?: string;
  description?: string;
  strengthCount?: number;
  split?: {
    strength?: number;
    cardio?: number;
    intervals?: number;
  };
  strength?: number;
  cardio?: number;
  intervals?: number;
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface StepsHistoryItem {
  weekNumber?: string;
  week?: string;
  startDate?: string;
  endDate?: string;
  dates?: string;
  target?: number;
}

interface NutritionHistoryItem {
  id?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  template_id?: string;
  targets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface SupplementsHistoryItem {
  id?: string;
  startDate?: string;
  endDate?: string;
  supplements?: string[];
  description?: string;
  budget_id?: string;
  created_at?: string;
  is_active?: boolean;
}

interface BudgetAssignmentItem {
  id: string;
  budget_id: string;
  budget_name?: string;
  assigned_at: string;
  is_active: boolean;
}

interface LeadHistoryTabsProps {
  workoutHistory?: WorkoutHistoryItem[] | null;
  stepsHistory?: StepsHistoryItem[] | null;
  nutritionHistory?: NutritionHistoryItem[] | null;
  supplementsHistory?: SupplementsHistoryItem[] | null;
  budgetAssignments?: BudgetAssignmentItem[] | null;
  leadId?: string | null;
  customerId?: string | null;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAddSupplementsPlan: () => void;
  onAssignBudget: () => void;
  onAddWeeklyCheckIn?: () => void;
  weeklyReviewModule?: any;
}

export const LeadHistoryTabs = ({ 
  leadId,
  customerId,
  onAddWeeklyCheckIn,
}: LeadHistoryTabsProps) => {
  const [activeTab, setActiveTab] = useState('daily-activity');
  const [selectedCheckIn, setSelectedCheckIn] = useState<any | null>(null);

  // Get the appropriate button for the active tab
  const getActionButton = () => {
    if (activeTab === 'weekly-checkin' && onAddWeeklyCheckIn) {
      return (
        <Button 
          size="sm" 
          onClick={onAddWeeklyCheckIn}
          type="button"
          className="gap-2 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          הוסף דיווח שבועי
        </Button>
      );
    }
    
    return null;
  };

  return (
    <Card className="p-3 border border-slate-100 rounded-lg shadow-sm bg-white mt-3">
      {/* Header Toolbar with Context-Aware Add Button */}
      {getActionButton() && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1"></div>
          {getActionButton()}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
        <div className="relative mb-4 -mx-3 px-3">
          <div className="overflow-x-auto scrollbar-hide pb-1">
            <TabsList className="inline-flex min-w-full lg:grid lg:grid-cols-2 h-10 bg-gray-100 rounded-lg p-1 gap-1">
              <TabsTrigger 
                value="daily-activity" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E0F2FE] data-[state=active]:text-[#0C4A6E] data-[state=active]:shadow-sm data-[state=inactive]:text-[#0C4A6E]/70 data-[state=inactive]:hover:bg-[#E0F2FE]/50 transition-all flex-shrink-0"
              >
                יומן פעילות
              </TabsTrigger>
              <TabsTrigger 
                value="weekly-checkin" 
                className="whitespace-nowrap px-3 lg:px-2 text-xs sm:text-sm font-semibold rounded-md data-[state=active]:bg-[#E0F2FE] data-[state=active]:text-[#0C4A6E] data-[state=active]:shadow-sm data-[state=inactive]:text-[#0C4A6E]/70 data-[state=inactive]:hover:bg-[#E0F2FE]/50 transition-all flex-shrink-0"
              >
                דיווח שבועי
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Daily Activity Log Tab */}
        <TabsContent value="daily-activity" className="mt-0">
          <DailyActivityLog 
            leadId={leadId} 
            customerId={customerId} 
            showCardWrapper={false}
            onRowClick={(checkIn) => setSelectedCheckIn(checkIn)}
          />
        </TabsContent>

        {/* Weekly Check-in Tab */}
        <TabsContent value="weekly-checkin" className="mt-0">
          <WeeklyCheckInsList
            leadId={leadId || undefined}
            customerId={customerId || undefined}
            customerPhone={null}
            customerName={null}
          />
        </TabsContent>
      </Tabs>

      <DailyCheckInDetailModal
        isOpen={!!selectedCheckIn}
        onClose={() => setSelectedCheckIn(null)}
        checkIn={selectedCheckIn}
        customerId={customerId}
      />
    </Card>
  );
};
