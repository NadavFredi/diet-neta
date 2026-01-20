/**
 * AddCollectionDialog Component
 * 
 * Dialog for creating a new collection (גבייה) linked to a lead.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface AddCollectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  customerId?: string | null;
  onCollectionCreated?: () => void | Promise<void>;
}

export const AddCollectionDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  customerId,
  onCollectionCreated,
}: AddCollectionDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    customer_id: customerId || '',
    total_amount: '',
    due_date: '',
    status: 'ממתין',
    description: '',
    notes: '',
  });

  // Reset form when dialog opens/closes or leadId changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        lead_id: leadId || '',
        customer_id: customerId || '',
        total_amount: '',
        due_date: '',
        status: 'ממתין',
        description: '',
        notes: '',
      });
    }
  }, [isOpen, leadId, customerId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.lead_id) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור ליד',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין סכום תקין',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          lead_id: formData.lead_id,
          customer_id: formData.customer_id || null,
          total_amount: Number(formData.total_amount),
          due_date: formData.due_date || null,
          status: formData.status,
          description: formData.description || null,
          notes: formData.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הגבייה נוצרה בהצלחה',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['all-collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections-by-lead'] });

      // Call callback if provided
      if (onCollectionCreated) {
        await onCollectionCreated();
      }

      // Close dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating collection:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן ליצור את הגבייה. אנא נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>צור גבייה חדשה</DialogTitle>
          <DialogDescription>
            צור גבייה חדשה המקושרת לליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="total_amount">סכום כולל *</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.total_amount}
              onChange={(e) => handleInputChange('total_amount', e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">תאריך יעד</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">סטטוס</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ממתין">ממתין</SelectItem>
                <SelectItem value="חלקי">חלקי</SelectItem>
                <SelectItem value="הושלם">הושלם</SelectItem>
                <SelectItem value="בוטל">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="תיאור הגבייה"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="הערות נוספות"
              disabled={isSubmitting}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'יוצר...' : 'צור גבייה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
