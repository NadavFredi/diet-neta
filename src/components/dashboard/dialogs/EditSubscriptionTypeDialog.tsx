/**
 * EditSubscriptionTypeDialog Component
 * 
 * Dialog for editing an existing subscription type.
 * Supports duration in days, weeks, or months.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';
import type { Currency, DurationUnit } from '@/store/slices/subscriptionTypesSlice';

interface EditSubscriptionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubscriptionType: SubscriptionType | null;
  onSave: (data: { 
    subscriptionTypeId: string; 
    name: string; 
    duration: number; 
    duration_unit: DurationUnit; 
    price: number; 
    currency?: Currency;
    second_period?: {
      duration: number;
      duration_unit: DurationUnit;
      price: number;
      currency: Currency;
    } | null;
  }) => Promise<void>;
}

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

export const EditSubscriptionTypeDialog = ({
  isOpen,
  onOpenChange,
  editingSubscriptionType,
  onSave,
}: EditSubscriptionTypeDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('months');
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [isSaving, setIsSaving] = useState(false);
  
  // Second period state
  const [hasSecondPeriod, setHasSecondPeriod] = useState(false);
  const [duration2, setDuration2] = useState<number>(1);
  const [durationUnit2, setDurationUnit2] = useState<DurationUnit>('months');
  const [price2, setPrice2] = useState<number>(0);
  const [currency2, setCurrency2] = useState<Currency>('ILS');

  // Get currency symbol for display
  const getCurrencySymbol = (currency: Currency): string => {
    switch (currency) {
      case 'ILS':
        return '₪';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      default:
        return '';
    }
  };

  useEffect(() => {
    if (editingSubscriptionType) {
      setName(editingSubscriptionType.name);
      setDuration(editingSubscriptionType.duration);
      setDurationUnit(editingSubscriptionType.duration_unit || 'months');
      setPrice(editingSubscriptionType.price);
      setCurrency(editingSubscriptionType.currency || 'ILS');
      
      // Load second period if it exists
      if (editingSubscriptionType.second_period) {
        setHasSecondPeriod(true);
        setDuration2(editingSubscriptionType.second_period.duration);
        setDurationUnit2(editingSubscriptionType.second_period.duration_unit || 'months');
        setPrice2(editingSubscriptionType.second_period.price);
        setCurrency2(editingSubscriptionType.second_period.currency || 'ILS');
      } else {
        setHasSecondPeriod(false);
        setDuration2(1);
        setDurationUnit2('months');
        setPrice2(0);
        setCurrency2('ILS');
      }
    }
  }, [editingSubscriptionType]);

  if (!editingSubscriptionType) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין שם מנוי',
        variant: 'destructive',
      });
      return;
    }

    if (duration <= 0) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין תוקף תקין (מספר חיובי)',
        variant: 'destructive',
      });
      return;
    }

    if (price <= 0) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין מחיר תקין (מספר חיובי) לתקופה הראשונה',
        variant: 'destructive',
      });
      return;
    }

    // Validate second period if enabled
    if (hasSecondPeriod) {
      if (duration2 <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא להזין תוקף תקין (מספר חיובי) לתקופה השנייה',
          variant: 'destructive',
        });
        return;
      }

      if (price2 <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא להזין מחיר תקין (מספר חיובי) לתקופה השנייה',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const secondPeriod = hasSecondPeriod ? {
        duration: duration2,
        duration_unit: durationUnit2,
        price: price2,
        currency: currency2,
      } : null;

      await onSave({
        subscriptionTypeId: editingSubscriptionType.id,
        name: name.trim(),
        duration,
        duration_unit: durationUnit,
        price,
        currency,
        second_period: secondPeriod,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון סוג מנוי',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingSubscriptionType) {
      setName(editingSubscriptionType.name);
      setDuration(editingSubscriptionType.duration);
      setDurationUnit(editingSubscriptionType.duration_unit || 'months');
      setPrice(editingSubscriptionType.price);
      setCurrency(editingSubscriptionType.currency || 'ILS');
      
      if (editingSubscriptionType.second_period) {
        setHasSecondPeriod(true);
        setDuration2(editingSubscriptionType.second_period.duration);
        setDurationUnit2(editingSubscriptionType.second_period.duration_unit || 'months');
        setPrice2(editingSubscriptionType.second_period.price);
        setCurrency2(editingSubscriptionType.second_period.currency || 'ILS');
      } else {
        setHasSecondPeriod(false);
        setDuration2(1);
        setDurationUnit2('months');
        setPrice2(0);
        setCurrency2('ILS');
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת סוג מנוי: {editingSubscriptionType.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">שם המנוי *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מנוי 3 חודשים"
              dir="rtl"
            />
          </div>

          {/* First Period */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">תקופה ראשונה *</h3>
            <div className="space-y-2">
              <Label>תוקף *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  dir="rtl"
                />
                <Select
                  value={durationUnit}
                  onValueChange={(value) => setDurationUnit(value as DurationUnit)}
                >
                  <SelectTrigger id="edit-duration-unit" className="w-full" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="days">ימים</SelectItem>
                    <SelectItem value="weeks">שבועות</SelectItem>
                    <SelectItem value="months">חודשים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500">
                {duration} {getDurationUnitLabel(durationUnit, duration)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">מטבע *</Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value as Currency)}
                >
                  <SelectTrigger id="edit-currency" className="w-full" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="ILS">₪ ILS (שקל)</SelectItem>
                    <SelectItem value="USD">$ USD (דולר)</SelectItem>
                    <SelectItem value="EUR">€ EUR (יורו)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">מחיר *</Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-900">
                    {getCurrencySymbol(currency)}
                  </span>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Second Period Toggle */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="edit-has-second-period"
              checked={hasSecondPeriod}
              onCheckedChange={(checked) => setHasSecondPeriod(checked === true)}
            />
            <Label htmlFor="edit-has-second-period" className="text-sm font-medium cursor-pointer">
              הוסף תקופה שנייה (חבילה)
            </Label>
          </div>

          {/* Second Period Fields */}
          {hasSecondPeriod && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  setHasSecondPeriod(false);
                  setDuration2(1);
                  setDurationUnit2('months');
                  setPrice2(0);
                  setCurrency2('ILS');
                }}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                הסר
              </Button>
              <h3 className="font-semibold text-gray-900">תקופה שנייה *</h3>
              <div className="space-y-2">
                <Label>תוקף *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="edit-duration2"
                    type="number"
                    min="1"
                    value={duration2}
                    onChange={(e) => setDuration2(parseInt(e.target.value) || 1)}
                    dir="rtl"
                  />
                  <Select
                    value={durationUnit2}
                    onValueChange={(value) => setDurationUnit2(value as DurationUnit)}
                  >
                    <SelectTrigger id="edit-duration-unit2" className="w-full" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="days">ימים</SelectItem>
                      <SelectItem value="weeks">שבועות</SelectItem>
                      <SelectItem value="months">חודשים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">
                  {duration2} {getDurationUnitLabel(durationUnit2, duration2)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-currency2">מטבע *</Label>
                  <Select
                    value={currency2}
                    onValueChange={(value) => setCurrency2(value as Currency)}
                  >
                    <SelectTrigger id="edit-currency2" className="w-full" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="ILS">₪ ILS (שקל)</SelectItem>
                      <SelectItem value="USD">$ USD (דולר)</SelectItem>
                      <SelectItem value="EUR">€ EUR (יורו)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price2">מחיר *</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-900">
                      {getCurrencySymbol(currency2)}
                    </span>
                    <Input
                      id="edit-price2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price2}
                      onChange={(e) => setPrice2(parseFloat(e.target.value) || 0)}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'שומר...' : 'שמור'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
