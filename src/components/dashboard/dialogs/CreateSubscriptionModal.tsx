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
import { Plus, Check, Trash2 } from 'lucide-react';
import type { Currency, DurationUnit, SubscriptionType } from '@/store/slices/subscriptionTypesSlice';
import { Separator } from '@/components/ui/separator';

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
  defaultHasSecondPeriod?: boolean;
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
  defaultHasSecondPeriod = false,
}: CreateSubscriptionModalProps) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { subscriptionTypes, isLoading } = useAppSelector((state) => state.subscriptionTypes);
  const createSubscriptionType = useCreateSubscriptionType();
  
  // Selection state for two periods
  const [selectedSubscriptionTypeId1, setSelectedSubscriptionTypeId1] = useState<string>('');
  const [selectedStatus1, setSelectedStatus1] = useState<string>('פעיל');
  
  const [selectedSubscriptionTypeId2, setSelectedSubscriptionTypeId2] = useState<string>('');
  const [selectedStatus2, setSelectedStatus2] = useState<string>('פעיל');
  const [hasSecondPeriod, setHasSecondPeriod] = useState(false);

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

  // Fetch subscription types when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubscriptionTypes());
    }
  }, [isOpen, dispatch]);

  // Set default state for second period
  useEffect(() => {
    if (isOpen) {
      setHasSecondPeriod(defaultHasSecondPeriod);
    }
  }, [isOpen, defaultHasSecondPeriod]);

  // Try to match initial subscription to an existing type
  useEffect(() => {
    if (isOpen && initialSubscription1 && subscriptionTypes.length > 0 && !selectedSubscriptionTypeId1) {
      const match = subscriptionTypes.find(st => 
        st.duration === initialSubscription1.duration &&
        st.duration_unit === initialSubscription1.duration_unit &&
        st.price === initialSubscription1.price &&
        st.currency === (initialSubscription1.currency || 'ILS')
      );
      
      if (match) {
        setSelectedSubscriptionTypeId1(match.id);
        setSelectedStatus1(initialSubscription1.status || 'פעיל');
      }
    }
  }, [isOpen, initialSubscription1, subscriptionTypes, selectedSubscriptionTypeId1]);

  const selectedSubscriptionType1 = subscriptionTypes.find(
    (st) => st.id === selectedSubscriptionTypeId1
  );

  const selectedSubscriptionType2 = subscriptionTypes.find(
    (st) => st.id === selectedSubscriptionTypeId2
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
    if (!selectedSubscriptionType1) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור מנוי לתקופה הראשונה',
        variant: 'destructive',
      });
      return;
    }

    const sub1 = {
      name: selectedSubscriptionType1.name,
      duration: selectedSubscriptionType1.duration,
      duration_unit: selectedSubscriptionType1.duration_unit || 'months',
      price: selectedSubscriptionType1.price,
      currency: selectedSubscriptionType1.currency || 'ILS',
      status: selectedStatus1,
    };

    let sub2;
    if (hasSecondPeriod && selectedSubscriptionType2) {
      sub2 = {
        name: selectedSubscriptionType2.name,
        duration: selectedSubscriptionType2.duration,
        duration_unit: selectedSubscriptionType2.duration_unit || 'months',
        price: selectedSubscriptionType2.price,
        currency: selectedSubscriptionType2.currency || 'ILS',
        status: selectedStatus2,
      };
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

      // For simplicity, we only use the newly created type for the FIRST period
      // and reset the second period if active, or just set it as the first one.
      // The user can then add a second period if they want.
      
      const sub1 = {
        name: newName.trim(),
        duration: newDuration,
        duration_unit: newDurationUnit,
        price: newPrice,
        status: newStatus,
      };

      onConfirm(sub1);
      
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
    setSelectedSubscriptionTypeId1('');
    setSelectedStatus1('פעיל');
    setSelectedSubscriptionTypeId2('');
    setSelectedStatus2('פעיל');
    setHasSecondPeriod(false);
    
    setIsCreatingNew(false);
    setNewName('');
    setNewDuration(1);
    setNewDurationUnit('months');
    setNewPrice(0);
    setNewCurrency('ILS');
    setNewStatus('פעיל');
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
                "תקופה ראשונה",
                selectedSubscriptionTypeId1,
                setSelectedSubscriptionTypeId1,
                selectedStatus1,
                setSelectedStatus1,
                selectedSubscriptionType1
              )}

              {hasSecondPeriod ? (
                <div className="relative">
                  {renderSubscriptionSelect(
                    "תקופה שנייה",
                    selectedSubscriptionTypeId2,
                    setSelectedSubscriptionTypeId2,
                    selectedStatus2,
                    setSelectedStatus2,
                    selectedSubscriptionType2
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 left-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setHasSecondPeriod(false);
                      setSelectedSubscriptionTypeId2('');
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    הסר
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setHasSecondPeriod(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף תקופה שנייה
                </Button>
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
                  <p className="text-sm font-semibold text-blue-700">סוג מנוי חדש:</p>
                  <div className="text-sm text-blue-600 space-y-1">
                    <p>שם: {newName}</p>
                    <p>תוקף: {newDuration} {getDurationUnitLabel(newDurationUnit, newDuration)}</p>
                    <p>מחיר: {getCurrencySymbol(newCurrency)}{newPrice.toLocaleString('he-IL')}</p>
                    <p>סטטוס: {newStatus}</p>
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
            <Button onClick={handleConfirm} disabled={!selectedSubscriptionType1}>
              צור מנוי
            </Button>
          ) : (
            <Button 
              onClick={handleCreateAndConfirm} 
              disabled={isSaving || !newName.trim() || newDuration <= 0 || newPrice <= 0 || !newStatus}
            >
              {isSaving ? 'יוצר...' : 'צור סוג מנוי ושייך ללקוח'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
