/**
 * ActionDashboard Component
 * 
 * Main content area with Bento Grid layout.
 * Displays: Status & Info, Quick Actions, Stats/KPIs.
 * NO Lead History Table (moved to sidebar).
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineEditableField, type InlineEditableFieldRef } from './InlineEditableField';
import { InlineEditableSelect, type InlineEditableSelectRef } from './InlineEditableSelect';
import { CardHeaderWithActions } from './CardHeaderWithActions';
import { 
  Target, 
  Activity, 
  Clock, 
  MapPin, 
  Wallet, 
  Dumbbell,
  Flame,
  FileText,
  Calendar as CalendarIcon,
  Apple,
  Weight,
  Save,
  X
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { 
  FITNESS_GOAL_OPTIONS, 
  SOURCE_OPTIONS 
} from '@/utils/dashboard';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import { WeeklyReviewWrapper } from './WeeklyReviewWrapper';
import { LeadAutomationCard } from './LeadAutomationCard';
import { LeadFormsCard } from './LeadFormsCard';
import { ReadOnlyField } from './ReadOnlyField';
import { LeadPaymentCard } from './LeadPaymentCard';
import { usePlansHistory } from '@/hooks/usePlansHistory';
import { ProgressGalleryCard } from './ProgressGalleryCard';
import { BloodTestsGalleryCard } from './BloodTestsGalleryCard.tsx';
import { CreateSubscriptionModal } from './dialogs/CreateSubscriptionModal';

interface LeadData {
  id: string;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  created_at: string;
  join_date: string | null;
  subscription_data?: any;
  workout_history?: any;
  steps_history?: any;
  nutrition_history?: any;
  supplements_history?: any;
  daily_protocol?: any;
  [key: string]: any;
}

interface ActionDashboardProps {
  activeLead: LeadData | null;
  isLoading: boolean;
  customer: any; // Customer data for automation card
  onUpdateLead: (updates: any) => Promise<void>;
  onAddWorkoutPlan: () => void;
  onAddDietPlan: () => void;
  onAssignBudget?: () => void;
  budgetAssignments?: any[] | null;
  getStatusColor: (status: string) => string;
}

export const ActionDashboard: React.FC<ActionDashboardProps> = ({
  activeLead,
  isLoading,
  customer,
  onUpdateLead,
  onAddWorkoutPlan,
  onAddDietPlan,
  onAssignBudget,
  budgetAssignments,
  getStatusColor,
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isCreateSubscriptionModalOpen, setIsCreateSubscriptionModalOpen] = useState(false);

  // Refs for Subscription card editable fields
  const joinDateRef = useRef<InlineEditableFieldRef>(null);
  const currentWeekRef = useRef<InlineEditableFieldRef>(null);
  const monthsRef = useRef<InlineEditableFieldRef>(null);
  const initialPriceRef = useRef<InlineEditableFieldRef>(null);
  const expirationDateRef = useRef<InlineEditableFieldRef>(null);
  const subscriptionStatusRef = useRef<InlineEditableSelectRef>(null);

  // Refs for CRM card editable fields
  const statusRef = useRef<InlineEditableSelectRef>(null);
  const sourceRef = useRef<InlineEditableSelectRef>(null);
  const fitnessGoalRef = useRef<InlineEditableSelectRef>(null);
  const cityRef = useRef<InlineEditableFieldRef>(null);
  const genderRef = useRef<InlineEditableSelectRef>(null);
  const createdAtRef = useRef<InlineEditableFieldRef>(null);

  // Refs for Personal Details card editable fields
  const heightRef = useRef<InlineEditableFieldRef>(null);
  const weightRef = useRef<InlineEditableFieldRef>(null);
  const ageRef = useRef<InlineEditableFieldRef>(null);
  const periodRef = useRef<InlineEditableSelectRef>(null);

  // Track editing state for all cards
  const [subscriptionEditingFields, setSubscriptionEditingFields] = useState<Set<string>>(new Set());
  const [crmEditingFields, setCrmEditingFields] = useState<Set<string>>(new Set());
  const [personalEditingFields, setPersonalEditingFields] = useState<Set<string>>(new Set());

  // Fetch plans history from plan tables (must be called before early returns)
  const leadId = activeLead?.id;
  const { data: plansHistory } = usePlansHistory(customer?.id, leadId);

  // Callback hooks (must be called before early returns)
  const handleSubscriptionFieldEditingChange = useCallback((fieldId: string, isEditing: boolean) => {
    setSubscriptionEditingFields(prev => {
      const next = new Set(prev);
      if (isEditing) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }
      return next;
    });
  }, []);

  const handleCrmFieldEditingChange = useCallback((fieldId: string, isEditing: boolean) => {
    setCrmEditingFields(prev => {
      const next = new Set(prev);
      if (isEditing) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }
      return next;
    });
  }, []);

  const handlePersonalFieldEditingChange = useCallback((fieldId: string, isEditing: boolean) => {
    setPersonalEditingFields(prev => {
      const next = new Set(prev);
      if (isEditing) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }
      return next;
    });
  }, []);

  const handleSubscriptionSave = useCallback(async () => {
    const refs = [
      joinDateRef,
      currentWeekRef,
      monthsRef,
      initialPriceRef,
      expirationDateRef,
      subscriptionStatusRef,
    ];

    const savePromises = refs
      .filter(ref => ref.current?.isEditing)
      .map(ref => ref.current?.save());

    await Promise.all(savePromises);
  }, []);

  const handleSubscriptionCancel = useCallback(() => {
    const refs = [
      joinDateRef,
      currentWeekRef,
      monthsRef,
      initialPriceRef,
      expirationDateRef,
      subscriptionStatusRef,
    ];

    refs.forEach(ref => {
      if (ref.current?.isEditing) {
        ref.current.cancel();
      }
    });
  }, []);

  const handleCrmSave = useCallback(async () => {
    const refs = [
      statusRef,
      sourceRef,
      fitnessGoalRef,
      cityRef,
      genderRef,
      createdAtRef,
    ];

    const savePromises = refs
      .filter(ref => ref.current?.isEditing)
      .map(ref => ref.current?.save());

    await Promise.all(savePromises);
  }, []);

  const handleCrmCancel = useCallback(() => {
    const refs = [
      statusRef,
      sourceRef,
      fitnessGoalRef,
      cityRef,
      genderRef,
      createdAtRef,
    ];

    refs.forEach(ref => {
      if (ref.current?.isEditing) {
        ref.current.cancel();
      }
    });
  }, []);

  const handlePersonalSave = useCallback(async () => {
    const refs = [
      heightRef,
      weightRef,
      ageRef,
      periodRef,
    ];

    const savePromises = refs
      .filter(ref => ref.current?.isEditing)
      .map(ref => ref.current?.save());

    await Promise.all(savePromises);
  }, []);

  const handlePersonalCancel = useCallback(() => {
    const refs = [
      heightRef,
      weightRef,
      ageRef,
      periodRef,
    ];

    refs.forEach(ref => {
      if (ref.current?.isEditing) {
        ref.current.cancel();
      }
    });
  }, []);

  // Memoized values (must be called before early returns)
  const mergedWorkoutHistory = useMemo(() => {
    const plans = plansHistory?.workoutHistory || [];
    const jsonbHistory = activeLead?.workout_history || [];
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.workoutHistory, activeLead?.workout_history]);

  const mergedNutritionHistory = useMemo(() => {
    const plans = plansHistory?.nutritionHistory || [];
    const jsonbHistory = activeLead?.nutrition_history || [];
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.nutritionHistory, activeLead?.nutrition_history]);

  const mergedSupplementsHistory = useMemo(() => {
    const plans = plansHistory?.supplementsHistory || [];
    const jsonbHistory = activeLead?.supplements_history || [];
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.supplementsHistory, activeLead?.supplements_history]);

  const mergedStepsHistory = useMemo(() => {
    const plans = plansHistory?.stepsHistory || [];
    const jsonbHistory = activeLead?.steps_history || [];
    return [...plans, ...jsonbHistory];
  }, [plansHistory?.stepsHistory, activeLead?.steps_history]);

  // NOW we can do early returns after all hooks are called
  if (isLoading) {
    return (
      <Card className="p-8 border border-gray-200 rounded-xl shadow-sm">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">טוען פרטי התעניינות...</p>
        </div>
      </Card>
    );
  }

  if (!activeLead) {
    return (
      <Card className="p-12 border border-gray-200 rounded-xl shadow-sm">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-base font-medium">בחר התעניינות מהיסטוריה כדי לצפות בפרטים</p>
        </div>
      </Card>
    );
  }

  const subscriptionData = activeLead.subscription_data || {};
  // Use status_sub first, then status_main, then default
  // This matches the database structure and ensures correct display
  const displayStatus = activeLead.status_sub || activeLead.status_main || 'ללא סטטוס';

  // Get age directly from database, or calculate from birth_date as fallback
  const getAge = (): number | null => {
    console.log('[ActionDashboard] Getting age for lead:', { 
      leadId: activeLead?.id, 
      age: activeLead?.age, 
      birth_date: activeLead?.birth_date 
    });
    // First priority: use age field from database
    if (activeLead?.age !== null && activeLead?.age !== undefined && activeLead?.age > 0) {
      console.log('[ActionDashboard] Using age from database:', activeLead.age);
      return activeLead.age;
    }
    // Fallback: calculate from birth_date if available
    if (activeLead?.birth_date) {
      const today = new Date();
      const birth = new Date(activeLead.birth_date);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      console.log('[ActionDashboard] Calculated age from birth_date:', age);
      return age;
    }
    console.log('[ActionDashboard] No age available');
    return null;
  };

  const age = getAge();
  
  // Calculate BMI if height and weight are available
  const calculateBMI = (height: number | null, weight: number | null): number | null => {
    if (!height || !weight || height === 0) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  const bmi = calculateBMI(activeLead.height, activeLead.weight);

  const isSubscriptionEditing = subscriptionEditingFields.size > 0;
  const isCrmEditing = crmEditingFields.size > 0;
  const isPersonalEditing = personalEditingFields.size > 0;

  // Helper to get badge color
  const getFitnessBadgeColor = (type: string) => {
    switch (type) {
      case 'source': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'fitness_goal': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden w-full" dir="rtl">
      <div className="p-2 sm:p-4 w-full min-w-0 text-right">
        {/* Row 1: 3-Column Grid - Subscription, CRM Status, Personal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4" style={{ gridAutoRows: 'min-content' }}>
          {/* Card 1: Subscription Details */}
          <Card className="p-4 sm:p-6 border border-slate-100 rounded-lg sm:rounded-xl shadow-md bg-white flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100">
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">פרטי מנוי</h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                {isSubscriptionEditing && (
                  <>
                    <Button
                      onClick={handleSubscriptionSave}
                      size="sm"
                      className="h-9 sm:h-8 px-4 sm:px-3 text-xs sm:text-xs touch-manipulation"
                    >
                      <Save className="h-3.5 w-3.5 sm:h-3 sm:w-3 ml-1.5 sm:ml-1" />
                      שמור
                    </Button>
                    <Button
                      onClick={handleSubscriptionCancel}
                      size="sm"
                      variant="outline"
                      className="h-9 sm:h-8 px-4 sm:px-3 text-xs sm:text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground touch-manipulation"
                    >
                      <X className="h-3.5 w-3.5 sm:h-3 sm:w-3 ml-1.5 sm:ml-1" />
                      ביטול
                    </Button>
                  </>
                )}
                {!isSubscriptionEditing && (
                  <Button
                    onClick={() => setIsCreateSubscriptionModalOpen(true)}
                    size="sm"
                    variant="default"
                    className="h-9 sm:h-8 px-4 sm:px-3 text-xs sm:text-xs"
                  >
                    צור מנוי
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableField
                ref={joinDateRef}
                label="תאריך הצטרפות"
                value={activeLead.join_date || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ join_date: String(newValue) });
                }}
                type="date"
                formatValue={(val) => formatDate(String(val))}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-slate-900"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('join_date', isEditing)}
              />
              <InlineEditableField
                ref={currentWeekRef}
                label="שבוע נוכחי"
                value={subscriptionData.currentWeekInProgram || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    currentWeekInProgram: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => String(val)}
                className="border-0 p-0"
                valueClassName="text-base font-bold text-blue-900"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('current_week', isEditing)}
              />
              <InlineEditableField
                ref={monthsRef}
                label="חבילה ראשונית"
                value={subscriptionData.months || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    months: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => `${val} חודשים`}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('months', isEditing)}
              />
              <InlineEditableField
                ref={initialPriceRef}
                label="מחיר ראשוני"
                value={subscriptionData.initialPrice || 0}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    initialPrice: Number(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="number"
                formatValue={(val) => `₪${val}`}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('initial_price', isEditing)}
              />
              <InlineEditableField
                ref={expirationDateRef}
                label="תאריך תפוגה"
                value={subscriptionData.expirationDate || ''}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    expirationDate: String(newValue),
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                type="date"
                formatValue={(val) => formatDate(String(val))}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-slate-900"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('expiration_date', isEditing)}
              />
              <InlineEditableSelect
                ref={subscriptionStatusRef}
                label="סטטוס מנוי"
                value={subscriptionData.status || 'פעיל'}
                options={['פעיל', 'לא פעיל']}
                onSave={async (newValue) => {
                  const updatedSubscription = {
                    ...subscriptionData,
                    status: newValue,
                  };
                  await onUpdateLead({ subscription_data: updatedSubscription });
                }}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleSubscriptionFieldEditingChange('subscription_status', isEditing)}
              />
            </div>
          </Card>

          {/* Card 2: CRM Status & Info */}
          <Card className="p-4 sm:p-6 border border-slate-100 rounded-lg sm:rounded-xl shadow-md bg-white flex flex-col h-full">
            <CardHeaderWithActions
              icon={Target}
              iconBgColor="bg-indigo-100"
              iconColor="text-indigo-600"
              title="סטטוס ומידע CRM"
              isEditing={isCrmEditing}
              onSave={handleCrmSave}
              onCancel={handleCrmCancel}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableSelect
                ref={statusRef}
                label="סטטוס"
                value={displayStatus}
                options={[
                  ...STATUS_CATEGORIES.map(cat => cat.label),
                  ...(STATUS_CATEGORIES.flatMap(cat => cat.subStatuses?.map(sub => sub.label) || [])),
                ]}
                onSave={async (newValue) => {
                  const mainCategory = STATUS_CATEGORIES.find(cat => cat.label === newValue);
                  const subCategory = STATUS_CATEGORIES.find(cat => 
                    cat.subStatuses?.some(sub => sub.label === newValue)
                  );
                  
                  if (mainCategory) {
                    await onUpdateLead({ 
                      status_main: mainCategory.label,
                      status_sub: null 
                    });
                  } else if (subCategory) {
                    const subStatus = subCategory.subStatuses?.find(sub => sub.label === newValue);
                    await onUpdateLead({ 
                      status_main: subCategory.label,
                      status_sub: subStatus?.label || newValue 
                    });
                  } else {
                    await onUpdateLead({ 
                      status_main: newValue,
                      status_sub: null 
                    });
                  }
                }}
                badgeClassName={getStatusColor(displayStatus)}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleCrmFieldEditingChange('status', isEditing)}
              />
              <InlineEditableSelect
                ref={sourceRef}
                label="מקור"
                value={activeLead.source || ''}
                options={[...SOURCE_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ source: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('source')}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleCrmFieldEditingChange('source', isEditing)}
              />
              <InlineEditableSelect
                ref={fitnessGoalRef}
                label="מטרת כושר"
                value={activeLead.fitness_goal || ''}
                options={[...FITNESS_GOAL_OPTIONS]}
                onSave={async (newValue) => {
                  await onUpdateLead({ fitness_goal: newValue });
                }}
                badgeClassName={getFitnessBadgeColor('fitness_goal')}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleCrmFieldEditingChange('fitness_goal', isEditing)}
              />
              <InlineEditableField
                ref={cityRef}
                label="עיר"
                value={activeLead.city || ''}
                onSave={async (newValue) => {
                  await onUpdateLead({ city: String(newValue) });
                }}
                type="text"
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleCrmFieldEditingChange('city', isEditing)}
              />
              <InlineEditableSelect
                ref={genderRef}
                label="מגדר"
                value={activeLead.gender || ''}
                options={['male', 'female', 'other']}
                onSave={async (newValue) => {
                  await onUpdateLead({ gender: newValue });
                }}
                formatValue={(val) => {
                  if (val === 'male') return 'זכר';
                  if (val === 'female') return 'נקבה';
                  if (val === 'other') return 'אחר';
                  return val;
                }}
                badgeClassName="bg-gray-50 text-gray-700 border-gray-200"
                className="border-0 p-0"
                onEditingChange={(isEditing) => handleCrmFieldEditingChange('gender', isEditing)}
              />
              {onUpdateLead && (
                <InlineEditableField
                  ref={createdAtRef}
                  label="תאריך יצירה"
                  value={activeLead.created_at || ''}
                  onSave={async (newValue) => {
                    if (activeLead.id) {
                      await onUpdateLead({ created_at: String(newValue) });
                    }
                  }}
                  type="date"
                  formatValue={(val) => formatDate(String(val))}
                  className="border-0 p-0"
                  valueClassName="text-sm font-semibold text-slate-900"
                  onEditingChange={(isEditing) => handleCrmFieldEditingChange('created_at', isEditing)}
                />
              )}
            </div>
          </Card>

          {/* Card 3: Personal Details */}
          <Card className="p-4 sm:p-6 border border-slate-100 rounded-lg sm:rounded-xl shadow-md bg-white flex flex-col h-full">
            <CardHeaderWithActions
              icon={Target}
              iconBgColor="bg-cyan-100"
              iconColor="text-cyan-600"
              title="פרטים אישיים"
              isEditing={isPersonalEditing}
              onSave={handlePersonalSave}
              onCancel={handlePersonalCancel}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4 flex-1 auto-rows-min">
              <InlineEditableField
                ref={ageRef}
                label="גיל"
                value={age || 0}
                onSave={async (newValue) => {
                  await onUpdateLead({ age: Number(newValue) });
                }}
                type="number"
                formatValue={(val) => val === 0 || !val ? '-' : `${val} שנים`}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-slate-900"
                onEditingChange={(isEditing) => handlePersonalFieldEditingChange('age', isEditing)}
              />
              <InlineEditableField
                ref={heightRef}
                label="גובה"
                value={activeLead.height || 0}
                onSave={async (newValue) => {
                  await onUpdateLead({ height: Number(newValue) });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : `${val} ס"מ`}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handlePersonalFieldEditingChange('height', isEditing)}
              />
              <InlineEditableField
                ref={weightRef}
                label="משקל"
                value={activeLead.weight || 0}
                onSave={async (newValue) => {
                  await onUpdateLead({ weight: Number(newValue) });
                }}
                type="number"
                formatValue={(val) => val === 0 ? '-' : `${val} ק"ג`}
                className="border-0 p-0"
                onEditingChange={(isEditing) => handlePersonalFieldEditingChange('weight', isEditing)}
              />
              <div className="flex flex-col gap-1.5 min-w-0 w-full">
                <span className="text-xs text-gray-500 font-medium flex-shrink-0">BMI:</span>
                <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
                  {bmi !== null ? bmi : '-'}
                </span>
              </div>
              <InlineEditableSelect
                ref={periodRef}
                label="מקבלת מחזור"
                value={activeLead.period === true ? 'כן' : activeLead.period === false ? 'לא' : ''}
                options={['כן', 'לא']}
                onSave={async (newValue) => {
                  const boolValue = newValue === 'כן' ? true : newValue === 'לא' ? false : null;
                  await onUpdateLead({ period: boolValue });
                }}
                formatValue={(val) => val || '-'}
                badgeClassName="bg-pink-50 text-pink-700 border-pink-200"
                className="border-0 p-0"
                onEditingChange={(isEditing) => handlePersonalFieldEditingChange('period', isEditing)}
              />
              {activeLead.target_weight && (
                <ReadOnlyField
                  label="משקל יעד"
                  value={`${activeLead.target_weight} ק"ג`}
                  className="border-0 p-0"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Row 2: 3-Column Grid - WhatsApp Automation, Fillout Forms, Payment Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4" style={{ gridAutoRows: 'min-content' }}>
          {/* Card 4: WhatsApp Automation - Compact Version */}
          <LeadAutomationCard
            customer={customer}
            lead={activeLead}
            workoutPlanName={null}
            nutritionPlanName={null}
          />

          {/* Card 5: Fillout Forms */}
          <LeadFormsCard 
            leadId={activeLead?.id || null} // Pass lead ID for URL parameter matching
            leadEmail={customer?.email || activeLead?.email || null} 
            leadPhone={activeLead?.phone || customer?.phone || null}
          />
          {/* Debug: Log what we're passing to LeadFormsCard */}
          {console.log('[ActionDashboard] Passing to LeadFormsCard:', {
            activeLeadId: activeLead?.id || 'NULL',
            activeLeadIdType: typeof activeLead?.id,
            customerEmail: customer?.email || 'NULL',
            activeLeadPhone: activeLead?.phone || 'NULL',
            customerPhone: customer?.phone || 'NULL',
            finalLeadId: activeLead?.id || null,
            finalPhone: activeLead?.phone || customer?.phone || null,
          }) || null}

          {/* Card 6: Stripe Payment Center */}
          <LeadPaymentCard
            customerPhone={activeLead.phone || customer?.phone || null}
            customerName={customer?.full_name || activeLead.name || null}
            customerEmail={customer?.email || activeLead.email || null}
            customerId={customer?.id || null}
            leadId={activeLead?.id || null}
          />
        </div>

        {/* Row 3: Progress Gallery & Blood Tests - Full Width Grid */}
        {customer?.id && (
          <div className="mb-3 sm:mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <ProgressGalleryCard customerId={customer.id} />
            <BloodTestsGalleryCard leadId={activeLead.id} customerId={customer.id} />
          </div>
        )}

        {/* Workout, Steps, Nutrition & Supplements History Tabs - Full Width - Always Visible */}
        <div className="w-full">
          <WeeklyReviewWrapper
            leadId={activeLead.id}
            customerId={customer?.id}
            customerPhone={customer?.phone || activeLead.phone}
            customerName={customer?.full_name || activeLead.name}
            workoutHistory={mergedWorkoutHistory}
            stepsHistory={mergedStepsHistory}
            nutritionHistory={mergedNutritionHistory}
            supplementsHistory={mergedSupplementsHistory}
            budgetAssignments={budgetAssignments}
            onAddWorkoutPlan={onAddWorkoutPlan}
            onAddDietPlan={onAddDietPlan}
            onAddSupplementsPlan={() => {
              // Supplements plan creation - placeholder for future implementation
              console.log('Add supplements plan');
            }}
            onAssignBudget={onAssignBudget || (() => {})}
          />
        </div>
      </div>

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={isCreateSubscriptionModalOpen}
        onOpenChange={setIsCreateSubscriptionModalOpen}
        onConfirm={async (subscriptionType) => {
          try {
            console.log('Creating subscription with type:', subscriptionType);
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Calculate expiration date based on duration_unit
            const expirationDate = new Date(today);
            const durationUnit = subscriptionType.duration_unit || 'months';
            
            switch (durationUnit) {
              case 'days':
                expirationDate.setDate(expirationDate.getDate() + subscriptionType.duration);
                break;
              case 'weeks':
                expirationDate.setDate(expirationDate.getDate() + (subscriptionType.duration * 7));
                break;
              case 'months':
              default:
                expirationDate.setMonth(expirationDate.getMonth() + subscriptionType.duration);
                break;
            }
            const expirationDateStr = expirationDate.toISOString().split('T')[0];
            
            console.log('Subscription data being set:', {
              duration: subscriptionType.duration,
              duration_unit: durationUnit,
              price: subscriptionType.price,
              expirationDate: expirationDateStr,
            });
            
            // Create a NEW subscription_data object (copy values, not reference)
            // This ensures one-way relationship - template changes don't affect leads
            const updatedSubscription = {
              ...subscriptionData,
              months: subscriptionType.duration, // Copy duration value
              duration_unit: durationUnit, // Copy duration unit
              initialPrice: subscriptionType.price, // Copy price value
              expirationDate: expirationDateStr, // Calculate expiration date
              status: 'פעיל', // Set status to Active by default
            };
            
            console.log('Updated subscription_data:', updatedSubscription);
            
            await onUpdateLead({
              join_date: todayStr,
              subscription_data: updatedSubscription,
            });
          } catch (error: any) {
            console.error('Error creating subscription:', error);
          }
        }}
      />
    </div>
  );
};




