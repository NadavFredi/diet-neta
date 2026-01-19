import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddLead } from '@/hooks/useAddLead';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import {
  FITNESS_GOAL_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  SOURCE_OPTIONS,
} from '@/utils/dashboard';
import { PhoneInput } from '@/components/ui/phone-input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSubscriptionTypes } from '@/store/slices/subscriptionTypesSlice';
import { useEffect } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import type { DurationUnit } from '@/store/slices/subscriptionTypesSlice';

// Helper function to get duration unit label in Hebrew
const getDurationUnitLabel = (unit: DurationUnit, count: number): string => {
  switch (unit) {
    case 'days':
      return count === 1 ? 'יום' : 'ימים';
    case 'weeks':
      return count === 1 ? 'שבוע' : 'שבועות';
    case 'months':
      return count === 1 ? 'חודש' : 'חודשים';
    default:
      return '';
  }
};

interface AddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void | Promise<void>;
}

export const AddLeadDialog = ({ isOpen, onOpenChange, onLeadCreated }: AddLeadDialogProps) => {
  const dispatch = useAppDispatch();
  const { subscriptionTypes, isLoading: isLoadingSubscriptionTypes } = useAppSelector(
    (state) => state.subscriptionTypes
  );
  
  const {
    formData,
    isSubmitting,
    selectedCategory,
    selectedCategoryData,
    hasSubStatuses,
    handleInputChange,
    handleCategoryChange,
    handleSubStatusChange,
    handleSubmit,
    resetForm,
  } = useAddLead();

  // Fetch subscription types and budgets when dialog opens
  const { data: budgets = [], isLoading: isLoadingBudgets } = useBudgets();

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubscriptionTypes());
    }
  }, [isOpen, dispatch]);

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    resetForm();
    onOpenChange(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleFormSubmit = async () => {
    const success = await handleSubmit();
    // Close dialog after successful submission
    if (success) {
      // Refresh leads list if callback provided
      if (onLeadCreated) {
        await onLeadCreated();
      } else {
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-[1400px] w-[98vw] max-h-[85vh] flex flex-col p-0 lg:max-w-[1400px] md:max-w-[95vw] sm:max-w-[95vw]" dir="rtl">
        <div className="px-6 pt-3 pb-2 border-b flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">הוסף ליד חדש</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-0.5">
              מלא את הפרטים הבאים כדי להוסיף ליד חדש למערכת
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-0">
          <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 gap-3 xl:gap-4">
          {/* Personal Information Section */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-1">מידע אישי</h3>

            <div className="space-y-1">
              <Label htmlFor="full_name" className="text-right text-sm">
                שם מלא <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="הכנס שם מלא"
                className="text-right h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-right text-sm">
                מספר טלפון <span className="text-red-500">*</span>
              </Label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => handleInputChange('phone', value)}
                placeholder="מספר טלפון"
                defaultCountry="il"
                showValidation={true}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-right text-sm">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="example@email.com"
                className="text-right dir-ltr h-9"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="city" className="text-right text-sm">
                  עיר
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="הכנס עיר"
                  className="text-right h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="age" className="text-right text-sm">
                  גיל
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) =>
                    handleInputChange('age', e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  placeholder="הכנס גיל"
                  min="0"
                  max="150"
                  className="text-right dir-ltr h-9"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="gender" className="text-right text-sm">
                  מגדר
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value as any)}
                >
                  <SelectTrigger className="text-right h-9">
                    <SelectValue placeholder="בחר מגדר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="period" className="text-right text-sm">
                  מקבלת מחזור
                </Label>
                <Select
                  value={formData.period === true ? 'yes' : formData.period === false ? 'no' : ''}
                  onValueChange={(value) => {
                    const boolValue = value === 'yes' ? true : value === 'no' ? false : null;
                    handleInputChange('period', boolValue);
                  }}
                >
                  <SelectTrigger className="text-right h-9">
                    <SelectValue placeholder="בחר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">כן</SelectItem>
                    <SelectItem value="no">לא</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status & Fitness Information Section */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-1">סטטוס וכושר</h3>

            <div className="space-y-1">
              <Label htmlFor="status_main" className="text-right text-sm">
                סטטוס ראשי
              </Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-right h-9">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasSubStatuses && selectedCategoryData?.subStatuses && (
              <div className="space-y-1">
                <Label htmlFor="status_sub" className="text-right text-sm">
                  סטטוס משני
                </Label>
                <Select
                  value={
                    selectedCategoryData.subStatuses.find(
                      (sub) => sub.label === formData.status_sub
                    )?.id || ''
                  }
                  onValueChange={handleSubStatusChange}
                >
                  <SelectTrigger className="text-right h-9">
                    <SelectValue placeholder="בחר סטטוס משני" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategoryData.subStatuses.map((subStatus) => (
                      <SelectItem key={subStatus.id} value={subStatus.id}>
                        {subStatus.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="source" className="text-right text-sm">
                מקור
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleInputChange('source', value)}
              >
                <SelectTrigger className="text-right h-9">
                  <SelectValue placeholder="בחר מקור" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fitness_goal" className="text-right text-sm">
                מטרת כושר
              </Label>
              <Select
                value={formData.fitness_goal}
                onValueChange={(value) => handleInputChange('fitness_goal', value)}
              >
                <SelectTrigger className="text-right h-9">
                  <SelectValue placeholder="בחר מטרת כושר" />
                </SelectTrigger>
                <SelectContent>
                  {FITNESS_GOAL_OPTIONS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="activity_level" className="text-right text-sm">
                רמת פעילות
              </Label>
              <Select
                value={formData.activity_level}
                onValueChange={(value) => handleInputChange('activity_level', value)}
              >
                <SelectTrigger className="text-right h-9">
                  <SelectValue placeholder="בחר רמת פעילות" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferred_time" className="text-right text-sm">
                זמן מועדף
              </Label>
              <Select
                value={formData.preferred_time}
                onValueChange={(value) => handleInputChange('preferred_time', value)}
              >
                <SelectTrigger className="text-right h-9">
                  <SelectValue placeholder="בחר זמן מועדף" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Physical Metrics Section */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-1">מדדים פיזיים</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="height" className="text-right text-sm">
                  גובה (ס"מ)
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) =>
                    handleInputChange('height', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="175"
                  className="text-right dir-ltr h-9"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="weight" className="text-right text-sm">
                  משקל (ק"ג)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) =>
                    handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="70"
                  className="text-right dir-ltr h-9"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Subscription & Budget Section */}
            <div className="space-y-2 pt-1">
              <h3 className="text-base font-semibold text-gray-900 border-b pb-1">מנוי ותקציב</h3>

              <div className="space-y-1">
                <Label htmlFor="subscription_type_id" className="text-right text-sm">
                  סוג מנוי (אופציונלי)
                </Label>
                <Select
                  value={formData.subscription_type_id || undefined}
                  onValueChange={(value) => handleInputChange('subscription_type_id', value)}
                  disabled={isLoadingSubscriptionTypes}
                >
                  <SelectTrigger className="text-right h-9">
                    <SelectValue placeholder={isLoadingSubscriptionTypes ? 'טוען...' : 'בחר סוג מנוי (אופציונלי)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionTypes.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500 text-center">
                        אין סוגי מנויים זמינים
                      </div>
                    ) : (
                      subscriptionTypes.map((subscriptionType) => {
                        const currencySymbol = subscriptionType.currency === 'USD' ? '$' : 
                                              subscriptionType.currency === 'EUR' ? '€' : '₪';
                        const durationUnit: DurationUnit = subscriptionType.duration_unit || 'months';
                        return (
                          <SelectItem key={subscriptionType.id} value={subscriptionType.id}>
                            {subscriptionType.name} - {subscriptionType.duration} {getDurationUnitLabel(durationUnit, subscriptionType.duration)} - {currencySymbol}{subscriptionType.price.toLocaleString('he-IL')}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {formData.subscription_type_id && (
                  <p className="text-xs text-gray-600 text-right mt-0.5">
                    המנוי יווצר אוטומטית עם הליד
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="budget_id" className="text-right text-sm">
                  קישור תקציב (אופציונלי)
                </Label>
                <Select
                  value={formData.budget_id || undefined}
                  onValueChange={(value) => handleInputChange('budget_id', value)}
                  disabled={isLoadingBudgets}
                >
                  <SelectTrigger className="text-right h-9">
                    <SelectValue placeholder={isLoadingBudgets ? 'טוען...' : 'בחר תקציב (אופציונלי)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500 text-center">
                        אין תקציבים זמינים
                      </div>
                    ) : (
                      budgets.map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name}
                          {budget.description && ` - ${budget.description}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.budget_id && (
                  <p className="text-xs text-gray-600 text-right mt-0.5">
                    התקציב יוקצה אוטומטית לליד
                  </p>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-1 pt-1 pb-0">
              <Label htmlFor="notes" className="text-right text-sm">
                הערות
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הכנס הערות נוספות..."
                className="text-right min-h-[50px]"
                rows={2}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-start gap-3 px-6 py-2 border-t bg-gray-50 flex-shrink-0 mt-0" dir="rtl">
          <Button
            onClick={handleFormSubmit}
            disabled={isSubmitting}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white min-w-[100px] h-9"
          >
            {isSubmitting ? 'שומר...' : 'שמור'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-w-[100px] h-9"
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

