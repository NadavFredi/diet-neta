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
import { Plus, Check } from 'lucide-react';
import type { Currency, DurationUnit, SubscriptionType } from '@/store/slices/subscriptionTypesSlice';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialSubscription1?: {
    duration: number;
    duration_unit: DurationUnit;
    price: number;
    currency?: Currency;
    status: string;
  };
  onConfirm: (
    subscription1: { name: string; duration: number; duration_unit: DurationUnit; price: number; currency?: Currency; status: string },
    subscription2?: { name: string; duration: number; duration_unit: DurationUnit; price: number; currency?: Currency; status: string }
  ) => void;
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
  initialSubscription1,
}: CreateSubscriptionModalProps) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { subscriptionTypes, isLoading } = useAppSelector((state) => state.subscriptionTypes);
  const createSubscriptionType = useCreateSubscriptionType();
  
  // Selection state for subscription
  const [selectedSubscriptionTypeId, setSelectedSubscriptionTypeId] = useState<string>('');
  const [selectedStatus1, setSelectedStatus1] = useState<string>('פעיל');
  const [selectedStatus2, setSelectedStatus2] = useState<string>('פעיל');

  // Second subscription state (manual addition)
  const [addSecondSubscription, setAddSecondSubscription] = useState(false);
  const [selectedSubscriptionTypeId2, setSelectedSubscriptionTypeId2] = useState<string>('');
  const [selectedStatus2Manual, setSelectedStatus2Manual] = useState<string>('פעיל');

  // New subscription creation state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // New subscription type form fields
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState<number>(1);
  const [newDurationUnit, setNewDurationUnit] = useState<DurationUnit>('months');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newCurrency, setNewCurrency] = useState<Currency>('ILS');
  const [newStatus, setNewStatus] = useState<string>('פעיל');
  const [isSaving, setIsSaving] = useState(false);

  // Second subscription creation state (for new subscription type mode)
  const [addSecondSubscriptionNew, setAddSecondSubscriptionNew] = useState(false);
  const [newName2, setNewName2] = useState('');
  const [newDuration2, setNewDuration2] = useState<number>(1);
  const [newDurationUnit2, setNewDurationUnit2] = useState<DurationUnit>('months');
  const [newPrice2, setNewPrice2] = useState<number>(0);
  const [newCurrency2, setNewCurrency2] = useState<Currency>('ILS');
  const [newStatus2, setNewStatus2] = useState<string>('פעיל');

  // Fetch subscription types when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubscriptionTypes());
    }
  }, [isOpen, dispatch]);

  // Try to match initial subscription to an existing type
  useEffect(() => {
    if (isOpen && initialSubscription1 && subscriptionTypes.length > 0 && !selectedSubscriptionTypeId) {
      const match = subscriptionTypes.find(st => 
        st.duration === initialSubscription1.duration &&
        st.duration_unit === initialSubscription1.duration_unit &&
        st.price === initialSubscription1.price &&
        st.currency === (initialSubscription1.currency || 'ILS')
      );
      
      if (match) {
        setSelectedSubscriptionTypeId(match.id);
        setSelectedStatus1(initialSubscription1.status || 'פעיל');
      }
    }
  }, [isOpen, initialSubscription1, subscriptionTypes, selectedSubscriptionTypeId]);

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
        description: 'נא לבחור מנוי',
        variant: 'destructive',
      });
      return;
    }

    const sub1 = {
      name: selectedSubscriptionType.name,
      duration: selectedSubscriptionType.duration,
      duration_unit: selectedSubscriptionType.duration_unit || 'months',
      price: selectedSubscriptionType.price,
      currency: selectedSubscriptionType.currency || 'ILS',
      status: selectedStatus1,
    };

    // Check for second subscription: bundle first, then manual selection
    let sub2;
    if (selectedSubscriptionType.second_period) {
      // Bundle second period (automatic)
      sub2 = {
        name: selectedSubscriptionType.name + ' - תקופה שנייה',
        duration: selectedSubscriptionType.second_period.duration,
        duration_unit: selectedSubscriptionType.second_period.duration_unit || 'months',
        price: selectedSubscriptionType.second_period.price,
        currency: selectedSubscriptionType.second_period.currency || 'ILS',
        status: selectedStatus2,
      };
    } else if (addSecondSubscription && selectedSubscriptionTypeId2) {
      // Manual second subscription selection
      const selectedType2 = subscriptionTypes.find(st => st.id === selectedSubscriptionTypeId2);
      if (selectedType2) {
        sub2 = {
          name: selectedType2.name,
          duration: selectedType2.duration,
          duration_unit: selectedType2.duration_unit || 'months',
          price: selectedType2.price,
          currency: selectedType2.currency || 'ILS',
          status: selectedStatus2Manual,
        };
      }
    }

    onConfirm(sub1, sub2);
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

    // Validate second subscription if enabled
    if (addSecondSubscriptionNew) {
      if (!newName2.trim()) {
        toast({
          title: 'שגיאה',
          description: 'נא להזין שם מנוי לתקופה שנייה',
          variant: 'destructive',
        });
        return;
      }

      if (newDuration2 <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא להזין תוקף תקין לתקופה שנייה (מספר חיובי)',
          variant: 'destructive',
        });
        return;
      }

      if (newPrice2 <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא להזין מחיר תקין לתקופה שנייה (מספר חיובי)',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Create the new subscription type for first period
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

      const sub1 = {
        name: newName.trim(),
        duration: newDuration,
        duration_unit: newDurationUnit,
        price: newPrice,
        currency: newCurrency,
        status: newStatus,
      };

      // Create second subscription if enabled
      let sub2;
      if (addSecondSubscriptionNew) {
        // Create second subscription type
        await createSubscriptionType.mutateAsync({
          name: newName2.trim(),
          duration: newDuration2,
          duration_unit: newDurationUnit2,
          price: newPrice2,
          currency: newCurrency2,
        });

        sub2 = {
          name: newName2.trim(),
          duration: newDuration2,
          duration_unit: newDurationUnit2,
          price: newPrice2,
          currency: newCurrency2,
          status: newStatus2,
        };
      }

      onConfirm(sub1, sub2);
      
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
    setSelectedStatus1('פעיל');
    setSelectedStatus2('פעיל');
    
    // Reset second subscription state
    setAddSecondSubscription(false);
    setSelectedSubscriptionTypeId2('');
    setSelectedStatus2Manual('פעיל');
    
    setIsCreatingNew(false);
    setNewName('');
    setNewDuration(1);
    setNewDurationUnit('months');
    setNewPrice(0);
    setNewCurrency('ILS');
    setNewStatus('פעיל');
    
    // Reset second subscription creation state
    setAddSecondSubscriptionNew(false);
    setNewName2('');
    setNewDuration2(1);
    setNewDurationUnit2('months');
    setNewPrice2(0);
    setNewCurrency2('ILS');
    setNewStatus2('פעיל');
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

  const renderSubscriptionSelect = (
    label: string,
    selectedId: string,
    setSelectedId: (id: string) => void,
    selectedStatus: string,
    setSelectedStatus: (status: string) => void,
    selectedType: SubscriptionType | undefined
  ) => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
      <h3 className="font-semibold text-gray-900">{label}</h3>
      <div className="space-y-2">
        <Label>בחר סוג מנוי</Label>
        <Select
          value={selectedId}
          onValueChange={setSelectedId}
          dir="rtl"
        >
          <SelectTrigger dir="rtl" className="bg-white">
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

      {selectedType && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1 bg-white p-3 rounded border">
            <p>שם: {selectedType.name}</p>
            <p>תוקף: {selectedType.duration} {getDurationUnitLabel(selectedType.duration_unit || 'months', selectedType.duration)}</p>
            <p>מחיר: {
              selectedType.currency === 'USD' ? '$' : 
              selectedType.currency === 'EUR' ? '€' : '₪'
            }{selectedType.price.toLocaleString('he-IL')}</p>
          </div>
          
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              dir="rtl"
            >
              <SelectTrigger dir="rtl" className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="פעיל">פעיל</SelectItem>
                <SelectItem value="לא פעיל">לא פעיל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור מנוי</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isCreatingNew ? (
            <>
              {renderSubscriptionSelect(
                "בחר מנוי",
                selectedSubscriptionTypeId,
                setSelectedSubscriptionTypeId,
                selectedStatus1,
                setSelectedStatus1,
                selectedSubscriptionType
              )}

              {/* Show second period preview if bundle exists */}
              {selectedSubscriptionType?.second_period && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">תקופה שנייה (כלולה בחבילה)</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      חבילה
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 bg-white p-3 rounded border">
                    <p>תוקף: {selectedSubscriptionType.second_period.duration} {getDurationUnitLabel(selectedSubscriptionType.second_period.duration_unit || 'months', selectedSubscriptionType.second_period.duration)}</p>
                    <p>מחיר: {
                      selectedSubscriptionType.second_period.currency === 'USD' ? '$' : 
                      selectedSubscriptionType.second_period.currency === 'EUR' ? '€' : '₪'
                    }{selectedSubscriptionType.second_period.price.toLocaleString('he-IL')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>סטטוס תקופה שנייה</Label>
                    <Select
                      value={selectedStatus2}
                      onValueChange={setSelectedStatus2}
                      dir="rtl"
                    >
                      <SelectTrigger dir="rtl" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="ממתין">ממתין</SelectItem>
                        <SelectItem value="פעיל">פעיל</SelectItem>
                        <SelectItem value="בוטל">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full text-gray-600"
                  onClick={() => setIsCreatingNew(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  צור סוג מנוי חדש
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
              
              {/* Status selection for new subscription */}
              <div className="space-y-2">
                <Label htmlFor="new-status">סטטוס</Label>
                <Select
                  value={newStatus}
                  onValueChange={setNewStatus}
                  dir="rtl"
                >
                  <SelectTrigger id="new-status" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="פעיל">פעיל</SelectItem>
                    <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview of new subscription type */}
              {newName && newDuration > 0 && newPrice > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-blue-700">תקופה 1 (נוכחי):</p>
                  <div className="text-sm text-blue-600 space-y-1">
                    <p>שם: {newName}</p>
                    <p>תוקף: {newDuration} {getDurationUnitLabel(newDurationUnit, newDuration)}</p>
                    <p>מחיר: {getCurrencySymbol(newCurrency)}{newPrice.toLocaleString('he-IL')}</p>
                    <p>סטטוס: {newStatus}</p>
                  </div>
                </div>
              )}

              {/* Second subscription option for new subscription type */}
              <Separator className="my-4" />
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-second-subscription-new"
                    checked={addSecondSubscriptionNew}
                    onChange={(e) => setAddSecondSubscriptionNew(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="add-second-subscription-new" className="font-semibold text-gray-900 cursor-pointer">
                    הוסף תקופה שנייה (עתידי)
                  </Label>
                </div>

                {addSecondSubscriptionNew && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-name-2">שם המנוי לתקופה שנייה *</Label>
                      <Input
                        id="new-name-2"
                        value={newName2}
                        onChange={(e) => setNewName2(e.target.value)}
                        placeholder="לדוגמה: מנוי 3 חודשים - תקופה שנייה"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>תוקף תקופה שנייה *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          id="new-duration-2"
                          type="number"
                          min="1"
                          value={newDuration2}
                          onChange={(e) => setNewDuration2(parseInt(e.target.value) || 1)}
                          dir="rtl"
                        />
                        <Select
                          value={newDurationUnit2}
                          onValueChange={(value) => setNewDurationUnit2(value as DurationUnit)}
                        >
                          <SelectTrigger id="new-duration-unit-2" className="w-full" dir="rtl">
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
                        {newDuration2} {getDurationUnitLabel(newDurationUnit2, newDuration2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="new-currency-2">מטבע *</Label>
                        <Select
                          value={newCurrency2}
                          onValueChange={(value) => setNewCurrency2(value as Currency)}
                        >
                          <SelectTrigger id="new-currency-2" className="w-full" dir="rtl">
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
                        <Label htmlFor="new-price-2">מחיר תקופה שנייה *</Label>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-900">
                            {getCurrencySymbol(newCurrency2)}
                          </span>
                          <Input
                            id="new-price-2"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newPrice2}
                            onChange={(e) => setNewPrice2(parseFloat(e.target.value) || 0)}
                            className="pr-10"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Status selection for second subscription */}
                    <div className="space-y-2">
                      <Label htmlFor="new-status-2">סטטוס תקופה שנייה</Label>
                      <Select
                        value={newStatus2}
                        onValueChange={setNewStatus2}
                        dir="rtl"
                      >
                        <SelectTrigger id="new-status-2" dir="rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="ממתין">ממתין</SelectItem>
                          <SelectItem value="פעיל">פעיל</SelectItem>
                          <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview of second subscription */}
                    {newName2 && newDuration2 > 0 && newPrice2 > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg space-y-2">
                        <p className="text-sm font-semibold text-green-700">תקופה 2 (עתידי):</p>
                        <div className="text-sm text-green-600 space-y-1">
                          <p>שם: {newName2}</p>
                          <p>תוקף: {newDuration2} {getDurationUnitLabel(newDurationUnit2, newDuration2)}</p>
                          <p>מחיר: {getCurrencySymbol(newCurrency2)}{newPrice2.toLocaleString('he-IL')}</p>
                          <p>סטטוס: {newStatus2}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Button to go back to select mode */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-gray-600"
                  onClick={() => setIsCreatingNew(false)}
                >
                  חזור לבחירת מנוי קיים
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
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedSubscriptionType}
            >
              צור מנוי
            </Button>
          ) : (
            <Button 
              onClick={handleCreateAndConfirm} 
              disabled={
                isSaving || 
                !newName.trim() || 
                newDuration <= 0 || 
                newPrice <= 0 || 
                !newStatus ||
                (addSecondSubscriptionNew && (!newName2.trim() || newDuration2 <= 0 || newPrice2 <= 0))
              }
            >
              {isSaving ? 'יוצר...' : 'צור סוג מנוי ושייך ללקוח'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
