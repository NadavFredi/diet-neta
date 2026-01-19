/**
 * Daily Activity Log Component
 * 
 * High-density table displaying all daily check-in logs for a lead/customer.
 * Shows: Date, Weight, Calories, Protein, Carbs, Fat, Fiber, Steps, Energy Level
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Activity } from 'lucide-react';

// Use the full DailyCheckIn type from the store
import type { DailyCheckIn } from '@/store/slices/clientSlice';

interface DailyActivityLogProps {
  leadId?: string | null;
  customerId?: string | null;
  showCardWrapper?: boolean; // New prop to control Card wrapper
  onRowClick?: (checkIn: DailyCheckIn) => void; // Callback for row clicks
}

export const DailyActivityLog: React.FC<DailyActivityLogProps> = ({
  leadId,
  customerId,
  showCardWrapper = true, // Default to true for backward compatibility
  onRowClick,
}) => {
  // Fetch daily check-ins
  const { data: checkIns, isLoading, error: queryError } = useQuery({
    queryKey: ['daily-check-ins', leadId, customerId],
    queryFn: async () => {
      console.log('[DailyActivityLog] Fetching check-ins:', { leadId, customerId });
      
      // Always query by customer_id (required field)
      // If we only have leadId, fetch the lead first to get customer_id
      let finalCustomerId = customerId;
      
      if (!finalCustomerId && leadId) {
        console.log('[DailyActivityLog] Fetching customer_id from lead:', leadId);
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', leadId)
          .single();
        
        if (leadError) {
          console.error('[DailyActivityLog] Error fetching lead:', leadError);
          throw leadError;
        }
        if (!leadData?.customer_id) {
          console.warn('[DailyActivityLog] No customer_id found for lead:', leadId);
          return [];
        }
        finalCustomerId = leadData.customer_id;
        console.log('[DailyActivityLog] Found customer_id:', finalCustomerId);
      }

      if (!finalCustomerId) {
        console.warn('[DailyActivityLog] No customer_id available');
        return [];
      }

      // Always query by customer_id (required field)
      // Show ALL check-ins for this customer, regardless of lead_id
      // This ensures managers can see all check-ins, even if they were saved without a specific lead_id
      console.log('[DailyActivityLog] Querying check-ins for customer_id:', finalCustomerId);
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*') // Select all fields to support all checklist fields
        .eq('customer_id', finalCustomerId)
        .order('check_in_date', { ascending: false })
        .limit(100); // Limit to last 100 check-ins

      if (error) {
        console.error('[DailyActivityLog] Error fetching check-ins:', error);
        throw error;
      }
      
      console.log('[DailyActivityLog] Found check-ins:', data?.length || 0, data);
      return (data || []) as DailyCheckIn[];
    },
    enabled: !!(leadId || customerId),
    retry: 1,
  });

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Format numbers with appropriate decimals
      if (value % 1 === 0) return value.toString();
      return value.toFixed(1);
    }
    return '-';
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const content = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : queryError ? (
        <div className="text-center py-8 text-red-500 text-sm">
          שגיאה בטעינת הדיווחים: {queryError instanceof Error ? queryError.message : 'שגיאה לא ידועה'}
          <div className="mt-2 text-xs text-gray-500">
            {process.env.NODE_ENV === 'development' && JSON.stringify(queryError)}
          </div>
        </div>
      ) : !checkIns || checkIns.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          אין דיווחים יומיים עדיין
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-400">
              Debug: leadId={leadId || 'null'}, customerId={customerId || 'null'}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[100px]">
                  תאריך
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  משקל
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[80px]">
                  קלוריות
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  חלבון
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  סיבים
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  צעדים
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[80px]">
                  רמת אנרגיה
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkIns.map((checkIn) => (
                <TableRow 
                  key={checkIn.id}
                  onClick={() => onRowClick?.(checkIn)}
                  className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  <TableCell className="text-xs font-semibold text-gray-900 py-2">
                    {formatDate(checkIn.check_in_date)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {formatValue(checkIn.weight)} {checkIn.weight !== null && checkIn.weight !== undefined ? 'ק"ג' : ''}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {formatValue(checkIn.calories_daily)} {checkIn.calories_daily !== null && checkIn.calories_daily !== undefined ? 'קק"ל' : ''}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {formatValue(checkIn.protein_daily)} {checkIn.protein_daily !== null && checkIn.protein_daily !== undefined ? 'גרם' : ''}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {formatValue(checkIn.fiber_daily)} {checkIn.fiber_daily !== null && checkIn.fiber_daily !== undefined ? 'גרם' : ''}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {formatValue(checkIn.steps_actual)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 py-2">
                    {checkIn.energy_level !== null && checkIn.energy_level !== undefined 
                      ? `${checkIn.energy_level}/10` 
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  if (showCardWrapper) {
    return (
      <Card className="rounded-3xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            יומן פעילות יומי {checkIns && checkIns.length > 0 && `(${checkIns.length} דיווחים)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return <div>{content}</div>;
};