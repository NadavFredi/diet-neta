/**
 * AddPaymentDialog Component
 * 
 * Dialog for creating a new payment linked to a lead/customer.
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
import { useCollectionsByLead } from '@/hooks/useCollectionsByLead';

interface AddPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  customerId?: string | null;
  onPaymentCreated?: () => void | Promise<void>;
}

export const AddPaymentDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  customerId,
  onPaymentCreated,
}: AddPaymentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch collections for the current lead
  const { data: collections = [], isLoading: isLoadingCollections } = useCollectionsByLead(leadId || null);

  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    lead_id: leadId || '',
    collection_id: 'none',
    product_name: '',
    amount: '',
    currency: 'ILS',
    status: 'שולם',
    notes: '',
  });

  // Reset form when dialog opens/closes or IDs change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_id: customerId || '',
        lead_id: leadId || '',
        collection_id: 'none',
        product_name: '',
        amount: '',
        currency: 'ILS',
        status: 'שולם',
        notes: '',
      });
    }
  }, [isOpen, leadId, customerId]);

  // Auto-fill product name when collection is selected
  useEffect(() => {
    if (formData.collection_id && formData.collection_id !== 'none') {
      const selectedCollection = collections.find((c) => c.id === formData.collection_id);
      if (selectedCollection?.description) {
        setFormData((prev) => ({
          ...prev,
          product_name: selectedCollection.description || '',
        }));
      }
    }
  }, [formData.collection_id, collections]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור לקוח',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.product_name || formData.product_name.trim() === '') {
      toast({
        title: 'שגיאה',
        description: 'יש להזין שם מוצר',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
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
        .from('payments')
        .insert({
          customer_id: formData.customer_id,
          lead_id: formData.lead_id || null,
          collection_id: formData.collection_id && formData.collection_id !== 'none' ? formData.collection_id : null,
          product_name: formData.product_name.trim(),
          amount: Number(formData.amount),
          currency: formData.currency,
          status: formData.status,
          notes: formData.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'התשלום נוצר בהצלחה',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['collections-by-lead'] });
      queryClient.invalidateQueries({ queryKey: ['all-collections'] });

      // Call callback if provided
      if (onPaymentCreated) {
        await onPaymentCreated();
      }

      // Close dialog
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן ליצור את התשלום. אנא נסה שוב.',
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
          <DialogTitle>צור תשלום חדש</DialogTitle>
          <DialogDescription>
            צור תשלום חדש המקושר ללקוח/ליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product_name">שם מוצר *</Label>
            <Input
              id="product_name"
              type="text"
              value={formData.product_name}
              onChange={(e) => handleInputChange('product_name', e.target.value)}
              placeholder="שם המוצר או השירות"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">סכום *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">מטבע</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ILS">₪ ILS</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="שולם">שולם</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {leadId && (
            <div className="space-y-2">
              <Label htmlFor="collection_id">גבייה (אופציונלי)</Label>
            <Select
              value={formData.collection_id || 'none'}
              onValueChange={(value) => handleInputChange('collection_id', value)}
              disabled={isSubmitting || isLoadingCollections}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר גבייה (אופציונלי)" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא גבייה</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.description || `גבייה #${collection.id.slice(0, 8)}`} - ₪{collection.total_amount.toFixed(2)} ({collection.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {collections.length === 0 && !isLoadingCollections && (
                <p className="text-xs text-muted-foreground">אין גבייות זמינות לליד זה</p>
              )}
            </div>
          )}

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
            {isSubmitting ? 'יוצר...' : 'צור תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
