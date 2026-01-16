/**
 * CreateSubscriptionModal Component
 * 
 * Modal for selecting a subscription type and populating lead subscription fields
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSubscriptionTypes } from '@/store/slices/subscriptionTypesSlice';
import { useToast } from '@/hooks/use-toast';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subscriptionType: { name: string; duration: number; price: number }) => void;
}

export const CreateSubscriptionModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: CreateSubscriptionModalProps) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { subscriptionTypes, isLoading } = useAppSelector((state) => state.subscriptionTypes);
  const [selectedSubscriptionTypeId, setSelectedSubscriptionTypeId] = useState<string>('');

  // Fetch subscription types when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubscriptionTypes());
    }
  }, [isOpen, dispatch]);

  const selectedSubscriptionType = subscriptionTypes.find(
    (st) => st.id === selectedSubscriptionTypeId
  );

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
      price: selectedSubscriptionType.price,
    });
    setSelectedSubscriptionTypeId('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedSubscriptionTypeId('');
    onOpenChange(false);
  };

  // Reset selection when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSubscriptionTypeId('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור מנוי</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
                    return (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} - {st.duration} חודשים - {currencySymbol}{st.price.toLocaleString('he-IL')}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedSubscriptionType && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-gray-700">פרטי המנוי שנבחר:</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>שם: {selectedSubscriptionType.name}</p>
                <p>תוקף: {selectedSubscriptionType.duration} חודשים</p>
                <p>מחיר: {
                  selectedSubscriptionType.currency === 'USD' ? '$' : 
                  selectedSubscriptionType.currency === 'EUR' ? '€' : '₪'
                }{selectedSubscriptionType.price.toLocaleString('he-IL')}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            ביטול
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedSubscriptionType}>
            צור מנוי
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
