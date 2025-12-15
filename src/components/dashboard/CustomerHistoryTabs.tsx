/**
 * CustomerHistoryTabs Component
 * 
 * Reusable component for displaying customer history (leads, workouts, steps).
 * Used in both CustomerProfile and LeadDetails pages.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Footprints } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomer } from '@/hooks/useCustomers';
import { useWorkoutPlan, type WorkoutPlan } from '@/hooks/useWorkoutPlan';
import { formatDate } from '@/utils/dashboard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface CustomerHistoryTabsProps {
  customerId: string;
}

const getStatusColor = (status: string | null) => {
  if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'פעיל') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'לא פעיל') return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'מתקדמת לתהליך') return 'bg-green-50 text-green-700 border-green-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

export const CustomerHistoryTabs = ({ customerId }: CustomerHistoryTabsProps) => {
  const navigate = useNavigate();
  const { data: customer } = useCustomer(customerId);
  const { fetchWorkoutPlanHistory } = useWorkoutPlan(customerId);
  const [workoutPlanHistory, setWorkoutPlanHistory] = useState<WorkoutPlan[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('leads');
  const { toast } = useToast();

  useEffect(() => {
    if (customerId && fetchWorkoutPlanHistory) {
      fetchWorkoutPlanHistory().then(setWorkoutPlanHistory);
    }
  }, [customerId, fetchWorkoutPlanHistory]);

  if (!customer) {
    return null;
  }

  return (
    <Card className="p-4 border border-gray-200 bg-white shadow-sm">
      <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
          <TabsTrigger value="leads" className="text-sm">היסטוריית לידים</TabsTrigger>
          <TabsTrigger value="workouts" className="text-sm">יומן אימונים</TabsTrigger>
          <TabsTrigger value="steps" className="text-sm">יומן צעדים</TabsTrigger>
        </TabsList>

        {/* Leads History Tab */}
        <TabsContent value="leads" className="mt-0">
          {customer.leads.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              אין לידים עבור לקוח זה
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-sm">תאריך יצירה</TableHead>
                    <TableHead className="text-right text-sm">סטטוס</TableHead>
                    <TableHead className="text-right text-sm">מקור</TableHead>
                    <TableHead className="text-right text-sm">מטרת כושר</TableHead>
                    <TableHead className="text-right text-sm">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.leads
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <TableCell className="text-sm font-medium">
                          {formatDate(lead.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(lead.status_main || lead.status_sub)} text-xs px-2 py-1`}>
                            {lead.status_sub || lead.status_main || 'ללא סטטוס'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{lead.source || '-'}</TableCell>
                        <TableCell className="text-sm">{lead.fitness_goal || '-'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            צפה פרטים
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Workout Log Tab */}
        <TabsContent value="workouts" className="mt-0">
          {workoutPlanHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              אין היסטוריה של תוכניות אימון
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-sm">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-sm">תיאור</TableHead>
                    <TableHead className="text-right text-sm">כוח</TableHead>
                    <TableHead className="text-right text-sm">קרדיו</TableHead>
                    <TableHead className="text-right text-sm">אינטרוולים</TableHead>
                    <TableHead className="text-right text-sm">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workoutPlanHistory.map((plan) => (
                    <TableRow
                      key={plan.id}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="text-sm font-medium">
                        {formatDate(plan.start_date)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {plan.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1">
                          {plan.strength}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-1">
                          {plan.cardio}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-1">
                          {plan.intervals}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={plan.is_active ? 'active' : 'inactive'}
                          onValueChange={async (value) => {
                            try {
                              const { error } = await supabase
                                .from('workout_plans')
                                .update({
                                  is_active: value === 'active',
                                  updated_at: new Date().toISOString(),
                                })
                                .eq('id', plan.id);

                              if (error) throw error;
                              if (fetchWorkoutPlanHistory) {
                                const history = await fetchWorkoutPlanHistory();
                                setWorkoutPlanHistory(history);
                              }
                              toast({
                                title: 'הצלחה',
                                description: 'הסטטוס עודכן בהצלחה',
                              });
                            } catch (error: any) {
                              console.error('Failed to update workout plan status:', error);
                              toast({
                                title: 'שגיאה',
                                description: error?.message || 'נכשל בעדכון הסטטוס',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue>
                              {plan.is_active ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1 cursor-pointer">
                                  פעיל
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs px-2 py-1 cursor-pointer">
                                  לא פעיל
                                </Badge>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="active">
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                פעיל
                              </Badge>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                                לא פעיל
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Steps Log Tab */}
        <TabsContent value="steps" className="mt-0">
          {(!customer.steps_history || customer.steps_history.length === 0) ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              אין היסטוריית צעדים
            </div>
          ) : (
            <div className="space-y-3">
              {(customer.steps_history || []).map((step: any, index: number) => {
                const isCurrent = index === (customer.steps_history || []).length - 1;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCurrent
                        ? 'bg-cyan-50 border-cyan-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCurrent ? 'bg-cyan-200' : 'bg-gray-200'
                      }`}>
                        <Footprints className={`h-5 w-5 ${isCurrent ? 'text-cyan-700' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-700'}`}>
                            {step.weekNumber || step.week || `שבוע ${index + 1}`}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-cyan-200 text-cyan-700 text-xs px-2 py-0.5">
                              פעיל
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {step.startDate ? formatDate(step.startDate) : step.dates || ''} - {step.endDate ? formatDate(step.endDate) : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                      {(step.target || 0).toLocaleString('he-IL')} צעדים
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
