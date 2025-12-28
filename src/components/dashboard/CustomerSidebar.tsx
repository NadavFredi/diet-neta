/**
 * CustomerSidebar Component
 * 
 * Reusable customer identity card with avatar, quick actions, and statistics.
 * Used in both CustomerProfile and LeadDetails pages.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageCircle, FileText, Activity, Calendar, CheckCircle2 } from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomers';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { formatDate } from '@/utils/dashboard';
import { differenceInDays, differenceInMonths, differenceInWeeks } from 'date-fns';

interface CustomerSidebarProps {
  customerId: string;
  onWhatsApp?: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onAddNote?: () => void;
}

// Helper to get customer initials for avatar
const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const CustomerSidebar = ({ 
  customerId, 
  onWhatsApp, 
  onCall, 
  onEmail, 
  onAddNote 
}: CustomerSidebarProps) => {
  const { data: customer } = useCustomer(customerId);
  const { workoutPlan } = useWorkoutPlan(customerId);
  const { nutritionPlan } = useNutritionPlan(customerId);

  if (!customer) {
    return null;
  }

  return (
    <Card className="p-4 border border-gray-200 bg-white">
      {/* Avatar & Name */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-[#5B6FB9] flex items-center justify-center text-white text-lg font-bold">
            {getInitials(customer.full_name)}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 mb-0.5">{customer.full_name}</h2>
            <p className="text-xs text-gray-500">לקוח</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-500">טלפון</span>
            <span className="text-xs font-semibold text-gray-900 font-mono">{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-500">אימייל</span>
              <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">{customer.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-500">תאריך יצירה</span>
            <span className="text-xs font-semibold text-gray-900">{formatDate(customer.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-gray-900 mb-2">פעולות מהירות</h3>
        <div className="space-y-1.5">
          <Button
            onClick={onWhatsApp}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-green-50 hover:bg-green-100 border-green-200 text-green-700 h-8 text-xs"
          >
            <MessageCircle className="h-3 w-3 ml-2" />
            שלח WhatsApp
          </Button>
          <Button
            onClick={onCall}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 h-8 text-xs"
          >
            <Phone className="h-3 w-3 ml-2" />
            התקשר
          </Button>
          <Button
            onClick={onEmail}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 h-8 text-xs"
          >
            <Mail className="h-3 w-3 ml-2" />
            שלח אימייל
          </Button>
          <Button
            onClick={onAddNote}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 h-8 text-xs"
          >
            <FileText className="h-3 w-3 ml-2" />
            הוסף הערה
          </Button>
        </div>
      </div>

      {/* Stats Section - Vertical List */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity className="h-3 w-3 text-blue-600" />
          סטטיסטיקות
        </h3>
        <div className="space-y-1.5">
          {/* Days as Customer */}
          {(() => {
            const daysSince = differenceInDays(new Date(), new Date(customer.created_at));
            const monthsSince = differenceInMonths(new Date(), new Date(customer.created_at));
            const weeksSince = differenceInWeeks(new Date(), new Date(customer.created_at));
            let timeText = '';
            if (monthsSince >= 1) {
              timeText = `${monthsSince} ${monthsSince === 1 ? 'חודש' : 'חודשים'}`;
            } else if (weeksSince >= 1) {
              timeText = `${weeksSince} ${weeksSince === 1 ? 'שבוע' : 'שבועות'}`;
            } else {
              timeText = `${daysSince} ${daysSince === 1 ? 'יום' : 'ימים'}`;
            }
            return (
              <div className="flex items-center justify-between py-1.5 bg-blue-50 rounded-lg px-2 border border-blue-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600">לקוח מאז</p>
                    <p className="text-base font-bold text-blue-900">{timeText}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Active Plans Count */}
          {(() => {
            const activePlansCount = (workoutPlan?.is_active !== false ? 1 : 0) + (nutritionPlan ? 1 : 0);
            return (
              <div className="flex items-center justify-between py-1.5 bg-green-50 rounded-lg px-2 border border-green-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-green-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-green-600">תכניות פעילות</p>
                    <p className="text-base font-bold text-green-900">{activePlansCount}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Training Period (if workout plan exists) */}
          {workoutPlan && workoutPlan.start_date && (() => {
            const trainingDays = differenceInDays(new Date(), new Date(workoutPlan.start_date));
            const trainingMonths = differenceInMonths(new Date(), new Date(workoutPlan.start_date));
            let trainingText = '';
            if (trainingMonths >= 1) {
              trainingText = `${trainingMonths} ${trainingMonths === 1 ? 'חודש' : 'חודשים'}`;
            } else {
              trainingText = `${trainingDays} ${trainingDays === 1 ? 'יום' : 'ימים'}`;
            }
            return (
              <div className="flex items-center justify-between py-1.5 bg-orange-50 rounded-lg px-2 border border-orange-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center">
                    <Activity className="h-3 w-3 text-orange-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-600">תקופת אימון</p>
                    <p className="text-base font-bold text-orange-900">{trainingText}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </Card>
  );
};
