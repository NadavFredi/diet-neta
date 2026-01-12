/**
 * Payment Slice
 * 
 * Redux slice for managing Stripe payment state:
 * - Current amount and currency
 * - Payment type (one-time or subscription)
 * - Subscription settings (interval, billing cycles)
 * - Payment link generation status
 * - Payment message template
 * - Last generated payment link
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Currency = 'ILS' | 'USD' | 'EUR';
export type BillingMode = 'one_time' | 'subscription';
export type SubscriptionInterval = 'month' | 'week';

interface PaymentState {
  currentAmount: string;
  selectedCurrency: Currency;
  billingMode: BillingMode;
  subscriptionInterval: SubscriptionInterval;
  billingCycles: number | null; // null = continuous/unlimited
  isGeneratingLink: boolean;
  lastGeneratedLink: string | null;
  paymentMessageTemplate: string;
  error: string | null;
}

const DEFAULT_PAYMENT_TEMPLATE = `שלום {{name}},

אנא לחץ על הקישור הבא כדי להשלים את התשלום:

{{payment_link}}

תודה!`;

const initialState: PaymentState = {
  currentAmount: '',
  selectedCurrency: 'ILS',
  billingMode: 'one_time',
  subscriptionInterval: 'month',
  billingCycles: null, // null = continuous/unlimited
  isGeneratingLink: false,
  lastGeneratedLink: null,
  paymentMessageTemplate: DEFAULT_PAYMENT_TEMPLATE,
  error: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setAmount: (state, action: PayloadAction<string>) => {
      state.currentAmount = action.payload;
      state.error = null;
    },
    setCurrency: (state, action: PayloadAction<Currency>) => {
      state.selectedCurrency = action.payload;
      state.error = null;
    },
    setBillingMode: (state, action: PayloadAction<BillingMode>) => {
      state.billingMode = action.payload;
      state.error = null;
    },
    setSubscriptionInterval: (state, action: PayloadAction<SubscriptionInterval>) => {
      state.subscriptionInterval = action.payload;
      state.error = null;
    },
    setBillingCycles: (state, action: PayloadAction<number | null>) => {
      state.billingCycles = action.payload;
      state.error = null;
    },
    setGeneratingLink: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingLink = action.payload;
    },
    setLastGeneratedLink: (state, action: PayloadAction<string | null>) => {
      state.lastGeneratedLink = action.payload;
    },
    setPaymentMessageTemplate: (state, action: PayloadAction<string>) => {
      state.paymentMessageTemplate = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetPaymentState: (state) => {
      state.currentAmount = '';
      state.billingMode = 'one_time';
      state.subscriptionInterval = 'month';
      state.billingCycles = null;
      state.isGeneratingLink = false;
      state.lastGeneratedLink = null;
      state.error = null;
    },
  },
});

export const {
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
} = paymentSlice.actions;

export default paymentSlice.reducer;
