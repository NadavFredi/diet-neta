/**
 * WeeklyReviewsList Component
 * 
 * Client-side read-only view of weekly reviews/summaries
 * Displays weekly goals and summaries created by the trainer
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface WeeklyReviewsListProps {
  customerId: string;
  leadId?: string | null;
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
  updated_steps_goal: number | null;
  updated_calories_target: number | null;
  created_at: string;
  updated_at: string;
}

export const WeeklyReviewsList: React.FC<WeeklyReviewsListProps> = ({
  customerId,
  leadId,
}) => {
  // Fetch all weekly reviews for this customer
  const { data: weeklyReviews, isLoading } = useQuery({
    queryKey: ['weekly-reviews-client', customerId, leadId],
    queryFn: async () => {
      let query = supabase
        .from('weekly_reviews')
        .select('id, week_start_date, week_end_date, target_calories, target_protein, target_carbs, target_fat, target_fiber, target_steps, actual_calories_avg, actual_protein_avg, actual_carbs_avg, actual_fat_avg, actual_fiber_avg, weekly_avg_weight, trainer_summary, action_plan, updated_steps_goal, updated_calories_target, created_at, updated_at')
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
    enabled: !!(customerId || leadId),
    refetchInterval: 30000, // Refetch every 30 seconds to sync with manager portal
  });

  const formatWeekRange = (startDate: string, endDate: string) => {
    try {
      const start = format(new Date(startDate), 'dd/MM/yyyy', { locale: he });
      const end = format(new Date(endDate), 'dd/MM/yyyy', { locale: he });
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-4"></div>
          <p className="text-base font-medium text-gray-500">טוען סיכומים שבועיים...</p>
        </CardContent>
      </Card>
    );
  }

  if (!weeklyReviews || weeklyReviews.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm rounded-3xl">
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-base font-medium text-gray-500 mb-2">
            אין סיכומים שבועיים עדיין
          </p>
          <p className="text-sm text-gray-400">
            המאמן שלך יוסיף סיכומים שבועיים כאן
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {weeklyReviews.map((review) => (
        <Card
          key={review.id}
          className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden"
        >
          <CardContent className="p-4 sm:p-6">
            {/* Week Header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
              <Calendar className="h-5 w-5 text-[#5B6FB9] flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  שבוע: {formatWeekRange(review.week_start_date, review.week_end_date)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  עודכן לאחרונה: {format(new Date(review.updated_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-1">קלוריות</div>
                <div className="text-sm font-semibold text-slate-900">
                  {review.actual_calories_avg ? Math.round(review.actual_calories_avg) : '—'} / {review.target_calories ? Math.round(review.target_calories) : '—'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-1">חלבון</div>
                <div className="text-sm font-semibold text-slate-900">
                  {review.actual_protein_avg ? Math.round(review.actual_protein_avg) : '—'} / {review.target_protein ? Math.round(review.target_protein) : '—'} גרם
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-1">משקל ממוצע</div>
                <div className="text-sm font-semibold text-slate-900">
                  {review.weekly_avg_weight ? `${review.weekly_avg_weight.toFixed(1)} ק"ג` : '—'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-1">צעדים</div>
                <div className="text-sm font-semibold text-slate-900">
                  {review.target_steps ? review.target_steps.toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {/* Trainer Summary */}
            {review.trainer_summary && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#5B6FB9]" />
                  <h4 className="text-sm font-semibold text-slate-900">סיכום מאמן</h4>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{review.trainer_summary}</p>
              </div>
            )}

            {/* תכנית פעולה */}
            {review.action_plan && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-slate-900">דגשים לשבוע הקרוב</h4>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{review.action_plan}</p>
              </div>
            )}

            {/* Updated Goals */}
            {(review.updated_steps_goal || review.updated_calories_target) && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-600 mb-2">מטרות מעודכנות לשבוע הבא:</h4>
                <div className="flex flex-wrap gap-3 text-sm">
                  {review.updated_calories_target && (
                    <div className="text-slate-700">
                      <span className="font-medium">קלוריות:</span> {Math.round(review.updated_calories_target)} קק״ל
                    </div>
                  )}
                  {review.updated_steps_goal && (
                    <div className="text-slate-700">
                      <span className="font-medium">צעדים:</span> {review.updated_steps_goal.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
