/**
 * EditSubscriptionTypeDialog Component
 * 
 * Dialog for editing an existing subscription type.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionType } from '@/hooks/useSubscriptionTypes';

interface EditSubscriptionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubscriptionType: SubscriptionType | null;
  onSave: (data: { subscriptionTypeId: string; name: string; duration: number; price: number }) => Promise<void>;
}

export const EditSubscriptionTypeDialog = ({
  isOpen,
  onOpenChange,
  editingSubscriptionType,
  onSave,
}: EditSubscriptionTypeDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingSubscriptionType) {
      setName(editingSubscriptionType.name);
      setDuration(editingSubscriptionType.duration);
      setPrice(editingSubscriptionType.price);
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
        description: 'נא להזין מחיר תקין (מספר חיובי)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        subscriptionTypeId: editingSubscriptionType.id,
        name: name.trim(),
        duration,
        price,
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
      setPrice(editingSubscriptionType.price);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-md" dir="rtl">
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
          <div className="space-y-2">
            <Label htmlFor="edit-duration">תוקף (חודשים) *</Label>
            <Input
              id="edit-duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-price">מחיר (₪) *</Label>
            <Input
              id="edit-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              dir="rtl"
            />
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
