/**
 * LeadPaymentCard Component - Professional Stripe Subscription & Payment Center
 * 
 * High-end payment module supporting both one-time charges and recurring subscriptions
 * Features:
 * - Payment type toggle (One-time / Subscription)
 * - Currency selector (ILS, USD, EUR)
 * - Amount input
 * - Subscription settings (frequency, cycles)
 * - Stripe payment/subscription link generation
 * - WhatsApp integration
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, Settings, Send, Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setAmount,
  setCurrency,
  setBillingMode,
  setSubscriptionInterval,
  setBillingCycles,
  setGeneratingLink,
  setLastGeneratedLink,
  setPaymentMessageTemplate,
  setError,
  resetPaymentState,
  type Currency,
  type BillingMode,
  type SubscriptionInterval,
} from '@/store/slices/paymentSlice';
import { createStripePaymentLink, convertToSmallestUnit } from '@/services/stripeService';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
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
    billingMode,
    subscriptionInterval,
    billingCycles,
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

  const handleBillingModeChange = (value: string) => {
    dispatch(setBillingMode(value as BillingMode));
    dispatch(setError(null));
  };

  const handleSubscriptionIntervalChange = (value: SubscriptionInterval) => {
    dispatch(setSubscriptionInterval(value));
    dispatch(setError(null));
  };


  const handleSaveTemplate = async (template: string, buttons?: Array<{ id: string; text: string }>) => {
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

      const description = billingMode === 'subscription'
        ? `הוראת קבע - ${currentAmount} ${selectedCurrency} ${subscriptionInterval === 'month' ? 'חודשי' : 'שבועי'}`
        : `תשלום - ${currentAmount} ${selectedCurrency}`;

      // Create Stripe payment/subscription link
      const stripeResponse = await createStripePaymentLink({
        amount: amountInSmallestUnit,
        currency: normalizeCurrency(selectedCurrency),
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        description,
        billingMode,
        subscriptionInterval: billingMode === 'subscription' ? subscriptionInterval : undefined,
        billingCycles: billingMode === 'subscription' ? billingCycles : undefined,
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
        description: `קישור ${billingMode === 'subscription' ? 'הוראת הקבע' : 'התשלום'} נשלח בהצלחה ל-WhatsApp`,
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

  return (
    <Card className="p-4 border-[0.5px] border-gray-200 rounded-lg shadow-sm bg-white flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-black">מרכז תשלומים Stripe</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsTemplateEditorOpen(true)}
          disabled={isGeneratingLink}
          className="h-7 px-2 text-xs text-gray-600 hover:text-black hover:bg-gray-50"
        >
          <Settings className="h-3 w-3 ml-1" />
          ערוך טמפלייט
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Payment Type Toggle */}
        <Tabs value={billingMode} onValueChange={handleBillingModeChange} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9 bg-gray-100">
            <TabsTrigger 
              value="one_time" 
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
              disabled={isGeneratingLink}
            >
              תשלום חד פעמי
            </TabsTrigger>
            <TabsTrigger 
              value="subscription" 
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
              disabled={isGeneratingLink}
            >
              הוראת קבע
            </TabsTrigger>
          </TabsList>

          {/* One-time Payment Content */}
          <TabsContent value="one_time" className="mt-3 space-y-3">
            {/* Row 1: Amount and Currency */}
            <div className="grid grid-cols-2 gap-3">
              {/* Currency Selector */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  מטבע
                </Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={handleCurrencyChange}
                  disabled={isGeneratingLink}
                >
                  <SelectTrigger
                    id="currency"
                    className="h-9 text-sm border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white"
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
                <Label htmlFor="amount" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  סכום
                </Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
                    {getCurrencySymbol(selectedCurrency)}
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    value={currentAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className={cn(
                      "h-9 text-sm pr-10 border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white",
                      error && "border-red-300 focus:border-red-500"
                    )}
                    disabled={isGeneratingLink}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subscription Content */}
          <TabsContent value="subscription" className="mt-3 space-y-3">
            {/* Row 1: Amount and Currency */}
            <div className="grid grid-cols-2 gap-3">
              {/* Currency Selector */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency-sub" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  מטבע
                </Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={handleCurrencyChange}
                  disabled={isGeneratingLink}
                >
                  <SelectTrigger
                    id="currency-sub"
                    className="h-9 text-sm border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white"
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
                <Label htmlFor="amount-sub" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  סכום
                </Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
                    {getCurrencySymbol(selectedCurrency)}
                  </span>
                  <Input
                    id="amount-sub"
                    type="text"
                    value={currentAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className={cn(
                      "h-9 text-sm pr-10 border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white",
                      error && "border-red-300 focus:border-red-500"
                    )}
                    disabled={isGeneratingLink}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Subscription Frequency and Cycles */}
            <div className="grid grid-cols-2 gap-3">
              {/* Frequency Selector */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="interval" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  תדירות
                </Label>
                <Select
                  value={subscriptionInterval}
                  onValueChange={handleSubscriptionIntervalChange}
                  disabled={isGeneratingLink}
                >
                  <SelectTrigger
                    id="interval"
                    className="h-9 text-sm border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="month">חודשי</SelectItem>
                    <SelectItem value="week">שבועי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Billing Cycles Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cycles" className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  מחזורי חיוב
                </Label>
                <Select
                  value={billingCycles === null ? 'unlimited' : String(billingCycles)}
                  onValueChange={(value) => {
                    if (value === 'unlimited') {
                      dispatch(setBillingCycles(null));
                    } else {
                      const cycles = parseInt(value, 10);
                      if (cycles > 0) {
                        dispatch(setBillingCycles(cycles));
                      }
                    }
                  }}
                  disabled={isGeneratingLink}
                >
                  <SelectTrigger
                    id="cycles"
                    className="h-9 text-sm border-[0.5px] border-gray-200 focus:border-[#5B6FB9] text-black bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="unlimited">ללא הגבלה</SelectItem>
                    <SelectItem value="1">1 מחזור</SelectItem>
                    <SelectItem value="3">3 מחזורים</SelectItem>
                    <SelectItem value="6">6 מחזורים</SelectItem>
                    <SelectItem value="12">12 מחזורים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border-[0.5px] border-red-200 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleCreateAndSend}
            disabled={isGeneratingLink || !currentAmount || parseFloat(currentAmount) <= 0 || !customerPhone}
            className={cn(
              "flex-1 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white",
              "h-9 text-sm font-medium shadow-sm"
            )}
          >
            {isGeneratingLink ? (
              <>
                <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />
                יוצר ושולח...
              </>
            ) : (
              <>
                <Send className="ml-2 h-3.5 w-3.5" />
                צור ושלח בקשת תשלום
              </>
            )}
          </Button>
        </div>

        {/* Last Generated Link (if exists) */}
        {lastGeneratedLink && !isGeneratingLink && (
          <div className="p-2.5 bg-green-50 border-[0.5px] border-green-200 rounded-lg">
            <p className="text-[10px] text-green-700 font-medium mb-1">קישור תשלום שנוצר:</p>
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
