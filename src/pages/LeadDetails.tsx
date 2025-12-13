import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useLeadDetailsPage } from './LeadDetails';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkoutPlanCard, type WorkoutPlan } from '@/components/dashboard/WorkoutPlanCard';
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan';
import { NutritionPlanCard } from '@/components/dashboard/NutritionPlanCard';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Mail,
  Ruler,
  Weight,
  Activity,
  Target,
  User,
  FileText,
  Edit,
  Dumbbell,
  Footprints,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { useAppSelector } from '@/store/hooks';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useWorkoutTemplates, type WorkoutTemplate } from '@/hooks/useWorkoutTemplates';
import { useNutritionTemplates, type NutritionTemplate } from '@/hooks/useNutritionTemplates';
import { WorkoutBuilderForm } from '@/components/dashboard/WorkoutBuilderForm';
import { NutritionTemplateForm } from '@/components/dashboard/NutritionTemplateForm';
import { Download, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const LeadDetails = () => {
  const {
    lead,
    bmi,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
    isOpen,
    selectedCategory,
    selectedSubStatus,
    handleOpen,
    handleClose,
    handleCategoryChange,
    handleSubStatusChange,
    handleSave,
    hasSubStatuses,
    selectedCategoryData,
  } = useLeadDetailsPage();
  
  const { user } = useAppSelector((state) => state.auth);
  const { workoutPlan, isLoading: workoutLoading, createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, fetchWorkoutPlan, fetchWorkoutPlanHistory } = useWorkoutPlan(lead?.id);
  const [workoutPlanHistory, setWorkoutPlanHistory] = useState<WorkoutPlan[]>([]);
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState<WorkoutPlan | null>(null);
  const [isHistoryDetailsOpen, setIsHistoryDetailsOpen] = useState(false);
  const { nutritionPlan, isLoading: nutritionLoading, createNutritionPlan, updateNutritionPlan, deleteNutritionPlan, fetchNutritionPlan } = useNutritionPlan(lead?.id);
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
    if (lead?.id && fetchWorkoutPlanHistory) {
      fetchWorkoutPlanHistory().then(setWorkoutPlanHistory);
    }
  }, [lead?.id, fetchWorkoutPlanHistory]);

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ליד לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    // Check if status matches any category or sub-status
    if (status === 'מתקדמת לתהליך') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
        status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    // Legacy statuses
    switch (status) {
      case 'חדש':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'בטיפול':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הושלם':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'תת משקל';
    if (bmi < 25) return 'נורמלי';
    if (bmi < 30) return 'עודף משקל';
    return 'השמנה';
  };

  const getBMIColor = (bmi: number): string => {
    if (bmi < 18.5) return 'text-blue-600';
    if (bmi < 25) return 'text-green-600';
    if (bmi < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <DashboardHeader
        userEmail={user?.email}
        onLogout={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginTop: '88px' }}>
        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar />
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
            <div className="p-4">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200/50">
                {/* Header */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleBack}
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <ArrowRight className="ml-2 h-5 w-5" />
                        חזור לדשבורד
                      </Button>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{lead.name}</h1>
                        <div className="flex items-center gap-3">
                          <Popover open={isOpen} onOpenChange={(open) => open ? handleOpen() : handleClose()}>
                            <PopoverTrigger asChild>
                              <button
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(lead.status)} hover:opacity-80 transition-opacity cursor-pointer`}
                              >
                                {lead.status}
                                <Edit className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start" dir="rtl">
                              <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 mb-3">עדכן סטטוס</h3>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    סטטוס ראשי
                                  </label>
                                  <Select
                                    value={selectedCategory}
                                    onValueChange={handleCategoryChange}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר סטטוס ראשי" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {STATUS_CATEGORIES.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {hasSubStatuses && selectedCategoryData?.subStatuses && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      סטטוס משני
                                    </label>
                                    <Select
                                      value={selectedSubStatus}
                                      onValueChange={handleSubStatusChange}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="בחר סטטוס משני" />
                                      </SelectTrigger>
                                      <SelectContent dir="rtl">
                                        {selectedCategoryData.subStatuses.map((subStatus) => (
                                          <SelectItem key={subStatus.id} value={subStatus.id}>
                                            {subStatus.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    שמור
                                  </Button>
                                  <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    ביטול
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <span className="text-sm text-gray-500">
                            ID: <span className="font-mono">{lead.id}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleCall}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <Phone className="ml-2 h-5 w-5" />
                        התקשר
                      </Button>
                      <Button
                        onClick={handleWhatsApp}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <MessageCircle className="ml-2 h-5 w-5" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={handleEmail}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                        size="lg"
                      >
                        <Mail className="ml-2 h-5 w-5" />
                        אימייל
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes Section - Top Priority */}
                {lead.notes && (
                  <Card className="p-4 bg-white border-gray-200 mb-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      הערות
                    </h2>
                    <p className="text-sm text-gray-700 leading-relaxed">{lead.notes}</p>
                  </Card>
                )}

                {/* Workout & Nutrition Plans - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Workout Plan Compact */}
                  <Card 
                    className="p-4 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      if (workoutPlan) {
                        setIsWorkoutDetailsOpen(true);
                      } else {
                        setIsImportDialogOpen(true);
                      }
                    }}
                  >
                    {workoutLoading ? (
                      <div className="text-center py-6">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-600">טוען...</p>
                      </div>
                    ) : workoutPlan ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">תוכנית אימונים</h3>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            פעילה
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-600 mb-1">כוח</p>
                            <p className="text-lg font-bold text-blue-900">{workoutPlan.strength}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-red-600 mb-1">קרדיו</p>
                            <p className="text-lg font-bold text-red-900">{workoutPlan.cardio}</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-purple-600 mb-1">אינטרוולים</p>
                            <p className="text-lg font-bold text-purple-900">{workoutPlan.intervals}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">לחץ לפרטים מלאים</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Dumbbell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          אין תוכנית אימונים
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          לחץ להוספת תוכנית
                        </p>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsImportDialogOpen(true);
                          }}
                        >
                          <Download className="h-3 w-3 ml-1" />
                          הוסף תוכנית
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Nutrition Plan Compact */}
                  <Card 
                    className="p-4 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      if (nutritionPlan) {
                        setIsNutritionDetailsOpen(true);
                      } else {
                        setIsNutritionImportDialogOpen(true);
                      }
                    }}
                  >
                    {nutritionLoading ? (
                      <div className="text-center py-6">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        <p className="mt-2 text-sm text-gray-600">טוען...</p>
                      </div>
                    ) : nutritionPlan ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-gray-900">תוכנית תזונה</h3>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                            פעילה
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-orange-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-orange-600 mb-1">קלוריות</p>
                            <p className="text-lg font-bold text-orange-900">{nutritionPlan.targets.calories}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-red-600 mb-1">חלבון</p>
                            <p className="text-lg font-bold text-red-900">{nutritionPlan.targets.protein}ג</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-600 mb-1">פחמימות</p>
                            <p className="text-lg font-bold text-blue-900">{nutritionPlan.targets.carbs}ג</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">לחץ לפרטים מלאים</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Flame className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          אין תוכנית תזונה
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          לחץ להוספת תוכנית
                        </p>
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNutritionImportDialogOpen(true);
                          }}
                        >
                          <Download className="h-3 w-3 ml-1" />
                          הוסף תוכנית
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Full Details Dialogs */}
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
                            // Refresh history after deletion
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
                      {selectedTemplate && (
                        <WorkoutBuilderForm
                          mode="user"
                          leadId={lead.id}
                          initialData={{
                            routine_data: JSON.parse(JSON.stringify(selectedTemplate.routine_data)),
                          }}
                          onSave={async (planData) => {
                            try {
                              // Deep clone the template data to ensure independence
                              const clonedData = JSON.parse(JSON.stringify(planData));
                              // Add template_id reference (snapshot pattern - changes to template won't affect this plan)
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

                {/* Import Nutrition Plan from Template Dialog */}
                <Dialog open={isNutritionImportFormOpen} onOpenChange={setIsNutritionImportFormOpen}>
                  <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden" dir="rtl">
                    <DialogHeader className="px-3 pt-3 pb-2 border-b flex-shrink-0">
                      <DialogTitle className="text-base">
                        ייבוא מתבנית תזונה: {selectedNutritionTemplate?.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden min-h-0">
                      {selectedNutritionTemplate && (
                        <NutritionTemplateForm
                          mode="user"
                          initialData={selectedNutritionTemplate}
                          onSave={async (data) => {
                            try {
                              // In user mode, data is just the targets object
                              // Deep clone the template data to ensure independence (snapshot pattern)
                              const clonedTargets = JSON.parse(JSON.stringify(data));
                              // Add template_id reference (changes to template won't affect this plan)
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

                {/* ROW 1: Bio & Status Row - 3 Equal Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Card A: Personal Info */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      מידע אישי
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">גיל</span>
                        <span className="text-base font-semibold text-gray-900">{lead.age} שנים</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">תאריך לידה</span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.birthDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">טלפון</span>
                        <span className="text-base font-semibold text-gray-900 font-mono">
                          {lead.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">אימייל</span>
                        <span className="text-base font-semibold text-gray-900">{lead.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">תאריך יצירה</span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.createdDate)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Card B: Subscription Details */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" />
                      פרטי מנוי
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך הצטרפות
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(lead.subscription.joinDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 bg-blue-50 rounded-lg px-3">
                        <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          שבוע נוכחי
                        </span>
                        <span className="text-base font-bold text-blue-900">
                          {lead.subscription.currentWeekInProgram}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">חבילה ראשונית</span>
                        <span className="text-base font-semibold text-gray-900">
                          {lead.subscription.initialPackageMonths} חודשים
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מחיר ראשוני</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₪{lead.subscription.initialPrice.toLocaleString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מחיר חידוש חודשי</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₪{lead.subscription.monthlyRenewalPrice.toLocaleString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">זמן בתקציב נוכחי</span>
                        <span className="text-base font-semibold text-gray-900">
                          {lead.subscription.timeInCurrentBudget}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Card C: Fitness Info */}
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      מידע כושר
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">מטרת כושר</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                          {lead.fitnessGoal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">רמת פעילות</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-100">
                          {lead.activityLevel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">זמן מועדף</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                          {lead.preferredTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">מקור</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                          {lead.source}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* ROW 2: Daily Action Row - Full Width */}
                <Card className="p-4 bg-white border-gray-200 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    פרוטוקול יומי
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Part A: Activity Targets */}
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-gray-800 mb-3">יעדי פעילות</h3>
                      
                      {/* Weekly Workouts */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-orange-600 mb-1">כמות אימונים שבועית</p>
                            <p className="text-2xl font-bold text-orange-900">{lead.weeklyWorkouts}</p>
                            <p className="text-xs text-orange-700 mt-0.5">אימונים בשבוע</p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                            <Dumbbell className="h-6 w-6 text-orange-700" />
                          </div>
                        </div>
                      </div>

                      {/* Daily Steps */}
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 border border-cyan-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-cyan-600 mb-1">יעד צעדים יומי</p>
                            <p className="text-2xl font-bold text-cyan-900">
                              {lead.dailyStepsGoal.toLocaleString('he-IL')}
                            </p>
                            <p className="text-xs text-cyan-700 mt-0.5">צעדים</p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-cyan-200 flex items-center justify-center">
                            <Footprints className="h-6 w-6 text-cyan-700" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Part B: Supplements Stack */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-3">תוספים יומיים</h3>
                      <div className="space-y-2">
                        {lead.dailySupplements.map((supplement, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2.5 border border-green-200"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-800">{supplement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ROW 3: History & Logs Row - 2 Unequal Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                  {/* Right Column (Wider): Workout History */}
                  <div className="lg:col-span-8">
                    <Card className="p-4 bg-white border-gray-200">
                      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-blue-600" />
                        היסטוריית תוכניות אימון
                      </h2>
                      {workoutPlanHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          אין היסטוריה של תוכניות אימון
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">תאריך התחלה</TableHead>
                                <TableHead className="text-right">תיאור</TableHead>
                                <TableHead className="text-right">כוח</TableHead>
                                <TableHead className="text-right">קרדיו</TableHead>
                                <TableHead className="text-right">אינטרוולים</TableHead>
                                <TableHead className="text-right">סטטוס</TableHead>
                                <TableHead className="text-right">תאריך מחיקה</TableHead>
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
                                  <TableCell className="font-medium">
                                    {formatDate(plan.start_date)}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {plan.description || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {plan.strength}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      {plan.cardio}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      {plan.intervals}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {plan.is_active ? (
                                      <Badge className="bg-green-100 text-green-700 border-green-200">
                                        פעיל
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                        לא פעיל
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-500">
                                    {plan.deleted_at ? formatDate(plan.deleted_at) : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Left Column (Narrower): Steps History */}
                  <div className="lg:col-span-4">
                    <Card className="p-4 bg-white border-gray-200">
                      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Footprints className="h-5 w-5 text-cyan-600" />
                        היסטוריית צעדים
                      </h2>
                      <div className="space-y-4">
                        {lead.stepsHistory.map((step, index) => {
                          const isCurrent = index === lead.stepsHistory.length - 1;
                          return (
                            <div
                              key={index}
                              className={`relative pr-4 ${
                                index < lead.stepsHistory.length - 1 ? 'pb-6' : ''
                              }`}
                            >
                              {/* Timeline line */}
                              {index < lead.stepsHistory.length - 1 && (
                                <div className="absolute right-2 top-8 bottom-0 w-0.5 bg-gray-200" />
                              )}
                              
                              {/* Timeline dot */}
                              <div
                                className={`absolute right-0 top-1 w-4 h-4 rounded-full border-2 ${
                                  isCurrent
                                    ? 'bg-cyan-500 border-cyan-600'
                                    : 'bg-white border-gray-300'
                                }`}
                              />

                              {/* Content */}
                              <div
                                className={`rounded-lg p-4 ${
                                  isCurrent
                                    ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200'
                                    : 'bg-gray-50 border border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`text-sm font-semibold ${
                                      isCurrent ? 'text-cyan-900' : 'text-gray-700'
                                    }`}
                                  >
                                    {step.weekNumber}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-xs font-medium text-cyan-700 bg-cyan-200 px-2 py-1 rounded-full">
                                      פעיל
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {formatDate(step.startDate)} - {formatDate(step.endDate)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Footprints className="h-4 w-4 text-gray-500" />
                                  <span className="text-base font-bold text-gray-900">
                                    {step.target.toLocaleString('he-IL')} צעדים
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;

