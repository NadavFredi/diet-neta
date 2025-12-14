import { useParams, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useCustomer } from '@/hooks/useCustomers';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, Mail, Calendar, Plus, User, Dumbbell, Footprints, Activity, CheckCircle2, Flame, Download, Loader2, Droplet, MessageCircle, Edit, FileText } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { formatDate } from '@/utils/dashboard';
import { format, differenceInDays, differenceInMonths, differenceInWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { AddLeadDialogWithCustomer } from '@/components/dashboard/AddLeadDialogWithCustomer';
import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkoutPlanCard, type WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { useWorkoutTemplates, type WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { useNutritionTemplates, type NutritionTemplate } from '@/hooks/useNutritionTemplates';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const CustomerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: customer, isLoading } = useCustomer(id);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState('leads');
  
  // Coaching data hooks - using customer_id
  const { workoutPlan, isLoading: workoutLoading, createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, fetchWorkoutPlan, fetchWorkoutPlanHistory } = useWorkoutPlan(customer?.id);
  const [workoutPlanHistory, setWorkoutPlanHistory] = useState<WorkoutPlan[]>([]);
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState<WorkoutPlan | null>(null);
  const [isHistoryDetailsOpen, setIsHistoryDetailsOpen] = useState(false);
  const { nutritionPlan, isLoading: nutritionLoading, createNutritionPlan, updateNutritionPlan, deleteNutritionPlan, fetchNutritionPlan } = useNutritionPlan(customer?.id);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportFormOpen, setIsImportFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [isNutritionImportDialogOpen, setIsNutritionImportDialogOpen] = useState(false);
  const [isNutritionImportFormOpen, setIsNutritionImportFormOpen] = useState(false);
  const [selectedNutritionTemplate, setSelectedNutritionTemplate] = useState<NutritionTemplate | null>(null);
  const [isWorkoutDetailsOpen, setIsWorkoutDetailsOpen] = useState(false);
  const [isNutritionDetailsOpen, setIsNutritionDetailsOpen] = useState(false);
  const { data: templates = [], isLoading: templatesLoading } = useWorkoutTemplates();
  const { data: nutritionTemplates = [], isLoading: nutritionTemplatesLoading } = useNutritionTemplates();
  const { toast } = useToast();

  // Fetch workout plan history on mount
  useEffect(() => {
    if (customer?.id && fetchWorkoutPlanHistory) {
      fetchWorkoutPlanHistory().then(setWorkoutPlanHistory);
    }
  }, [customer?.id, fetchWorkoutPlanHistory]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard/customers');
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone.replace(/-/g, '')}`;
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const phoneNumber = customer.phone.replace(/-/g, '').replace(/\s/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  // Helper to get customer initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Extract top 3 exercises from workout plan
  const getTopExercises = (plan: WorkoutPlan | null): string[] => {
    if (!plan?.custom_attributes?.data?.weeklyWorkout) return [];
    
    const weeklyWorkout = plan.custom_attributes.data.weeklyWorkout;
    const allExercises: Array<{ name: string; count: number }> = [];
    
    // Collect all exercises from all active days
    Object.values(weeklyWorkout.days || {}).forEach((day: any) => {
      if (day.isActive && day.exercises) {
        day.exercises.forEach((exercise: any) => {
          if (exercise.name) {
            const existing = allExercises.find(e => e.name === exercise.name);
            if (existing) {
              existing.count++;
            } else {
              allExercises.push({ name: exercise.name, count: 1 });
            }
          }
        });
      }
    });
    
    // Sort by frequency and return top 3
    return allExercises
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(e => e.name);
  };

  // Prepare Highcharts options for nutrition donut chart (memoized)
  const nutritionChartOptions = useMemo((): Highcharts.Options => {
    if (!nutritionPlan?.targets || nutritionLoading) {
      return {
        chart: {
          type: 'pie',
          height: 200,
          backgroundColor: 'transparent',
        },
        title: {
          text: '',
        },
        credits: {
          enabled: false,
        },
        series: [
          {
            type: 'pie',
            data: [],
          },
        ],
      };
    }

    const { protein, carbs, fat } = nutritionPlan.targets;
    const proteinCalories = protein * 4;
    const carbsCalories = carbs * 4;
    const fatCalories = fat * 9;
    const totalCalories = proteinCalories + carbsCalories + fatCalories;

    // Validate data
    if (totalCalories <= 0 || !isFinite(totalCalories)) {
      return {
        chart: {
          type: 'pie',
          height: 200,
          backgroundColor: 'transparent',
        },
        title: {
          text: '',
        },
        credits: {
          enabled: false,
        },
        series: [
          {
            type: 'pie',
            data: [],
          },
        ],
      };
    }

    return {
      chart: {
        type: 'pie',
        height: 200,
        backgroundColor: 'transparent',
        animation: {
          duration: 500,
        },
      },
      title: {
        text: '',
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: {
          color: 'rgba(0, 0, 0, 0.1)',
          width: 2,
          offsetX: 0,
          offsetY: 2,
        },
        formatter: function() {
          const percentage = ((this.y as number) / totalCalories * 100).toFixed(1);
          return `<b>${this.point.name}</b><br/>${this.y} קק״ל (${percentage}%)`;
        },
        style: {
          fontFamily: 'inherit',
          fontSize: '12px',
        },
      },
      plotOptions: {
        pie: {
          innerSize: '60%',
          borderWidth: 0,
          dataLabels: {
            enabled: false,
          },
          showInLegend: false,
          states: {
            hover: {
              brightness: 0.1,
            },
          },
          animation: {
            duration: 500,
          },
        },
      },
      series: [
        {
          type: 'pie',
          name: 'מקרו-נוטריאנטים',
          data: [
            {
              name: 'חלבון',
              y: proteinCalories,
              color: '#ef4444',
            },
            {
              name: 'פחמימות',
              y: carbsCalories,
              color: '#3b82f6',
            },
            {
              name: 'שומן',
              y: fatCalories,
              color: '#f59e0b',
            },
          ],
        },
      ],
    };
  }, [nutritionPlan?.targets, nutritionLoading]);

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
    if (status === 'פעיל') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'לא פעיל') return 'bg-gray-50 text-gray-700 border-gray-200';
    if (status === 'מתקדמת לתהליך') return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטי לקוח...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">לקוח לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לרשימת לקוחות
          </Button>
        </div>
      </div>
    );
  }

  const dailyProtocol = customer.daily_protocol || {};
  const stepsGoal = dailyProtocol.stepsGoal || 0;
  const workoutGoal = dailyProtocol.workoutGoal || 0;
  const supplements = dailyProtocol.supplements || [];
  const calories = nutritionPlan?.targets?.calories || 0;

  return (
    <>
      <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
        {/* Header */}
        <div style={{ gridColumn: '1 / -1' }}>
          <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
        </div>

        {/* Main content area with sidebar */}
        <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1', height: 'calc(100vh - 88px)', overflow: 'hidden' }}>
          <DashboardSidebar />
          
          <main className="flex-1 bg-gray-50 flex flex-col overflow-hidden" style={{ marginRight: '256px' }}>
            <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleBack}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <ArrowRight className="ml-2 h-5 w-5" />
                    חזור
                  </Button>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
                </div>
                <Button
                  onClick={() => setIsAddLeadDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  צור התעניינות חדשה
                </Button>
              </div>

              {/* ASYMMETRICAL GRID LAYOUT */}
              <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* LEFT COLUMN: Enriched Identity Card (25% width) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col">
                  <div className="sticky top-4">
                    {/* Identity Card with Avatar */}
                    <Card className="p-4 border border-gray-200 bg-white">
                      {/* Avatar & Name */}
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
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
                            onClick={handleWhatsApp}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start bg-green-50 hover:bg-green-100 border-green-200 text-green-700 h-8 text-xs"
                          >
                            <MessageCircle className="h-3 w-3 ml-2" />
                            שלח WhatsApp
                          </Button>
                          <Button
                            onClick={handleCall}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 h-8 text-xs"
                          >
                            <Phone className="h-3 w-3 ml-2" />
                            התקשר
                          </Button>
                          <Button
                            onClick={handleEmail}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 h-8 text-xs"
                          >
                            <Mail className="h-3 w-3 ml-2" />
                            שלח אימייל
                          </Button>
                          <Button
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
                  </div>
                </div>

                {/* RIGHT COLUMN: Main Canvas (75% width) */}
                <div className="col-span-12 lg:col-span-9 flex flex-col space-y-4 min-h-0">
                  {/* ROW 1: Active Plans (50/50 split) - Rich Preview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Workout Plan - Rich Preview Card */}
                    <Card 
                      className="p-5 border border-gray-200 bg-white cursor-pointer hover:border-blue-300 transition-colors shadow-sm"
                      onClick={() => {
                        if (workoutPlan) {
                          setIsWorkoutDetailsOpen(true);
                        } else {
                          setIsImportDialogOpen(true);
                        }
                      }}
                    >
                      {workoutLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : workoutPlan ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-5 w-5 text-blue-600" />
                              <h3 className="text-base font-bold text-gray-900">תוכנית אימונים</h3>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={workoutPlan.is_active !== false ? 'active' : 'inactive'}
                                onValueChange={async (value) => {
                                  try {
                                    const { error } = await supabase
                                      .from('workout_plans')
                                      .update({
                                        is_active: value === 'active',
                                        updated_at: new Date().toISOString(),
                                      })
                                      .eq('id', workoutPlan.id);

                                    if (error) throw error;
                                    await fetchWorkoutPlan();
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
                                <SelectTrigger className="h-7 w-24 border-0 p-0 bg-transparent hover:bg-transparent">
                                  <SelectValue>
                                    {workoutPlan.is_active !== false ? (
                                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                        פעילה
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                        לא פעילה
                                      </Badge>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="active">
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                      פעילה
                                    </Badge>
                                  </SelectItem>
                                  <SelectItem value="inactive">
                                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                      לא פעילה
                                    </Badge>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 text-center">
                              <p className="text-xs text-blue-600 mb-1">כוח</p>
                              <p className="text-xl font-bold text-blue-900">{workoutPlan.strength}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center">
                              <p className="text-xs text-red-600 mb-1">קרדיו</p>
                              <p className="text-xl font-bold text-red-900">{workoutPlan.cardio}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg border border-purple-100 p-3 text-center">
                              <p className="text-xs text-purple-600 mb-1">אינטרוולים</p>
                              <p className="text-xl font-bold text-purple-900">{workoutPlan.intervals}</p>
                            </div>
                          </div>
                          {/* Top 3 Exercises Preview */}
                          {getTopExercises(workoutPlan).length > 0 && (
                            <div className="pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">תרגילים מובילים:</p>
                              <ul className="space-y-1">
                                {getTopExercises(workoutPlan).map((exercise, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                    {exercise}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Dumbbell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">אין תוכנית אימונים</h3>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsImportDialogOpen(true);
                            }}
                          >
                            <Download className="h-4 w-4 ml-2" />
                            הוסף תוכנית
                          </Button>
                        </div>
                      )}
                    </Card>

                    {/* Nutrition Plan - Rich Preview Card with Donut Chart */}
                    <Card 
                      className="p-5 border border-gray-200 bg-white cursor-pointer hover:border-orange-300 transition-colors shadow-sm"
                      onClick={() => {
                        if (nutritionPlan) {
                          setIsNutritionDetailsOpen(true);
                        } else {
                          setIsNutritionImportDialogOpen(true);
                        }
                      }}
                    >
                      {nutritionLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        </div>
                      ) : nutritionPlan ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-600" />
                            <h3 className="text-base font-bold text-gray-900">תוכנית תזונה</h3>
                          </div>
                          {/* Donut Chart */}
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {nutritionLoading ? (
                                <div className="h-[200px] w-[200px] flex items-center justify-center">
                                  <div className="text-center text-gray-400">
                                    <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">טוען נתונים...</p>
                                  </div>
                                </div>
                              ) : nutritionPlan?.targets && nutritionChartOptions.series?.[0]?.data?.length > 0 ? (
                                <HighchartsReact
                                  highcharts={Highcharts}
                                  options={nutritionChartOptions}
                                  containerProps={{ style: { height: '200px', width: '200px' } }}
                                  key={`nutrition-chart-${nutritionPlan.id || 'default'}`}
                                />
                              ) : (
                                <div className="h-[200px] w-[200px] flex items-center justify-center">
                                  <div className="text-center text-gray-400">
                                    <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">אין נתונים</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-xs text-gray-600">חלבון</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{nutritionPlan.targets.protein}ג</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-xs text-gray-600">פחמימות</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{nutritionPlan.targets.carbs}ג</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                  <span className="text-xs text-gray-600">שומן</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{nutritionPlan.targets.fat || 0}ג</span>
                              </div>
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">סה"כ קלוריות</span>
                                  <span className="text-lg font-bold text-orange-900">{nutritionPlan.targets.calories}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Flame className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">אין תוכנית תזונה</h3>
                          <Button 
                            className="bg-orange-600 hover:bg-orange-700 text-white mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsNutritionImportDialogOpen(true);
                            }}
                          >
                            <Download className="h-4 w-4 ml-2" />
                            הוסף תוכנית
                          </Button>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* ROW 2: Daily Protocol - Rich Status Tiles */}
                  {customer.daily_protocol && (
                    <Card className="p-5 border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <h2 className="text-base font-bold text-gray-900">פרוטוקול יומי</h2>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {/* Steps Status Tile */}
                        <div className="relative bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border-2 border-cyan-200 p-4 overflow-hidden">
                          <Footprints className="absolute top-2 left-2 h-16 w-16 text-cyan-200 opacity-30" />
                          <div className="relative">
                            <Footprints className="h-5 w-5 text-cyan-600 mb-2" />
                            <p className="text-xs text-cyan-700 mb-1 font-medium">יעד צעדים</p>
                            <p className="text-3xl font-bold text-cyan-900">
                              {stepsGoal > 0 ? (stepsGoal / 1000).toFixed(1) + 'K' : '-'}
                            </p>
                            {stepsGoal > 0 && (
                              <p className="text-[10px] text-cyan-600 mt-1">{stepsGoal.toLocaleString('he-IL')} צעדים</p>
                            )}
                          </div>
                        </div>
                        {/* Workouts Status Tile */}
                        <div className="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 p-4 overflow-hidden">
                          <Dumbbell className="absolute top-2 left-2 h-16 w-16 text-orange-200 opacity-30" />
                          <div className="relative">
                            <Dumbbell className="h-5 w-5 text-orange-600 mb-2" />
                            <p className="text-xs text-orange-700 mb-1 font-medium">אימונים/שבוע</p>
                            <p className="text-3xl font-bold text-orange-900">{workoutGoal || '-'}</p>
                            {workoutGoal > 0 && (
                              <p className="text-[10px] text-orange-600 mt-1">אימונים שבועיים</p>
                            )}
                          </div>
                        </div>
                        {/* Calories Status Tile */}
                        <div className="relative bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200 p-4 overflow-hidden">
                          <Flame className="absolute top-2 left-2 h-16 w-16 text-red-200 opacity-30" />
                          <div className="relative">
                            <Flame className="h-5 w-5 text-red-600 mb-2" />
                            <p className="text-xs text-red-700 mb-1 font-medium">קלוריות יומיות</p>
                            <p className="text-3xl font-bold text-red-900">{calories || '-'}</p>
                            {calories > 0 && (
                              <p className="text-[10px] text-red-600 mt-1">קלוריות</p>
                            )}
                          </div>
                        </div>
                        {/* Supplements Status Tile */}
                        <div className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4 overflow-hidden">
                          <CheckCircle2 className="absolute top-2 left-2 h-16 w-16 text-green-200 opacity-30" />
                          <div className="relative">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mb-2" />
                            <p className="text-xs text-green-700 mb-1 font-medium">תוספים</p>
                            <p className="text-3xl font-bold text-green-900">{supplements.length || 0}</p>
                            {supplements.length > 0 && (
                              <p className="text-[10px] text-green-600 mt-1">תוספים יומיים</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Supplements List */}
                      {supplements.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">רשימת תוספים:</p>
                          <div className="flex flex-wrap gap-2">
                            {supplements.map((supplement: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-1">
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                                {supplement}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* ROW 3: History Container with Tabs - Elastic Section */}
                  <Card className="p-4 border border-gray-200 bg-white shadow-sm flex-1 flex flex-col min-h-0">
                    <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} dir="rtl" className="flex-1 flex flex-col min-h-0">
                      <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
                        <TabsTrigger value="leads" className="text-sm">היסטוריית לידים</TabsTrigger>
                        <TabsTrigger value="workouts" className="text-sm">יומן אימונים</TabsTrigger>
                        <TabsTrigger value="steps" className="text-sm">יומן צעדים</TabsTrigger>
                      </TabsList>

                      {/* Leads History Tab */}
                      <TabsContent value="leads" className="mt-0 flex-1 flex flex-col min-h-0">
                        {customer.leads.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 text-sm flex-1 flex items-center justify-center">
                            אין לידים עבור לקוח זה
                          </div>
                        ) : (
                          <div className="overflow-auto flex-1">
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
                      <TabsContent value="workouts" className="mt-0 flex-1 flex flex-col min-h-0">
                        {workoutPlanHistory.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 text-sm flex-1 flex items-center justify-center">
                            אין היסטוריה של תוכניות אימון
                          </div>
                        ) : (
                          <div className="overflow-auto flex-1">
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
                                    onClick={() => {
                                      setSelectedHistoryPlan(plan);
                                      setIsHistoryDetailsOpen(true);
                                    }}
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
                      <TabsContent value="steps" className="mt-0 flex-1 flex flex-col min-h-0">
                        {(!customer.steps_history || customer.steps_history.length === 0) ? (
                          <div className="text-center py-12 text-gray-500 text-sm flex-1 flex items-center justify-center">
                            אין היסטוריית צעדים
                          </div>
                        ) : (
                          <div className="overflow-auto flex-1 space-y-3">
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
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Lead Dialog - Pre-fill with customer data */}
      <AddLeadDialogWithCustomer
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        customer={customer}
      />

      {/* Workout Plan Details Dialog */}
      {workoutPlan && (
        <Dialog open={isWorkoutDetailsOpen} onOpenChange={setIsWorkoutDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>פרטי תוכנית אימונים</DialogTitle>
            </DialogHeader>
            <WorkoutPlanCard
              workoutPlan={workoutPlan}
              onUpdate={async (updatedPlan) => {
                try {
                  await updateWorkoutPlan(updatedPlan);
                  await fetchWorkoutPlan();
                  setIsWorkoutDetailsOpen(false);
                } catch (error) {
                  console.error('Failed to update workout plan:', error);
                }
              }}
              onDelete={async () => {
                try {
                  await deleteWorkoutPlan();
                  await fetchWorkoutPlan();
                  if (fetchWorkoutPlanHistory) {
                    const history = await fetchWorkoutPlanHistory();
                    setWorkoutPlanHistory(history);
                  }
                  setIsWorkoutDetailsOpen(false);
                  toast({
                    title: 'הצלחה',
                    description: 'תוכנית האימונים נמחקה בהצלחה',
                  });
                } catch (error: any) {
                  console.error('Failed to delete workout plan:', error);
                  toast({
                    title: 'שגיאה',
                    description: error?.message || 'נכשל במחיקת התוכנית',
                    variant: 'destructive',
                  });
                }
              }}
              isEditable={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Nutrition Plan Details Dialog */}
      {nutritionPlan && (
        <Dialog open={isNutritionDetailsOpen} onOpenChange={setIsNutritionDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>פרטי תוכנית תזונה</DialogTitle>
            </DialogHeader>
            <NutritionPlanCard
              nutritionPlan={nutritionPlan}
              onUpdate={async (updatedPlan) => {
                try {
                  await updateNutritionPlan(updatedPlan);
                  await fetchNutritionPlan();
                  setIsNutritionDetailsOpen(false);
                } catch (error) {
                  console.error('Failed to update nutrition plan:', error);
                }
              }}
              onDelete={async () => {
                try {
                  await deleteNutritionPlan();
                  await fetchNutritionPlan();
                  setIsNutritionDetailsOpen(false);
                  toast({
                    title: 'הצלחה',
                    description: 'תוכנית התזונה נמחקה בהצלחה',
                  });
                } catch (error: any) {
                  console.error('Failed to delete nutrition plan:', error);
                  toast({
                    title: 'שגיאה',
                    description: error?.message || 'נכשל במחיקת התוכנית',
                    variant: 'destructive',
                  });
                }
              }}
              isEditable={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Workout Plan History Details Dialog */}
      {selectedHistoryPlan && (
        <Dialog open={isHistoryDetailsOpen} onOpenChange={setIsHistoryDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>פרטי תוכנית אימונים - היסטוריה</DialogTitle>
            </DialogHeader>
            <WorkoutPlanCard
              workoutPlan={selectedHistoryPlan}
              onUpdate={async () => {
                // History plans are read-only
              }}
              onDelete={async () => {
                // History plans cannot be deleted again
              }}
              isEditable={false}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Template Selection Dialog for Workout Plans */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר תבנית אימונים</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {templatesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-sm text-gray-600">טוען תבניות...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                אין תבניות זמינות
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsImportDialogOpen(false);
                      setIsImportFormOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        בחר
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from Template Dialog */}
      <Dialog open={isImportFormOpen} onOpenChange={setIsImportFormOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>
              ייבוא מתבנית: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
            {selectedTemplate && customer && (
              <WorkoutBuilderForm
                mode="user"
                customerId={customer.id}
                initialData={{
                  routine_data: JSON.parse(JSON.stringify(selectedTemplate.routine_data)),
                }}
                onSave={async (planData) => {
                  try {
                    const clonedData = JSON.parse(JSON.stringify(planData));
                    await createWorkoutPlan({
                      ...clonedData,
                      template_id: selectedTemplate.id,
                    });
                    setIsImportFormOpen(false);
                    setSelectedTemplate(null);
                    await fetchWorkoutPlan();
                    toast({
                      title: 'הצלחה',
                      description: 'התוכנית יובאה בהצלחה מתבנית',
                    });
                  } catch (error: any) {
                    console.error('Failed to import workout plan:', error);
                    toast({
                      title: 'שגיאה',
                      description: error?.message || 'נכשל בייבוא התוכנית',
                      variant: 'destructive',
                    });
                  }
                }}
                onCancel={() => {
                  setIsImportFormOpen(false);
                  setSelectedTemplate(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog for Nutrition Plans */}
      <Dialog open={isNutritionImportDialogOpen} onOpenChange={setIsNutritionImportDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר תבנית תזונה</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {nutritionTemplatesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-600" />
                <p className="mt-2 text-sm text-gray-600">טוען תבניות...</p>
              </div>
            ) : nutritionTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                אין תבניות זמינות
              </div>
            ) : (
              <div className="space-y-2">
                {nutritionTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedNutritionTemplate(template);
                      setIsNutritionImportDialogOpen(false);
                      setIsNutritionImportFormOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        בחר
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Nutrition Plan from Template Dialog */}
      <Dialog open={isNutritionImportFormOpen} onOpenChange={setIsNutritionImportFormOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-3 pt-3 pb-2 border-b flex-shrink-0">
            <DialogTitle className="text-base">
              ייבוא מתבנית תזונה: {selectedNutritionTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {selectedNutritionTemplate && customer && (
              <NutritionTemplateForm
                mode="user"
                initialData={selectedNutritionTemplate}
                onSave={async (data) => {
                  try {
                    const clonedTargets = JSON.parse(JSON.stringify(data));
                    await createNutritionPlan({
                      description: selectedNutritionTemplate.description || '',
                      targets: clonedTargets,
                      start_date: new Date().toISOString().split('T')[0],
                      template_id: selectedNutritionTemplate.id,
                    });
                    setIsNutritionImportFormOpen(false);
                    setSelectedNutritionTemplate(null);
                    await fetchNutritionPlan();
                    toast({
                      title: 'הצלחה',
                      description: 'תוכנית התזונה יובאה בהצלחה מתבנית',
                    });
                  } catch (error: any) {
                    console.error('Failed to import nutrition plan:', error);
                    toast({
                      title: 'שגיאה',
                      description: error?.message || 'נכשל בייבוא התוכנית',
                      variant: 'destructive',
                    });
                  }
                }}
                onCancel={() => {
                  setIsNutritionImportFormOpen(false);
                  setSelectedNutritionTemplate(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerProfile;
