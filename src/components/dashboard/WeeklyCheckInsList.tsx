/**
 * WeeklyCheckInsList Component
 * 
 * Displays weekly check-ins as rows in a table/list format
 * with a button to add new weekly check-ins via a popup dialog
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Edit, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { WeeklyReviewModule } from './WeeklyReviewModule';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates } from '@/store/slices/automationSlice';

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
  const dispatch = useAppDispatch();
  const templates = useAppSelector((state) => state.automation.templates);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<WeeklyReview | null>(null);
  const [sendingReviewId, setSendingReviewId] = useState<string | null>(null);

  // Fetch WhatsApp templates on mount and periodically to catch updates
  useEffect(() => {
    dispatch(fetchTemplates());
    
    // Refetch templates periodically to catch updates from automation page
    const intervalId = setInterval(() => {
      dispatch(fetchTemplates());
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [dispatch]);


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

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingReview(null);
  };

  const handleSendWhatsApp = async (review: WeeklyReview) => {
    if (!customerPhone) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין',
        variant: 'destructive',
      });
      return;
    }

    setSendingReviewId(review.id);
    try {
      const weekStart = new Date(review.week_start_date);
      const weekEnd = new Date(review.week_end_date);
      const weekLabel = `שבוע ${format(weekStart, 'dd/MM', { locale: he })} - ${format(weekEnd, 'dd/MM', { locale: he })}`;
      
      // Check if there's a custom template for weekly_review
      const weeklyReviewTemplate = templates['weekly_review'];
      let message: string;
      let processedButtons: Array<{ id: string; text: string }> | undefined;
      let media: { type: 'image' | 'video' | 'gif'; url: string } | undefined;
      
      if (weeklyReviewTemplate?.template_content?.trim()) {
        // Use custom template with placeholders
        const placeholders: Record<string, string> = {
          // Week info
          '{{week_label}}': weekLabel,
          '{{week_start}}': format(weekStart, 'dd/MM', { locale: he }),
          '{{week_end}}': format(weekEnd, 'dd/MM', { locale: he }),
          
          // Customer info
          '{{first_name}}': customerName?.split(' ')[0] || '',
          '{{full_name}}': customerName || '',
          
          // Targets
          '{{target_calories}}': review.target_calories ? Math.round(review.target_calories).toString() : '-',
          '{{target_protein}}': review.target_protein ? Math.round(review.target_protein).toString() : '-',
          '{{target_fiber}}': review.target_fiber ? Math.round(review.target_fiber).toString() : '-',
          '{{target_steps}}': review.target_steps ? Math.round(review.target_steps).toString() : '-',
          
          // Actuals
          '{{actual_calories}}': review.actual_calories_avg ? Math.round(review.actual_calories_avg).toString() : '-',
          '{{actual_protein}}': review.actual_protein_avg ? Math.round(review.actual_protein_avg).toString() : '-',
          '{{actual_fiber}}': review.actual_fiber_avg ? Math.round(review.actual_fiber_avg).toString() : '-',
          '{{actual_weight}}': review.weekly_avg_weight ? review.weekly_avg_weight.toFixed(1) : '-',
          
          // Trainer feedback
          '{{trainer_summary}}': review.trainer_summary || '',
          '{{action_plan}}': review.action_plan || '',
        };
        
        message = replacePlaceholders(weeklyReviewTemplate.template_content, placeholders);
        
        // Process buttons if they exist
        if (weeklyReviewTemplate.buttons?.length) {
          processedButtons = weeklyReviewTemplate.buttons.map(btn => ({
            id: btn.id,
            text: replacePlaceholders(btn.text, placeholders),
          }));
        }
        
        // Process media if it exists
        if (weeklyReviewTemplate.media?.url) {
          media = {
            type: weeklyReviewTemplate.media.type as 'image' | 'video' | 'gif',
            url: weeklyReviewTemplate.media.url,
          };
        }
      } else {
        // Use default message format (matches the format from WhatsApp automation)
        message = `📊 סיכום שבועי - שבוע ${format(weekStart, 'dd/MM', { locale: he })} - ${format(weekEnd, 'dd/MM', { locale: he })}\n\n`;
        message += `🎯 יעדים:\n`;
        if (review.target_calories) message += `קלוריות: ${Math.round(review.target_calories)} קק"ל\n`;
        if (review.target_protein) message += `חלבון: ${Math.round(review.target_protein)} גרם\n`;
        if (review.target_fiber) message += `סיבים: ${Math.round(review.target_fiber)} גרם\n`;
        if (review.target_steps) message += `צעדים: ${Math.round(review.target_steps)}\n`;
        
        message += `\n📈 בפועל (ממוצע):\n`;
        if (review.actual_calories_avg) message += `קלוריות: ${Math.round(review.actual_calories_avg)} קק"ל\n`;
        if (review.weekly_avg_weight) message += `משקל ממוצע: ${review.weekly_avg_weight.toFixed(1)} ק"ג\n`;
        
        if (review.trainer_summary) {
          message += `\n💬 סיכום ומסקנות:\n${review.trainer_summary}\n`;
        }
        
        if (review.action_plan) {
          message += `\n🎯 דגשים לשבוע הקרוב:\n${review.action_plan}\n`;
        }
      }

      const result = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message,
        buttons: processedButtons,
        media,
      });

      if (result.success) {
        toast({
          title: 'הצלחה',
          description: 'הסיכום השבועי נשלח ב-WhatsApp',
        });
      } else {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת הודעת WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setSendingReviewId(null);
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-[95vw] sm:!max-w-[95vw] md:!max-w-[90vw] lg:!max-w-[85vw] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? 'עריכת דיווח שבועי' : 'דיווח שבועי חדש'}
            </DialogTitle>
          </DialogHeader>
          <WeeklyReviewModule
            leadId={leadId}
            customerId={customerId}
            customerPhone={customerPhone}
            customerName={customerName}
            initialWeekStart={editingReview?.week_start_date}
            onSave={handleCreateSuccess}
          />
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!customerPhone) {
                          toast({
                            title: 'שגיאה',
                            description: 'מספר טלפון לא זמין',
                            variant: 'destructive',
                          });
                          return;
                        }
                        if (sendingReviewId === review.id) {
                          return; // Already sending
                        }
                        handleSendWhatsApp(review);
                      }}
                      disabled={sendingReviewId === review.id || !customerPhone}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!customerPhone ? 'מספר טלפון לא זמין' : sendingReviewId === review.id ? 'שולח...' : 'שלח ב-WhatsApp'}
                    >
                      {sendingReviewId === review.id ? (
                        <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
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

