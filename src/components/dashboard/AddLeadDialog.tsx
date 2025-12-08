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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAddLead } from '@/hooks/useAddLead';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import {
  FITNESS_GOAL_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  SOURCE_OPTIONS,
} from '@/utils/dashboard';

interface AddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddLeadDialog = ({ isOpen, onOpenChange }: AddLeadDialogProps) => {
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
    await handleSubmit();
    // Close dialog after successful submission
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const birthDate = formData.birth_date ? new Date(formData.birth_date) : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange} dir="rtl">
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">הוסף ליד חדש</DialogTitle>
          <DialogDescription className="text-gray-600">
            מלא את הפרטים הבאים כדי להוסיף ליד חדש למערכת
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">מידע אישי</h3>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-right">
                שם מלא <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="הכנס שם מלא"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-right">
                מספר טלפון <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="050-1234567"
                className="text-right dir-ltr"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-right">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="example@email.com"
                className="text-right dir-ltr"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-right">
                עיר
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="הכנס עיר"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date" className="text-right">
                תאריך לידה
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-right font-normal bg-gray-50 hover:bg-white"
                  >
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    {birthDate ? format(birthDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={(date) =>
                      handleInputChange('birth_date', date ? format(date, 'yyyy-MM-dd') : '')
                    }
                    locale={he}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-right">
                מגדר
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value as any)}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="בחר מגדר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">זכר</SelectItem>
                  <SelectItem value="female">נקבה</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Fitness Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">סטטוס וכושר</h3>

            <div className="space-y-2">
              <Label htmlFor="status_main" className="text-right">
                סטטוס ראשי
              </Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-right">
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
              <div className="space-y-2">
                <Label htmlFor="status_sub" className="text-right">
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
                  <SelectTrigger className="text-right">
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

            <div className="space-y-2">
              <Label htmlFor="source" className="text-right">
                מקור
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleInputChange('source', value)}
              >
                <SelectTrigger className="text-right">
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

            <div className="space-y-2">
              <Label htmlFor="fitness_goal" className="text-right">
                מטרת כושר
              </Label>
              <Select
                value={formData.fitness_goal}
                onValueChange={(value) => handleInputChange('fitness_goal', value)}
              >
                <SelectTrigger className="text-right">
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

            <div className="space-y-2">
              <Label htmlFor="activity_level" className="text-right">
                רמת פעילות
              </Label>
              <Select
                value={formData.activity_level}
                onValueChange={(value) => handleInputChange('activity_level', value)}
              >
                <SelectTrigger className="text-right">
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

            <div className="space-y-2">
              <Label htmlFor="preferred_time" className="text-right">
                זמן מועדף
              </Label>
              <Select
                value={formData.preferred_time}
                onValueChange={(value) => handleInputChange('preferred_time', value)}
              >
                <SelectTrigger className="text-right">
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">מדדים פיזיים</h3>

            <div className="space-y-2">
              <Label htmlFor="height" className="text-right">
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
                className="text-right dir-ltr"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight" className="text-right">
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
                className="text-right dir-ltr"
                dir="ltr"
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">הערות</h3>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-right">
                הערות
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הכנס הערות נוספות..."
                className="text-right min-h-[120px]"
                rows={5}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            ביטול
          </Button>
          <Button
            onClick={handleFormSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
          >
            {isSubmitting ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

