/**
 * CreateSubscriptionModal Component
 * 
 * Modal for selecting a subscription type and populating lead subscription fields
 * Also allows creating a new subscription type inline
 * Supports duration in days, weeks, or months
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSubscriptionTypes } from '@/store/slices/subscriptionTypesSlice';
import { useCreateSubscriptionType } from '@/hooks/useSubscriptionTypes';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import type { Currency, DurationUnit } from '@/store/slices/subscriptionTypesSlice';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subscriptionType: { name: string; duration: number; duration_unit: DurationUnit; price: number }) => void;
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

export const CreateSubscriptionModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: CreateSubscriptionModalProps) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { subscriptionTypes, isLoading } = useAppSelector((state) => state.subscriptionTypes);
  const createSubscriptionType = useCreateSubscriptionType();
  
  const [selectedSubscriptionTypeId, setSelectedSubscriptionTypeId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // New subscription type form fields
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState<number>(1);
  const [newDurationUnit, setNewDurationUnit] = useState<DurationUnit>('months');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newCurrency, setNewCurrency] = useState<Currency>('ILS');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch subscription types when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubscriptionTypes());
    }
  }, [isOpen, dispatch]);

  const selectedSubscriptionType = subscriptionTypes.find(
    (st) => st.id === selectedSubscriptionTypeId
  );

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

  const handleConfirm = () => {
    if (!selectedSubscriptionType) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור סוג מנוי',
        variant: 'destructive',
      });
      return;
    }

    onConfirm({
      name: selectedSubscriptionType.name,
      duration: selectedSubscriptionType.duration,
      duration_unit: selectedSubscriptionType.duration_unit || 'months',
      price: selectedSubscriptionType.price,
    });
    resetForm();
    onOpenChange(false);
  };

  const handleCreateAndConfirm = async () => {
    if (!newName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין שם מנוי',
        variant: 'destructive',
      });
      return;
    }

    if (newDuration <= 0) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין תוקף תקין (מספר חיובי)',
        variant: 'destructive',
      });
      return;
    }

    if (newPrice <= 0) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין מחיר תקין (מספר חיובי)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create the new subscription type
      await createSubscriptionType.mutateAsync({
        name: newName.trim(),
        duration: newDuration,
        duration_unit: newDurationUnit,
        price: newPrice,
        currency: newCurrency,
      });

      toast({
        title: 'סוג מנוי נוצר בהצלחה',
        description: `סוג המנוי "${newName}" נוסף למערכת`,
      });

      // Use the new subscription type for the lead
      onConfirm({
        name: newName.trim(),
        duration: newDuration,
        duration_unit: newDurationUnit,
        price: newPrice,
      });

      resetForm();
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

  const resetForm = () => {
    setSelectedSubscriptionTypeId('');
    setIsCreatingNew(false);
    setNewName('');
    setNewDuration(1);
    setNewDurationUnit('months');
    setNewPrice(0);
    setNewCurrency('ILS');
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Reset selection when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור מנוי</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isCreatingNew ? (
            <>
              {/* Select existing subscription type */}
              <div className="space-y-2">
                <Label htmlFor="subscription-type">בחר סוג מנוי</Label>
                <Select
                  value={selectedSubscriptionTypeId}
                  onValueChange={setSelectedSubscriptionTypeId}
                  dir="rtl"
                >
                  <SelectTrigger id="subscription-type" dir="rtl">
                    <SelectValue placeholder="בחר סוג מנוי" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        טוען...
                      </SelectItem>
                    ) : subscriptionTypes.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        אין סוגי מנויים זמינים
                      </SelectItem>
                    ) : (
                      subscriptionTypes.map((st) => {
                        const currencySymbol = st.currency === 'USD' ? '$' : 
                                              st.currency === 'EUR' ? '€' : '₪';
                        const durationUnit = st.duration_unit || 'months';
                        return (
                          <SelectItem key={st.id} value={st.id}>
                            {st.name} - {st.duration} {getDurationUnitLabel(durationUnit, st.duration)} - {currencySymbol}{st.price.toLocaleString('he-IL')}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Show selected subscription type details */}
              {selectedSubscriptionType && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-gray-700">פרטי המנוי שנבחר:</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>שם: {selectedSubscriptionType.name}</p>
                    <p>תוקף: {selectedSubscriptionType.duration} {getDurationUnitLabel(selectedSubscriptionType.duration_unit || 'months', selectedSubscriptionType.duration)}</p>
                    <p>מחיר: {
                      selectedSubscriptionType.currency === 'USD' ? '$' : 
                      selectedSubscriptionType.currency === 'EUR' ? '€' : '₪'
                    }{selectedSubscriptionType.price.toLocaleString('he-IL')}</p>
                  </div>
                </div>
              )}

              {/* Button to switch to create new mode */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsCreatingNew(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף סוג מנוי חדש
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Create new subscription type form */}
              <div className="space-y-2">
                <Label htmlFor="new-name">שם המנוי *</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="לדוגמה: מנוי 3 חודשים"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>תוקף *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="new-duration"
                    type="number"
                    min="1"
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value) || 1)}
                    dir="rtl"
                  />
                  <Select
                    value={newDurationUnit}
                    onValueChange={(value) => setNewDurationUnit(value as DurationUnit)}
                  >
                    <SelectTrigger id="new-duration-unit" className="w-full" dir="rtl">
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
                  {newDuration} {getDurationUnitLabel(newDurationUnit, newDuration)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-currency">מטבע *</Label>
                  <Select
                    value={newCurrency}
                    onValueChange={(value) => setNewCurrency(value as Currency)}
                  >
                    <SelectTrigger id="new-currency" className="w-full" dir="rtl">
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
                  <Label htmlFor="new-price">מחיר *</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-900">
                      {getCurrencySymbol(newCurrency)}
                    </span>
                    <Input
                      id="new-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Preview of new subscription type */}
              {newName && newDuration > 0 && newPrice > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-blue-700">סוג מנוי חדש:</p>
                  <div className="text-sm text-blue-600 space-y-1">
                    <p>שם: {newName}</p>
                    <p>תוקף: {newDuration} {getDurationUnitLabel(newDurationUnit, newDuration)}</p>
                    <p>מחיר: {getCurrencySymbol(newCurrency)}{newPrice.toLocaleString('he-IL')}</p>
                  </div>
                </div>
              )}

              {/* Button to go back to select mode */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-gray-600"
                  onClick={() => setIsCreatingNew(false)}
                >
                  חזור לבחירת סוג מנוי קיים
                </Button>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            ביטול
          </Button>
          {!isCreatingNew ? (
            <Button onClick={handleConfirm} disabled={!selectedSubscriptionType}>
              צור מנוי
            </Button>
          ) : (
            <Button 
              onClick={handleCreateAndConfirm} 
              disabled={isSaving || !newName.trim() || newDuration <= 0 || newPrice <= 0}
            >
              {isSaving ? 'יוצר...' : 'צור סוג מנוי ושייך ללקוח'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
