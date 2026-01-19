/**
 * AddSubscriptionTypeDialog Component
 * 
 * Dialog for adding a new subscription type.
 * Supports duration in days, weeks, or months.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Currency, DurationUnit } from '@/store/slices/subscriptionTypesSlice';

interface AddSubscriptionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; duration: number; duration_unit: DurationUnit; price: number; currency: Currency }) => Promise<void>;
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

export const AddSubscriptionTypeDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddSubscriptionTypeDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('months');
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [isSaving, setIsSaving] = useState(false);

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
        description: 'נא להזין מחיר תקין (מספר חיובי)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), duration, duration_unit: durationUnit, price, currency });
      setName('');
      setDuration(1);
      setDurationUnit('months');
      setPrice(0);
      setCurrency('ILS');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת סוג מנוי',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDuration(1);
    setDurationUnit('months');
    setPrice(0);
    setCurrency('ILS');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת סוג מנוי חדש</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המנוי *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מנוי 3 חודשים"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>תוקף *</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="duration"
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
                <SelectTrigger id="duration-unit" className="w-full" dir="rtl">
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
              <Label htmlFor="currency">מטבע *</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as Currency)}
              >
                <SelectTrigger id="currency" className="w-full" dir="rtl">
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
              <Label htmlFor="price">מחיר *</Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-900">
                  {getCurrencySymbol(currency)}
                </span>
                <Input
                  id="price"
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
