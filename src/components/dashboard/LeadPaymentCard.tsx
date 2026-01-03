/**
 * LeadPaymentCard Component - Professional Stripe Subscription & Payment Center
 * 
 * High-end payment module with Stripe Product Catalog integration
 * Features:
 * - Product selection from Stripe catalog (default mode)
 * - Manual entry mode (fallback)
 * - Payment type auto-detection from Stripe Price
 * - Currency and amount auto-population
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreditCard, Settings, Send, Loader2, AlertCircle, Check, ChevronsUpDown, Package, Edit3, Sparkles } from 'lucide-react';
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
import { createStripePaymentLink, convertToSmallestUnit, fetchStripeProducts, type StripeProduct, type StripePrice } from '@/services/stripeService';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LeadPaymentCardProps {
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

type EntryMode = 'product' | 'manual';

export const LeadPaymentCard: React.FC<LeadPaymentCardProps> = ({
  customerPhone,
  customerName,
  customerEmail,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('product');
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<StripePrice | null>(null);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

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

  // Fetch Stripe products on mount
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      const response = await fetchStripeProducts();
      if (response.success && response.products) {
        setProducts(response.products);
      } else {
        console.error('[LeadPaymentCard] Failed to load products:', response.error);
        // Fallback to manual mode if products can't be loaded
        setEntryMode('manual');
      }
      setIsLoadingProducts(false);
    };
    loadProducts();
  }, []);

  // Auto-populate when product/price is selected
  useEffect(() => {
    if (selectedPrice && entryMode === 'product') {
      // Convert unit_amount to regular amount (divide by 100)
      const amount = selectedPrice.unit_amount / 100;
      dispatch(setAmount(amount.toFixed(2)));

      // Set currency (uppercase for display)
      const currency = selectedPrice.currency.toUpperCase() as Currency;
      dispatch(setCurrency(currency));

      // Auto-detect billing mode from price type
      if (selectedPrice.type === 'recurring') {
        dispatch(setBillingMode('subscription'));
        if (selectedPrice.recurring) {
          // Map Stripe interval to our interval
          const interval = selectedPrice.recurring.interval === 'month' ? 'month' : 'week';
          dispatch(setSubscriptionInterval(interval));
        }
      } else {
        dispatch(setBillingMode('one_time'));
      }

      dispatch(setError(null));
    }
  }, [selectedPrice, entryMode, dispatch]);

  const handleProductSelect = (product: StripeProduct, price: StripePrice) => {
    setSelectedProduct(product);
    setSelectedPrice(price);
    setIsProductSelectorOpen(false);
    setProductSearchQuery('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      dispatch(setAmount(value));
      dispatch(setError(null));
      // Clear product selection when manually editing
      if (entryMode === 'product') {
        setSelectedProduct(null);
        setSelectedPrice(null);
      }
    }
  };

  const handleCurrencyChange = (value: Currency) => {
    dispatch(setCurrency(value));
    dispatch(setError(null));
    // Clear product selection when manually changing currency
    if (entryMode === 'product') {
      setSelectedProduct(null);
      setSelectedPrice(null);
    }
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
        description: selectedProduct?.name || description,
        billingMode,
        subscriptionInterval: billingMode === 'subscription' ? subscriptionInterval : undefined,
        billingCycles: billingMode === 'subscription' ? billingCycles : undefined,
        // Use Stripe Price ID if available
        priceId: selectedPrice?.id,
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
      setSelectedProduct(null);
      setSelectedPrice(null);
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

  // Format price for display
  const formatPrice = (price: StripePrice): string => {
    const amount = price.unit_amount / 100;
    const symbol = getCurrencySymbol(price.currency.toUpperCase() as Currency);
    if (price.type === 'recurring' && price.recurring) {
      const intervalText = price.recurring.interval === 'month' ? 'חודשי' : 
                          price.recurring.interval === 'week' ? 'שבועי' : 
                          price.recurring.interval === 'year' ? 'שנתי' : 'יומי';
      return `${symbol}${amount.toFixed(2)} ${intervalText}`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) ||
           product.description?.toLowerCase().includes(query) ||
           product.prices.some(p => formatPrice(p).toLowerCase().includes(query));
  });

  return (
    <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm bg-white flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <CreditCard className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">מרכז תשלומים Stripe</h3>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Mode Toggle: Product Selection vs Manual Entry */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {entryMode === 'product' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2.5 py-1">
                <Package className="h-3 w-3 ml-1" />
                בחירת מוצר
              </Badge>
            )}
            {entryMode === 'manual' && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs px-2.5 py-1">
                <Edit3 className="h-3 w-3 ml-1" />
                הזנה ידנית
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEntryMode(entryMode === 'product' ? 'manual' : 'product');
              setSelectedProduct(null);
              setSelectedPrice(null);
              dispatch(setAmount(''));
            }}
            disabled={isGeneratingLink}
            className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
          >
            {entryMode === 'product' ? (
              <>
                <Edit3 className="h-3 w-3 ml-1.5" />
                מעבר להזנה ידנית
              </>
            ) : (
              <>
                <Package className="h-3 w-3 ml-1.5" />
                מעבר לבחירת מוצר
              </>
            )}
          </Button>
        </div>

        {/* Product Selection Mode */}
        {entryMode === 'product' && (
          <div className="space-y-4">
            {/* Product Selector */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                בחר מוצר מהקטלוג
              </Label>
              <Popover open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductSelectorOpen}
                    className="w-full justify-between h-11 text-sm bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-900 font-medium"
                    disabled={isGeneratingLink || isLoadingProducts}
                  >
                    {selectedProduct && selectedPrice ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{selectedProduct.name}</span>
                        <span className="text-xs text-slate-600 mr-2 flex-shrink-0">{formatPrice(selectedPrice)}</span>
                      </div>
                    ) : isLoadingProducts ? (
                      <span className="text-slate-500">טוען מוצרים...</span>
                    ) : (
                      <span className="text-slate-500">בחר מוצר מהקטלוג</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" dir="rtl" side="bottom">
                  <Command>
                    <CommandInput 
                      placeholder="חפש מוצר..." 
                      value={productSearchQuery}
                      onValueChange={setProductSearchQuery}
                      dir="rtl"
                    />
                    <CommandList>
                      <CommandEmpty>לא נמצאו מוצרים</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.map((product) => (
                          <div key={product.id} className="border-b border-slate-100 last:border-0">
                            {product.prices.map((price) => (
                              <CommandItem
                                key={price.id}
                                value={`${product.id}-${price.id}`}
                                onSelect={() => handleProductSelect(product, price)}
                                className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-slate-50"
                              >
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 text-sm">{product.name}</span>
                                    {price.type === 'recurring' && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">
                                        מנוי
                                      </Badge>
                                    )}
                                  </div>
                                  {product.description && (
                                    <span className="text-xs text-slate-500 truncate">{product.description}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mr-3 flex-shrink-0">
                                  <span className="text-sm font-bold text-slate-900">{formatPrice(price)}</span>
                                  {selectedPrice?.id === price.id && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </div>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected Product Info */}
            {selectedProduct && selectedPrice && (
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">מוצר נבחר</span>
                  </div>
                  <span className="text-sm font-bold text-blue-900">{formatPrice(selectedPrice)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Mode */}
        {entryMode === 'manual' && (
          <Tabs value={billingMode} onValueChange={handleBillingModeChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 bg-slate-100 rounded-xl p-1">
              <TabsTrigger 
                value="one_time" 
                className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                disabled={isGeneratingLink}
              >
                תשלום חד פעמי
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                disabled={isGeneratingLink}
              >
                הוראת קבע
              </TabsTrigger>
            </TabsList>

            {/* One-time Payment Content */}
            <TabsContent value="one_time" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Currency Selector */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currency" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                    מטבע
                  </Label>
                  <Select
                    value={selectedCurrency}
                    onValueChange={handleCurrencyChange}
                    disabled={isGeneratingLink}
                  >
                    <SelectTrigger
                      id="currency"
                      className="h-11 text-sm border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg"
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                    סכום
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-900">
                      {getCurrencySymbol(selectedCurrency)}
                    </span>
                    <Input
                      id="amount"
                      type="text"
                      value={currentAmount}
                      onChange={handleAmountChange}
                      placeholder="הזן סכום מותאם"
                      className={cn(
                        "h-11 text-sm pr-10 border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg",
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
            <TabsContent value="subscription" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Currency Selector */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currency-sub" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                    מטבע
                  </Label>
                  <Select
                    value={selectedCurrency}
                    onValueChange={handleCurrencyChange}
                    disabled={isGeneratingLink}
                  >
                    <SelectTrigger
                      id="currency-sub"
                      className="h-11 text-sm border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg"
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount-sub" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                    סכום
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-900">
                      {getCurrencySymbol(selectedCurrency)}
                    </span>
                    <Input
                      id="amount-sub"
                      type="text"
                      value={currentAmount}
                      onChange={handleAmountChange}
                      placeholder="הזן סכום מותאם"
                      className={cn(
                        "h-11 text-sm pr-10 border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg",
                        error && "border-red-300 focus:border-red-500"
                      )}
                      disabled={isGeneratingLink}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Frequency and Cycles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="interval" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                    תדירות
                  </Label>
                  <Select
                    value={subscriptionInterval}
                    onValueChange={handleSubscriptionIntervalChange}
                    disabled={isGeneratingLink}
                  >
                    <SelectTrigger
                      id="interval"
                      className="h-11 text-sm border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg"
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="cycles" className="text-xs uppercase tracking-widest text-slate-500 font-medium">
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
                      className="h-11 text-sm border border-slate-200 focus:border-[#5B6FB9] text-slate-900 bg-slate-50 rounded-lg"
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
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        {/* Action Button - Matching WhatsApp Automation Format */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleCreateAndSend}
            disabled={isGeneratingLink || !currentAmount || parseFloat(currentAmount) <= 0 || !customerPhone}
            className={cn(
              "flex-1 justify-start min-h-9 h-auto",
              "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white",
              "text-xs font-semibold rounded-lg px-3 py-1.5",
              (!currentAmount || parseFloat(currentAmount) <= 0 || !customerPhone) && "opacity-50 cursor-not-allowed"
            )}
            style={{
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              lineHeight: '1.5'
            }}
          >
            {isGeneratingLink ? (
              <>
                <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin flex-shrink-0" />
                <span>יוצר ושולח...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 ml-1.5 flex-shrink-0" />
                <span className="text-right leading-tight">צור ושלח בקשת תשלום</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsTemplateEditorOpen(true)}
            disabled={isGeneratingLink}
            className="h-9 w-9 flex-shrink-0 border-gray-300 hover:bg-gray-200 hover:border-gray-400"
            title="ערוך תבנית"
          >
            <Settings className="h-3.5 w-3.5 text-gray-600" />
          </Button>
        </div>

        {/* Last Generated Link */}
        {lastGeneratedLink && !isGeneratingLink && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs text-green-700 font-medium mb-1.5">קישור תשלום שנוצר:</p>
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
