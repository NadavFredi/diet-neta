/**
 * AddSubscriptionTypeDialog Component
 * 
 * Dialog for adding a new subscription type.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AddSubscriptionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; duration: number; price: number }) => Promise<void>;
}

export const AddSubscriptionTypeDialog = ({
  isOpen,
  onOpenChange,
  onSave,
}: AddSubscriptionTypeDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

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
      await onSave({ name: name.trim(), duration, price });
      setName('');
      setDuration(1);
      setPrice(0);
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
    setPrice(0);
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
            <Label htmlFor="duration">תוקף (חודשים) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">מחיר (₪) *</Label>
            <Input
              id="price"
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
