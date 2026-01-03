/**
 * Weekly Summaries View Component
 * 
 * Client portal view for displaying weekly reviews from trainer.
 * Shows each weekly report as a clean Bento Card.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Target, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklySummariesViewProps {
  leadId?: string | null;
  customerId?: string | null;
}

interface WeeklyReview {
  id: string;
  week_start_date: string;
  week_end_date: string;
  target_calories: number | null;
  target_protein: number | null;
  target_fiber: number | null;
  actual_calories_avg: number | null;
  actual_protein_avg: number | null;
  actual_fiber_avg: number | null;
  weekly_avg_weight: number | null;
  waist_measurement: number | null;
  trainer_summary: string | null;
  action_plan: string | null;
  updated_steps_goal: number | null;
  updated_calories_target: number | null;
  created_at: string;
}

export const WeeklySummariesView: React.FC<WeeklySummariesViewProps> = ({
  leadId,
  customerId,
}) => {
  // Fetch weekly reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['weekly-reviews-client', leadId, customerId],
    queryFn: async () => {
      let query = supabase
        .from('weekly_reviews')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(20);

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

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const formatWeekRange = (start: string, end: string): string => {
    try {
      return `${format(new Date(start), 'dd/MM', { locale: he })} - ${format(new Date(end), 'dd/MM', { locale: he })}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  const calculateDelta = (target: number | null, actual: number | null): { value: number; isPositive: boolean } | null => {
    if (target === null || actual === null) return null;
    const delta = actual - target;
    return {
      value: Math.round(delta),
      isPositive: delta >= 0,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9]"></div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-[#5B6FB9]" />
        <h2 className="text-lg font-bold text-gray-900">סיכומים שבועיים</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reviews.map((review) => {
          const caloriesDelta = calculateDelta(review.target_calories, review.actual_calories_avg);
          const proteinDelta = calculateDelta(review.target_protein, review.actual_protein_avg);
          const fiberDelta = calculateDelta(review.target_fiber, review.actual_fiber_avg);

          return (
            <Card
              key={review.id}
              className="rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#5B6FB9]" />
                    שבוע {formatWeekRange(review.week_start_date, review.week_end_date)}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(review.created_at)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metrics Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Calories */}
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="text-xs font-semibold text-orange-700 mb-2">קלוריות</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-orange-900">
                        {review.actual_calories_avg ? Math.round(review.actual_calories_avg) : '-'}
                      </span>
                      {review.target_calories && (
                        <>
                          <span className="text-sm text-orange-600">/ {review.target_calories}</span>
                          {caloriesDelta && (
                            <span className={cn(
                              "text-xs font-semibold",
                              caloriesDelta.isPositive ? "text-emerald-600" : "text-amber-600"
                            )}>
                              ({caloriesDelta.isPositive ? '+' : ''}{caloriesDelta.value})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">קק"ל</div>
                  </div>

                  {/* Protein */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-xs font-semibold text-blue-700 mb-2">חלבון</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-900">
                        {review.actual_protein_avg ? Math.round(review.actual_protein_avg) : '-'}
                      </span>
                      {review.target_protein && (
                        <>
                          <span className="text-sm text-blue-600">/ {review.target_protein}</span>
                          {proteinDelta && (
                            <span className={cn(
                              "text-xs font-semibold",
                              proteinDelta.isPositive ? "text-emerald-600" : "text-amber-600"
                            )}>
                              ({proteinDelta.isPositive ? '+' : ''}{proteinDelta.value})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">גרם</div>
                  </div>

                  {/* Weight */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="text-xs font-semibold text-purple-700 mb-2">משקל ממוצע</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-purple-900">
                        {review.weekly_avg_weight ? review.weekly_avg_weight.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 mt-1">ק"ג</div>
                  </div>
                </div>

                {/* Trainer Summary */}
                {review.trainer_summary && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <div className="text-sm font-semibold text-gray-900">סיכום ומסקנות</div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dir="rtl">
                      {review.trainer_summary}
                    </p>
                  </div>
                )}

                {/* Action Plan */}
                {review.action_plan && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div className="text-sm font-semibold text-blue-900">דגשים לשבוע הקרוב</div>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap" dir="rtl">
                      {review.action_plan}
                    </p>
                  </div>
                )}

                {/* Updated Goals for Next Week */}
                {(review.updated_steps_goal || review.updated_calories_target) && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-sm font-semibold text-emerald-900 mb-2">יעדים מעודכנים לשבוע הבא</div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {review.updated_calories_target && (
                        <div>
                          <span className="text-emerald-700 font-medium">קלוריות: </span>
                          <span className="text-emerald-900 font-bold">{review.updated_calories_target} קק"ל</span>
                        </div>
                      )}
                      {review.updated_steps_goal && (
                        <div>
                          <span className="text-emerald-700 font-medium">צעדים: </span>
                          <span className="text-emerald-900 font-bold">{review.updated_steps_goal.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

