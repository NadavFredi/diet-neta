/**
 * AddPaymentDialog Component
 * 
 * Dialog for creating a new payment linked to a lead.
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCollectionsByLead } from '@/hooks/useCollectionsByLead';
import { useAllCollections, type AllCollectionRecord } from '@/hooks/useAllCollections';
import { cn } from '@/lib/utils';

interface AddPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  onPaymentCreated?: () => void | Promise<void>;
}

export const AddPaymentDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  onPaymentCreated,
}: AddPaymentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch collections for the current lead if leadId prop is provided
  const { data: leadCollections = [], isLoading: isLoadingLeadCollections } = useCollectionsByLead(leadId || null);

  // Fetch all collections if no leadId is provided
  const { data: allCollectionsData, isLoading: isLoadingAllCollections } = useAllCollections();

  // Fetch leads for selection (only when not pre-filled)
  const [leads, setLeads] = useState<Array<{ id: string; customer_id: string; customer?: { full_name: string; phone?: string } }>>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Fetch leads when dialog opens and no leadId is provided
  useEffect(() => {
    if (isOpen && !leadId) {
      setIsLoadingLeads(true);
      supabase
        .from('leads')
        .select('id, customer_id, customer:customers(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(1000)
        .then(({ data, error }) => {
          if (error) {
            toast({
              title: 'שגיאה',
              description: 'לא ניתן לטעון את רשימת הלידים',
              variant: 'destructive',
            });
          }
          if (!error && data) {
            setLeads(data as any);
          }
          setIsLoadingLeads(false);
        });
    } else if (!isOpen) {
      // Reset leads when dialog closes
      setLeads([]);
    }
  }, [isOpen, leadId, toast]);

  const [formData, setFormData] = useState({
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
        lead_id: leadId || '',
        collection_id: 'none',
        product_name: '',
        amount: '',
        currency: 'ILS',
        status: 'שולם',
        notes: '',
      });
    }
  }, [isOpen, leadId]);

  // Determine effective leadId (from prop or form selection)
  const effectiveLeadId = useMemo(() => leadId || formData.lead_id || null, [leadId, formData.lead_id]);

  // If user selected a lead dynamically, we need to fetch its collections
  const { data: dynamicLeadCollections = [], isLoading: isLoadingDynamicLeadCollections } = useCollectionsByLead(
    formData.lead_id && !leadId ? formData.lead_id : null
  );

  // Determine which collections to use based on selected lead
  const collections = useMemo(() => {
    // Use dynamic lead collections if lead was selected from form (and not from prop)
    if (formData.lead_id && !leadId) {
      return dynamicLeadCollections;
    }

    // If leadId prop is provided, use collections from that lead
    if (leadId) {
      return leadCollections;
    }

    // If no leadId, return all collections
    return allCollectionsData?.data || [];
  }, [leadId, formData.lead_id, leadCollections, dynamicLeadCollections, allCollectionsData]);

  const isLoadingCollections =
    (formData.lead_id && !leadId) ? isLoadingDynamicLeadCollections :
      leadId ? isLoadingLeadCollections :
        isLoadingAllCollections;

  // Helper function to format collection display without ID
  const formatCollectionDisplay = (collection: AllCollectionRecord | undefined) => {
    if (!collection) return '';

    const parts: string[] = [];

    // Add customer name if available
    if (collection.customer_name) {
      parts.push(collection.customer_name);
    }

    // Add status in parentheses
    if (collection.status) {
      parts.push(`(${collection.status})`);
    }

    // Add amount
    if (collection.total_amount) {
      parts.push(`₪${collection.total_amount.toFixed(2)}`);
    }

    // If no customer name, use description as fallback
    if (!collection.customer_name && collection.description) {
      return `${collection.description} - (${collection.status}) ₪${collection.total_amount.toFixed(2)}`;
    }

    return parts.join(' - ');
  };

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Require lead_id
    if (!formData.lead_id) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור ליד כדי ליצור תשלום',
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
      // Get customer_id from the selected lead
      let customerIdFromLead: string | null = null;
      if (formData.lead_id) {
        const selectedLead = leads.find((l) => l.id === formData.lead_id);
        if (selectedLead?.customer_id) {
          customerIdFromLead = selectedLead.customer_id;
        } else {
          // Fetch customer_id from lead if not in local state
          const { data: leadData } = await supabase
            .from('leads')
            .select('customer_id')
            .eq('id', formData.lead_id)
            .single();

          if (leadData?.customer_id) {
            customerIdFromLead = leadData.customer_id;
          }
        }
      }

      if (!customerIdFromLead && formData.lead_id) {
        toast({
          title: 'שגיאה',
          description: 'לא ניתן למצוא לקוח מקושר לליד זה',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          customer_id: customerIdFromLead,
          lead_id: formData.lead_id,
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
      // Invalidate all payments queries (regardless of filters)
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
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
            צור תשלום חדש המקושר לליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lead selection - show when not pre-filled from props */}
          {!leadId && (
            <div className="space-y-2">
              <Label htmlFor="lead_id">ליד *</Label>
              {leads.length > 5 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !formData.lead_id && "text-muted-foreground"
                      )}
                      disabled={isSubmitting || isLoadingLeads}
                    >
                      {isLoadingLeads
                        ? "טוען לידים..."
                        : formData.lead_id
                          ? leads.find((lead) => lead.id === formData.lead_id)?.customer?.full_name || `ליד #${formData.lead_id.slice(0, 8)}`
                          : "בחר ליד *"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" dir="rtl">
                    <Command>
                      <CommandInput placeholder="חפש ליד..." dir="rtl" />
                      <CommandList>
                        <CommandEmpty>לא נמצאו לידים</CommandEmpty>
                        <CommandGroup>
                          {leads.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={`${lead.customer?.full_name || ''} ${lead.customer?.phone || ''} ${lead.id}`}
                              onSelect={() => {
                                handleInputChange('lead_id', lead.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  formData.lead_id === lead.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {lead.customer?.full_name || `ליד #${lead.id.slice(0, 8)}`}
                              {lead.customer?.phone ? ` - ${lead.customer.phone}` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Select
                  value={formData.lead_id || ''}
                  onValueChange={(value) => handleInputChange('lead_id', value)}
                  disabled={isSubmitting || isLoadingLeads}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingLeads ? "טוען לידים..." : "בחר ליד *"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.length === 0 && !isLoadingLeads ? (
                      <SelectItem value="no-leads" disabled>אין לידים זמינים</SelectItem>
                    ) : (
                      leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.customer?.full_name || `ליד #${lead.id.slice(0, 8)}`}
                          {lead.customer?.phone ? ` - ${lead.customer.phone}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {isLoadingLeads && (
                <p className="text-xs text-muted-foreground">טוען רשימת לידים...</p>
              )}
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="collection_id">גבייה (אופציונלי)</Label>
            {collections.length > 5 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      (!formData.collection_id || formData.collection_id === 'none') && "text-muted-foreground"
                    )}
                    disabled={isSubmitting || isLoadingCollections}
                  >
                    {isLoadingCollections
                      ? "טוען גביות..."
                      : formData.collection_id && formData.collection_id !== 'none'
                        ? formatCollectionDisplay(collections.find((c) => c.id === formData.collection_id)) || `גבייה #${formData.collection_id.slice(0, 8)}`
                        : "בחר גבייה (אופציונלי)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" dir="rtl">
                  <Command>
                    <CommandInput placeholder="חפש גבייה..." dir="rtl" />
                    <CommandList>
                      <CommandEmpty>לא נמצאו גביות</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            handleInputChange('collection_id', 'none');
                          }}
                        >
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              (!formData.collection_id || formData.collection_id === 'none') ? "opacity-100" : "opacity-0"
                            )}
                          />
                          ללא גבייה
                        </CommandItem>
                        {collections.map((collection) => (
                          <CommandItem
                            key={collection.id}
                            value={`${collection.description || ''} ${collection.customer_name || ''} ${collection.id}`}
                            onSelect={() => {
                              handleInputChange('collection_id', collection.id);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.collection_id === collection.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {formatCollectionDisplay(collection) || `גבייה #${collection.id.slice(0, 8)}`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
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
                      {formatCollectionDisplay(collection) || `גבייה #${collection.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {collections.length === 0 && !isLoadingCollections && (
              <p className="text-xs text-muted-foreground">
                {leadId || formData.lead_id ? 'אין גביות זמינות לליד זה' : 'אין גביות זמינות'}
              </p>
            )}
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
            {isSubmitting ? 'יוצר...' : 'צור תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
