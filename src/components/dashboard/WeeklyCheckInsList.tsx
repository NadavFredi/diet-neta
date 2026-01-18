/**
 * WeeklyCheckInsList Component
 * 
 * Displays weekly check-ins as rows in a table/list format
 * with a button to add new weekly check-ins via a popup dialog
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { WeeklyReviewModule } from './WeeklyReviewModule';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WeeklyCheckInsListProps {
  leadId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
}

interface WeeklyReview {
  id: string;
  week_start_date: string;
  week_end_date: string;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  target_fiber: number | null;
  target_steps: number | null;
  actual_calories_avg: number | null;
  actual_protein_avg: number | null;
  actual_carbs_avg: number | null;
  actual_fat_avg: number | null;
  actual_fiber_avg: number | null;
  weekly_avg_weight: number | null;
  trainer_summary: string | null;
  action_plan: string | null;
  created_at: string;
  updated_at: string;
}

export const WeeklyCheckInsList: React.FC<WeeklyCheckInsListProps> = ({
  leadId,
  customerId,
  customerPhone,
  customerName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<WeeklyReview | null>(null);

  // Fetch all weekly reviews for this lead/customer
  const { data: weeklyReviews, isLoading } = useQuery({
    queryKey: ['weekly-reviews-list', leadId, customerId],
    queryFn: async () => {
      let query = supabase
        .from('weekly_reviews')
        .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, weekly_avg_weight, trainer_summary, action_plan, created_at, updated_at')
        .order('week_start_date', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WeeklyReview[];
    },
    enabled: !!(leadId || customerId),
  });

  const handleDelete = async (reviewId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הדיווח השבועי הזה?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['weekly-reviews-list'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-review'] });
      
      toast({
        title: 'הצלחה',
        description: 'הדיווח השבועי נמחק בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הדיווח השבועי',
        variant: 'destructive',
      });
    }
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    try {
      const start = format(new Date(startDate), 'dd/MM', { locale: he });
      const end = format(new Date(endDate), 'dd/MM', { locale: he });
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['weekly-reviews-list'] });
  };

  const handleEditClick = (review: WeeklyReview) => {
    setEditingReview(review);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* List of Weekly Reviews */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-600">טוען דיווחים שבועיים...</p>
          </div>
        ) : !weeklyReviews || weeklyReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-base font-medium mb-1">אין דיווחים שבועיים</p>
            <p className="text-sm">לחץ על "הוסף דיווח שבועי" כדי ליצור דיווח חדש</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weeklyReviews.map((review) => (
              <Card
                key={review.id}
                className="p-4 border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#5B6FB9] flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-slate-900">
                        {formatWeekRange(review.week_start_date, review.week_end_date)}
                      </h4>
                    </div>
                    
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-600 mb-1">קלוריות</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {review.actual_calories_avg ? Math.round(review.actual_calories_avg) : '—'} / {review.target_calories ? Math.round(review.target_calories) : '—'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-600 mb-1">חלבון</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {review.actual_protein_avg ? Math.round(review.actual_protein_avg) : '—'} / {review.target_protein ? Math.round(review.target_protein) : '—'} גרם
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-600 mb-1">משקל ממוצע</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {review.weekly_avg_weight ? `${review.weekly_avg_weight.toFixed(1)} ק"ג` : '—'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-600 mb-1">צעדים</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {review.target_steps ? review.target_steps.toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Trainer Summary */}
                    {review.trainer_summary && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-600 mb-1">סיכום מאמן:</div>
                        <p className="text-sm text-slate-900 line-clamp-2">{review.trainer_summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(review)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(review.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

