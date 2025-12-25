/**
 * LeadPaymentCard Component
 * 
 * Stripe Payment Center card for generating payment links and sending via WhatsApp
 * Features:
 * - Currency selector (ILS, USD, EUR)
 * - Amount input
 * - Template editor for payment message
 * - Stripe payment link generation
 * - WhatsApp integration
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Settings, Send, Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setAmount,
  setCurrency,
  setGeneratingLink,
  setLastGeneratedLink,
  setPaymentMessageTemplate,
  setError,
  resetPaymentState,
  type Currency,
} from '@/store/slices/paymentSlice';
import { createStripePaymentLink, convertToSmallestUnit } from '@/services/stripeService';
import { sendWhatsAppMessage, replacePlaceholders, formatPhoneNumber } from '@/services/greenApiService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadPaymentCardProps {
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

export const LeadPaymentCard: React.FC<LeadPaymentCardProps> = ({
  customerPhone,
  customerName,
  customerEmail,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

  // Redux state
  const {
    currentAmount,
    selectedCurrency,
    isGeneratingLink,
    lastGeneratedLink,
    paymentMessageTemplate,
    error,
  } = useAppSelector((state) => state.payment);

  // Load template from localStorage on mount
  useEffect(() => {
    const savedTemplate = localStorage.getItem('paymentMessageTemplate');
    if (savedTemplate) {
      dispatch(setPaymentMessageTemplate(savedTemplate));
    }
  }, [dispatch]);

  // Save template to localStorage when it changes
  useEffect(() => {
    if (paymentMessageTemplate) {
      localStorage.setItem('paymentMessageTemplate', paymentMessageTemplate);
    }
  }, [paymentMessageTemplate]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      dispatch(setAmount(value));
      dispatch(setError(null));
    }
  };

  const handleCurrencyChange = (value: Currency) => {
    dispatch(setCurrency(value));
    dispatch(setError(null));
  };

  const handleSaveTemplate = async (template: string) => {
    dispatch(setPaymentMessageTemplate(template));
    localStorage.setItem('paymentMessageTemplate', template);
  };

  const handleCreateAndSend = async () => {
    // Validation
    if (!currentAmount || parseFloat(currentAmount) <= 0) {
      dispatch(setError('אנא הזן סכום תקין'));
      toast({
        title: 'שגיאה',
        description: 'אנא הזן סכום תקין',
        variant: 'destructive',
      });
      return;
    }

    if (!customerPhone) {
      dispatch(setError('מספר טלפון לא זמין'));
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין ללקוח',
        variant: 'destructive',
      });
      return;
    }

    dispatch(setGeneratingLink(true));
    dispatch(setError(null));

    try {
      // Convert amount to smallest currency unit
      const amountInSmallestUnit = convertToSmallestUnit(
        parseFloat(currentAmount),
        selectedCurrency
      );

      // Create Stripe payment link
      const stripeResponse = await createStripePaymentLink({
        amount: amountInSmallestUnit,
        currency: normalizeCurrency(selectedCurrency),
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        description: `תשלום - ${currentAmount} ${selectedCurrency}`,
      });

      if (!stripeResponse.success || !stripeResponse.paymentUrl) {
        const errorMsg = stripeResponse.error || 'שגיאה ביצירת קישור תשלום';
        dispatch(setError(errorMsg));
        toast({
          title: 'שגיאה',
          description: errorMsg,
          variant: 'destructive',
        });
        dispatch(setGeneratingLink(false));
        return;
      }

      const paymentUrl = stripeResponse.paymentUrl;
      dispatch(setLastGeneratedLink(paymentUrl));

      // Replace placeholders in template
      const message = replacePlaceholders(paymentMessageTemplate, {
        name: customerName || 'לקוח',
        phone: customerPhone || '',
        email: customerEmail || '',
        payment_link: paymentUrl,
      });

      // Send WhatsApp message
      const whatsappResponse = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        message: message,
      });

      if (!whatsappResponse.success) {
        dispatch(setError(whatsappResponse.error || 'שגיאה בשליחת הודעת WhatsApp'));
        toast({
          title: 'שגיאה',
          description: whatsappResponse.error || 'שגיאה בשליחת הודעת WhatsApp',
          variant: 'destructive',
        });
        dispatch(setGeneratingLink(false));
        return;
      }

      // Success!
      toast({
        title: 'הצלחה!',
        description: 'קישור התשלום נשלח בהצלחה ל-WhatsApp',
      });

      // Reset form
      dispatch(resetPaymentState());
    } catch (error: any) {
      console.error('[LeadPaymentCard] Error:', error);
      dispatch(setError(error?.message || 'שגיאה לא צפויה'));
      toast({
        title: 'שגיאה',
        description: error?.message || 'שגיאה לא צפויה',
        variant: 'destructive',
      });
    } finally {
      dispatch(setGeneratingLink(false));
    }
  };

  // Normalize currency for Stripe API (lowercase)
  const normalizeCurrency = (currency: Currency): 'ils' | 'usd' | 'eur' => {
    return currency.toLowerCase() as 'ils' | 'usd' | 'eur';
  };

  // Get currency symbol
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

  // Format preview message (replace placeholders with example values)
  const getPreviewMessage = (): string => {
    return replacePlaceholders(paymentMessageTemplate, {
      name: customerName || 'שם הלקוח',
      phone: customerPhone || '050-1234567',
      email: customerEmail || 'customer@example.com',
      payment_link: 'https://buy.stripe.com/example',
    });
  };

  return (
    <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <CreditCard className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">מרכז תשלומים Stripe</h3>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Currency and Amount Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Currency Selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency" className="text-xs text-gray-500 font-medium">
              מטבע:
            </Label>
            <Select
              value={selectedCurrency}
              onValueChange={handleCurrencyChange}
              disabled={isGeneratingLink}
            >
              <SelectTrigger
                id="currency"
                className="h-9 text-sm border-2 border-slate-300 focus:border-[#5B6FB9]"
                dir="rtl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ILS">₪ ILS (שקל)</SelectItem>
                <SelectItem value="USD">$ USD (דולר)</SelectItem>
                <SelectItem value="EUR">€ EUR (יורו)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount" className="text-xs text-gray-500 font-medium">
              סכום:
            </Label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">
                {getCurrencySymbol(selectedCurrency)}
              </span>
              <Input
                id="amount"
                type="text"
                value={currentAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className={cn(
                  "h-9 text-sm pr-10 border-2 border-slate-300 focus:border-[#5B6FB9]",
                  error && "border-red-300 focus:border-red-500"
                )}
                disabled={isGeneratingLink}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Template Preview */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500 font-medium">תצוגה מקדימה של ההודעה:</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTemplateEditorOpen(true)}
              disabled={isGeneratingLink}
              className="h-7 px-2 text-xs"
            >
              <Settings className="h-3.5 w-3.5 ml-1" />
              ערוך תבנית
            </Button>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap min-h-[80px] max-h-[120px] overflow-y-auto">
            {getPreviewMessage()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleCreateAndSend}
            disabled={isGeneratingLink || !currentAmount || parseFloat(currentAmount) <= 0 || !customerPhone}
            className={cn(
              "flex-1 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white",
              "h-10 text-sm font-semibold"
            )}
          >
            {isGeneratingLink ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                יוצר ושולח...
              </>
            ) : (
              <>
                <Send className="ml-2 h-4 w-4" />
                צור ושלח בקשת תשלום
              </>
            )}
          </Button>
        </div>

        {/* Last Generated Link (if exists) */}
        {lastGeneratedLink && !isGeneratingLink && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 font-medium mb-1">קישור תשלום שנוצר:</p>
            <a
              href={lastGeneratedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:text-green-800 underline break-all"
            >
              {lastGeneratedLink}
            </a>
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onOpenChange={setIsTemplateEditorOpen}
        flowKey="payment_request"
        flowLabel="בקשת תשלום"
        initialTemplate={paymentMessageTemplate}
        onSave={handleSaveTemplate}
      />
    </Card>
  );
};
