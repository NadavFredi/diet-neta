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

interface DailyCheckIn {
  id: string;
  check_in_date: string;
  weight: number | null;
  calories_daily: number | null;
  protein_daily: number | null;
  carbs_daily: number | null;
  fiber_daily: number | null;
  steps_actual: number | null;
  energy_level: number | null;
}

interface DailyActivityLogProps {
  leadId?: string | null;
  customerId?: string | null;
}

export const DailyActivityLog: React.FC<DailyActivityLogProps> = ({
  leadId,
  customerId,
}) => {
  // Fetch daily check-ins
  const { data: checkIns, isLoading } = useQuery({
    queryKey: ['daily-check-ins', leadId, customerId],
    queryFn: async () => {
      let query = supabase
        .from('daily_check_ins')
        .select('id, check_in_date, weight, calories_daily, protein_daily, carbs_daily, fiber_daily, steps_actual, energy_level')
        .order('check_in_date', { ascending: false })
        .limit(100); // Limit to last 100 check-ins

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DailyCheckIn[];
    },
    enabled: !!(leadId || customerId),
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

  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            יומן פעילות יומי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checkIns || checkIns.length === 0) {
    return (
      <Card className="rounded-3xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            יומן פעילות יומי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 text-sm">
            אין דיווחים יומיים עדיין
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          יומן פעילות יומי ({checkIns.length} דיווחים)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
                  פחמימות
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[60px]">
                  סיבים
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  צעדים
                </TableHead>
                <TableHead className="text-right font-semibold text-xs text-gray-700 min-w-[70px]">
                  אנרגיה
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkIns.map((checkIn) => (
                <TableRow key={checkIn.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-right text-xs font-medium text-gray-900">
                    {formatDate(checkIn.check_in_date)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.weight)} {checkIn.weight !== null && 'ק"ג'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.calories_daily)} {checkIn.calories_daily !== null && 'קק"ל'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.protein_daily)} {checkIn.protein_daily !== null && 'גרם'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.carbs_daily)} {checkIn.carbs_daily !== null && 'גרם'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.fiber_daily)} {checkIn.fiber_daily !== null && 'גרם'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {formatValue(checkIn.steps_actual)} {checkIn.steps_actual !== null && 'צעדים'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-gray-700">
                    {checkIn.energy_level !== null ? `${checkIn.energy_level}/10` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

