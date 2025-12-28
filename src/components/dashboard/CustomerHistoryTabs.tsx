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
import { Footprints, Dumbbell } from 'lucide-react';
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
    <Card className="p-6 border-2 border-gray-200/60 bg-white rounded-2xl shadow-lg">
      <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="leads" className="text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">היסטוריית לידים</TabsTrigger>
          <TabsTrigger value="workouts" className="text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">יומן אימונים</TabsTrigger>
          <TabsTrigger value="steps" className="text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">יומן צעדים</TabsTrigger>
        </TabsList>

        {/* Leads History Tab */}
        <TabsContent value="leads" className="mt-0">
          {customer.leads.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              אין לידים עבור לקוח זה
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">תאריך יצירה</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">סטטוס</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">מקור</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">מטרת כושר</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.leads
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((lead, index) => (
                      <TableRow
                        key={lead.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-blue-50 hover:shadow-sm border-b border-gray-100`}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <TableCell className="text-sm font-semibold text-gray-900 py-4">
                          {formatDate(lead.created_at)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${getStatusColor(lead.status_main || lead.status_sub)} text-xs px-3 py-1.5 font-semibold shadow-sm`}>
                            {lead.status_sub || lead.status_main || 'ללא סטטוס'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700 py-4">{lead.source || '-'}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-700 py-4">{lead.fitness_goal || '-'}</TableCell>
                        <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Dumbbell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">אין היסטוריה של תוכניות אימון</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">תאריך התחלה</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">תיאור</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">כוח</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">קרדיו</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">אינטרוולים</TableHead>
                    <TableHead className="text-right text-sm font-bold text-gray-900 py-4">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workoutPlanHistory.map((plan, index) => (
                    <TableRow
                      key={plan.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-blue-50 hover:shadow-sm border-b border-gray-100`}
                    >
                      <TableCell className="text-sm font-semibold text-gray-900 py-4">
                        {formatDate(plan.start_date)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate font-semibold text-gray-900 py-4">
                        {plan.description || '-'}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-2 border-blue-200 text-xs px-3 py-1.5 font-semibold shadow-sm">
                          {plan.strength}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-2 border-red-200 text-xs px-3 py-1.5 font-semibold shadow-sm">
                          {plan.cardio}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-2 border-purple-200 text-xs px-3 py-1.5 font-semibold shadow-sm">
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
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-100 flex items-center justify-center">
                <Footprints className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">אין היסטוריית צעדים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(customer.steps_history || []).map((step: any, index: number) => {
                const isCurrent = index === (customer.steps_history || []).length - 1;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 shadow-md hover:shadow-lg'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                        isCurrent ? 'bg-cyan-500' : 'bg-gray-300'
                      }`}>
                        <Footprints className={`h-6 w-6 text-white`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-base font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
                            {step.weekNumber || step.week || `שבוע ${index + 1}`}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-cyan-500 text-white border-0 text-xs px-3 py-1 font-semibold">
                              פעיל
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {step.startDate ? formatDate(step.startDate) : step.dates || ''} - {step.endDate ? formatDate(step.endDate) : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`text-2xl font-bold ${isCurrent ? 'text-cyan-900' : 'text-gray-900'}`}>
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
