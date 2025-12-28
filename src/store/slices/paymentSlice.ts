/**
 * Payment Slice
 * 
 * Redux slice for managing Stripe payment state:
 * - Current amount and currency
 * - Payment link generation status
 * - Payment message template
 * - Last generated payment link
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Currency = 'ILS' | 'USD' | 'EUR';

interface PaymentState {
  currentAmount: string;
  selectedCurrency: Currency;
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
      state.isGeneratingLink = false;
      state.lastGeneratedLink = null;
      state.error = null;
    },
  },
});

export const {
  setAmount,
  setCurrency,
  setGeneratingLink,
  setLastGeneratedLink,
  setPaymentMessageTemplate,
  setError,
  resetPaymentState,
} = paymentSlice.actions;

export default paymentSlice.reducer;
